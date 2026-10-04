import { Injectable, ConflictException, UnauthorizedException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Resend } from 'resend';
import { Location, Timezone } from '@prisma/client';
import type { Profile } from 'passport-google-oauth20';
import { FROM_ADDRESS, REPLY_TO_ADDRESS } from '../notifications/notifications.service';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Emailed tokens are stored only as SHA-256 hashes, so a leaked DB row can't be used to take over an account.
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

// Never return password or token fields to the client.
const PUBLIC_USER_FIELDS = {
  id: true,
  name: true,
  email: true,
  location: true,
  timezone: true,
  whatsappNumber: true,
  isSubscribed: true,
  emailVerified: true,
} as const;

@Injectable()
export class AuthService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(data: {
    email: string;
    password: string;
    name: string;
    location: Location;
    timezone: Timezone;
    whatsappNumber?: string;
    isSubscribed?: boolean;
  }) {
    const email = normalizeEmail(data.email);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new ConflictException('Email is already in use.');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const newUser = await this.prisma.user.create({
      data: {
        email,
        name: data.name,
        password: hashedPassword,
        location: data.location,
        timezone: data.timezone,
        whatsappNumber: data.whatsappNumber,
        isSubscribed: data.isSubscribed,
        verificationToken: hashToken(verificationToken),
        verificationTokenExpiry: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      },
      select: PUBLIC_USER_FIELDS,
    });

    await this.sendVerificationEmail(newUser.email, newUser.name, verificationToken);

    return newUser;
  }

  async login(email: string, passwordRaw: string) {
    // 1. Find user (the login body isn't validated by a DTO, so guard the types here)
    if (typeof email !== 'string' || typeof passwordRaw !== 'string') throw new UnauthorizedException('Invalid credentials');
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // 2. Compare passwords (Google-only accounts have no password to compare against)
    if (!user.password) throw new UnauthorizedException('Invalid credentials');
    const isPasswordValid = await bcrypt.compare(passwordRaw, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    // 3. Generate Token
    return this.issueToken(user.id, user.email);
  }

  async loginWithGoogle(profile: Profile) {
    const googleId = profile.id;
    const rawEmail = profile.emails?.[0]?.value;
    if (!rawEmail) throw new UnauthorizedException('Google account has no email');
    const email = normalizeEmail(rawEmail);

    // 1. Already linked to this Google account
    let user = await this.prisma.user.findUnique({ where: { googleId } });

    // 2. Not linked yet, but an account with this email already exists -- link it.
    // Google has proven ownership of the email, so mark it verified. If it was never verified,
    // whoever set its password may not own the inbox, so drop that password.
    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId,
            emailVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
            ...(existingByEmail.emailVerified ? {} : { password: null, resetToken: null, resetTokenExpiry: null }),
          },
        });
      }
    }

    // 3. No existing account at all -- create one with placeholder location/timezone
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: profile.displayName || email,
          googleId,
          password: null,
          emailVerified: true,
          location: 'OTHER',
          timezone: 'GMT',
        },
      });
    }

    return this.issueToken(user.id, user.email);
  }

  async forgotPassword(email: string) {
    const genericResponse = { message: 'If an account exists for that email, a reset link has been sent.' };

    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    // No account, or a Google-only account with no password to reset -- stay silent either way.
    if (!user || !user.password) return genericResponse;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashToken(resetToken), resetTokenExpiry },
    });

    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0].trim() || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const { error } = await this.resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO_ADDRESS,
      to: user.email,
      subject: 'Reset your Chavrusa password',
      text: `Hi ${user.name}, click the link below to reset your password. This link expires in 30 minutes.\n\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`,
    });

    if (error) {
      console.error(`[AuthService] Failed to send password reset email to ${user.email}:`, error);
    }

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { resetToken: hashToken(token) } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        // Using the emailed reset link proves inbox ownership.
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return { message: 'Password reset successfully.' };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({ where: { verificationToken: hashToken(token) } });
    if (!user || !user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return { message: 'Email verified successfully.' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerified) return { message: 'Your email is already verified.' };

    // The expiry is always issue time + TTL, so it tells us when the last link was sent.
    if (user.verificationTokenExpiry) {
      const lastSentAt = user.verificationTokenExpiry.getTime() - VERIFICATION_TOKEN_TTL_MS;
      if (Date.now() - lastSentAt < VERIFICATION_RESEND_COOLDOWN_MS) {
        throw new HttpException('Please wait a minute before requesting another email.', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: hashToken(verificationToken),
        verificationTokenExpiry: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      },
    });

    await this.sendVerificationEmail(user.email, user.name, verificationToken);

    return { message: 'Verification email sent.' };
  }

  async getVerificationStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async sendVerificationEmail(email: string, name: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0].trim() || 'http://localhost:5173';
    const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO_ADDRESS,
      to: email,
      subject: 'Verify your Chavrusa email',
      text: `Hi ${name}, welcome to Chavrusa! Click the link below to verify your email address. This link expires in 24 hours.\n\n${verifyLink}\n\nIf you didn't create this account, you can safely ignore this email.`,
    });

    if (error) {
      console.error(`[AuthService] Failed to send verification email to ${email}:`, error);
    }
  }

  private async issueToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}