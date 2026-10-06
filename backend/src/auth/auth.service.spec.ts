import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import type { Profile } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DUMMY_RESEND_KEY,
  makeFakeJwt,
  makeFakePrisma,
  makeFakeResend,
  tokenFromEmail,
  type FakePrisma,
} from '../../test/fakes';

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: FakePrisma;
  let resend: ReturnType<typeof makeFakeResend>;

  // Builds the service through Nest's DI with every external dependency faked.
  async function setup(seedUsers: Record<string, any>[] = []) {
    process.env.RESEND_API_KEY = DUMMY_RESEND_KEY;
    process.env.FRONTEND_URL = 'https://findachavrusa.org';
    prisma = makeFakePrisma(seedUsers);
    resend = makeFakeResend();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: makeFakeJwt() },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    (service as any).resend = resend.client;
  }

  const registration = {
    email: '  Alice.Smith@Example.COM ',
    password: 'correct horse',
    name: 'Alice',
    location: 'JERUSALEM' as const,
    timezone: 'ISRAEL' as const,
  };

  beforeEach(() => setup());

  describe('register', () => {
    it('lowercases and trims the email', async () => {
      await service.register(registration);
      expect(prisma.users[0].email).toBe('alice.smith@example.com');
    });

    it('stores only a SHA-256 hash of the verification token, valid for 24 hours', async () => {
      await service.register(registration);
      const rawToken = tokenFromEmail(resend.sent[0], '/verify-email');
      const stored = prisma.users[0];
      expect(stored.verificationToken).toBe(sha256(rawToken));
      expect(stored.verificationToken).not.toBe(rawToken);
      const msLeft = stored.verificationTokenExpiry.getTime() - Date.now();
      expect(msLeft).toBeGreaterThan(DAY_MS - 60_000);
      expect(msLeft).toBeLessThanOrEqual(DAY_MS);
    });

    it('sends exactly one verification email, to the normalized address, with a full link', async () => {
      await service.register(registration);
      expect(resend.send).toHaveBeenCalledTimes(1);
      expect(resend.sent[0].to).toBe('alice.smith@example.com');
      expect(resend.sent[0].subject).toBe('Verify your Chavrusa email');
      expect(resend.sent[0].replyTo).toBe('admin@findachavrusa.org');
      expect(resend.sent[0].from).toBe('Chavrusa <noreply@findachavrusa.org>');
      expect(resend.sent[0].text).toMatch(/https:\/\/findachavrusa\.org\/verify-email\?token=[a-f0-9]{64}/);
    });

    it('stores a bcrypt hash of the password, never the password itself', async () => {
      await service.register(registration);
      const stored = prisma.users[0].password;
      expect(stored).not.toBe(registration.password);
      expect(await bcrypt.compare(registration.password, stored)).toBe(true);
    });

    it('returns no token or password fields', async () => {
      const result = await service.register(registration);
      for (const secret of ['password', 'verificationToken', 'verificationTokenExpiry', 'resetToken', 'resetTokenExpiry', 'googleId']) {
        expect(result).not.toHaveProperty(secret);
      }
      expect(JSON.stringify(result)).not.toContain(prisma.users[0].verificationToken);
      expect(JSON.stringify(result)).not.toContain(prisma.users[0].password);
      expect(result).toMatchObject({ email: 'alice.smith@example.com', name: 'Alice', emailVerified: false });
    });

    it('rejects an email that differs only in case from an existing account', async () => {
      await service.register(registration);
      await expect(service.register({ ...registration, email: 'ALICE.SMITH@example.com' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(resend.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyEmail', () => {
    async function registerAndGetToken() {
      await service.register(registration);
      return tokenFromEmail(resend.sent[0], '/verify-email');
    }

    it('verifies with a valid token and clears it', async () => {
      const token = await registerAndGetToken();
      await expect(service.verifyEmail(token)).resolves.toEqual({ message: 'Email verified successfully.' });
      expect(prisma.users[0]).toMatchObject({ emailVerified: true, verificationToken: null, verificationTokenExpiry: null });
    });

    it('fails when the token has expired', async () => {
      const token = await registerAndGetToken();
      prisma.users[0].verificationTokenExpiry = new Date(Date.now() - 1000);
      await expect(service.verifyEmail(token)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.users[0].emailVerified).toBe(false);
    });

    it('fails when the same token is used a second time', async () => {
      const token = await registerAndGetToken();
      await service.verifyEmail(token);
      await expect(service.verifyEmail(token)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('fails for an unknown token', async () => {
      await registerAndGetToken();
      await expect(service.verifyEmail('f'.repeat(64))).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('resendVerification', () => {
    it('refuses with 429 within 60 seconds of the last email, and sends nothing', async () => {
      const user = await service.register(registration);
      const error = await service.resendVerification(user.id).catch((e) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(resend.send).toHaveBeenCalledTimes(1);
    });

    it('sends a fresh link once the cooldown has passed, replacing the old token', async () => {
      const user = await service.register(registration);
      const oldHash = prisma.users[0].verificationToken;
      // Pretend the first email went out two minutes ago.
      prisma.users[0].verificationTokenExpiry = new Date(Date.now() + DAY_MS - 2 * 60_000);
      await expect(service.resendVerification(user.id)).resolves.toEqual({ message: 'Verification email sent.' });
      expect(resend.send).toHaveBeenCalledTimes(2);
      const newToken = tokenFromEmail(resend.sent[1], '/verify-email');
      expect(prisma.users[0].verificationToken).toBe(sha256(newToken));
      expect(prisma.users[0].verificationToken).not.toBe(oldHash);
    });

    it('sends nothing for an already verified user', async () => {
      const user = await service.register(registration);
      prisma.users[0].emailVerified = true;
      await expect(service.resendVerification(user.id)).resolves.toEqual({ message: 'Your email is already verified.' });
      expect(resend.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('forgotPassword', () => {
    const generic = { message: 'If an account exists for that email, a reset link has been sent.' };

    beforeEach(() =>
      setup([
        { email: 'real@example.com', name: 'Real', password: bcrypt.hashSync('old password', 4), emailVerified: true },
        { email: 'google@example.com', name: 'Googler', googleId: 'g-123', password: null, emailVerified: true },
      ]),
    );

    it('gives the same response for an unknown email, a Google-only account and a real account', async () => {
      const unknown = await service.forgotPassword('nobody@example.com');
      const googleOnly = await service.forgotPassword('google@example.com');
      const real = await service.forgotPassword('real@example.com');
      expect(unknown).toEqual(generic);
      expect(googleOnly).toEqual(generic);
      expect(real).toEqual(generic);
    });

    it('creates a hashed reset token and sends an email only for the real account', async () => {
      await service.forgotPassword('nobody@example.com');
      await service.forgotPassword('google@example.com');
      await service.forgotPassword('  REAL@example.com ');
      const [real, google] = prisma.users;
      expect(google.resetToken).toBeNull();
      expect(resend.send).toHaveBeenCalledTimes(1);
      expect(resend.sent[0].to).toBe('real@example.com');
      expect(resend.sent[0].replyTo).toBe('admin@findachavrusa.org');
      const rawToken = tokenFromEmail(resend.sent[0], '/reset-password');
      expect(real.resetToken).toBe(sha256(rawToken));
      expect(real.resetTokenExpiry.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('resetPassword', () => {
    async function requestReset() {
      await setup([{ email: 'pat@example.com', name: 'Pat', password: bcrypt.hashSync('old password', 4), emailVerified: false }]);
      await service.forgotPassword('pat@example.com');
      return tokenFromEmail(resend.sent[0], '/reset-password');
    }

    it('sets a bcrypt-hashed new password, marks the email verified and clears the token', async () => {
      const token = await requestReset();
      await expect(service.resetPassword(token, 'brand new pass')).resolves.toEqual({ message: 'Password reset successfully.' });
      const user = prisma.users[0];
      expect(user.password).not.toBe('brand new pass');
      expect(await bcrypt.compare('brand new pass', user.password)).toBe(true);
      expect(user).toMatchObject({ emailVerified: true, resetToken: null, resetTokenExpiry: null, verificationToken: null });
    });

    it('fails when the same token is used a second time', async () => {
      const token = await requestReset();
      await service.resetPassword(token, 'brand new pass');
      await expect(service.resetPassword(token, 'another pass')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(await bcrypt.compare('brand new pass', prisma.users[0].password)).toBe(true);
    });

    it('fails when the token has expired, leaving the old password in place', async () => {
      const token = await requestReset();
      prisma.users[0].resetTokenExpiry = new Date(Date.now() - 1000);
      await expect(service.resetPassword(token, 'brand new pass')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(await bcrypt.compare('old password', prisma.users[0].password)).toBe(true);
      expect(prisma.users[0].emailVerified).toBe(false);
    });
  });

  describe('loginWithGoogle', () => {
    const profile = (overrides: Partial<Profile> = {}): Profile =>
      ({ id: 'google-42', displayName: 'Dana G', emails: [{ value: 'Dana@Example.com' }], ...overrides }) as Profile;

    it('finds an account already linked by googleId', async () => {
      await setup([{ email: 'other-address@example.com', name: 'Dana', googleId: 'google-42', emailVerified: true }]);
      await expect(service.loginWithGoogle(profile())).resolves.toEqual({ access_token: `jwt-for-${prisma.users[0].id}` });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('links an unverified email account and clears its password and reset token', async () => {
      await setup([
        {
          email: 'dana@example.com',
          name: 'Dana',
          password: bcrypt.hashSync('set by someone else', 4),
          resetToken: 'abc',
          resetTokenExpiry: new Date(Date.now() + 60_000),
          emailVerified: false,
          verificationToken: 'def',
        },
      ]);
      await service.loginWithGoogle(profile());
      expect(prisma.users[0]).toMatchObject({
        googleId: 'google-42',
        emailVerified: true,
        password: null,
        resetToken: null,
        resetTokenExpiry: null,
        verificationToken: null,
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('links a verified email account and keeps its password', async () => {
      const hash = bcrypt.hashSync('my password', 4);
      await setup([{ email: 'dana@example.com', name: 'Dana', password: hash, emailVerified: true }]);
      await service.loginWithGoogle(profile());
      expect(prisma.users[0]).toMatchObject({ googleId: 'google-42', emailVerified: true, password: hash });
    });

    it('creates a new verified user with no password when nothing matches', async () => {
      const result = await service.loginWithGoogle(profile());
      expect(prisma.users).toHaveLength(1);
      expect(prisma.users[0]).toMatchObject({
        email: 'dana@example.com',
        name: 'Dana G',
        googleId: 'google-42',
        password: null,
        emailVerified: true,
      });
      expect(result).toEqual({ access_token: `jwt-for-${prisma.users[0].id}` });
      expect(resend.send).not.toHaveBeenCalled();
    });

    it('rejects a Google profile with no email', async () => {
      await expect(service.loginWithGoogle(profile({ emails: [] }))).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.users).toHaveLength(0);
    });
  });
});
