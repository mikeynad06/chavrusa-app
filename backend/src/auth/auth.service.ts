import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Location, Timezone } from '@prisma/client';
import type { Profile } from 'passport-google-oauth20';

@Injectable()
export class AuthService {
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

  private async issueToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}