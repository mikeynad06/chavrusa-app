import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Resend } from 'resend';
import { Location, Timezone } from '@prisma/client';
import type { Profile } from 'passport-google-oauth20';
import { FROM_ADDRESS } from '../notifications/notifications.service';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

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
    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new ConflictException('Email is already in use.');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const newUser = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        location: data.location,
        timezone: data.timezone,
        whatsappNumber: data.whatsappNumber,
        isSubscribed: data.isSubscribed,
      },
    });

    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async login(email: string, passwordRaw: string) {
    // 1. Find user
    const user = await this.prisma.user.findUnique({ where: { email } });
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
    const email = profile.emails?.[0]?.value;
    if (!email) throw new UnauthorizedException('Google account has no email');

    // 1. Already linked to this Google account
    let user = await this.prisma.user.findUnique({ where: { googleId } });

    // 2. Not linked yet, but an account with this email already exists -- link it
    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId },
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
          location: 'OTHER',
          timezone: 'GMT',
        },
      });
    }

    return this.issueToken(user.id, user.email);
  }

  async forgotPassword(email: string) {
    const genericResponse = { message: 'If an account exists for that email, a reset link has been sent.' };

    const user = await this.prisma.user.findUnique({ where: { email } });
    // No account, or a Google-only account with no password to reset -- stay silent either way.
    if (!user || !user.password) return genericResponse;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0].trim() || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const { error } = await this.resend.emails.send({
      from: FROM_ADDRESS,
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
    const user = await this.prisma.user.findUnique({ where: { resetToken: token } });
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
      },
    });

    return { message: 'Password reset successfully.' };
  }

  private async issueToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}