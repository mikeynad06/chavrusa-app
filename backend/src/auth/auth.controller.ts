import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { Profile } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-users.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GetUser } from './get-user.decorator';
import { GoogleCallbackGuard } from './google-callback.guard';
import { frontendBaseUrl } from '../notifications/email-content';
import { AUTH_RATE_LIMITS } from './rate-limits';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMITS.register)
  @Post('register')
  register(@Body() body: CreateUserDto) {
    return this.authService.register(body);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMITS.login)
  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMITS.forgotPassword)
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMITS.standard)
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMITS.standard)
  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body.token);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, AuthGuard('jwt'))
  @Throttle(AUTH_RATE_LIMITS.standard)
  @Post('resend-verification')
  resendVerification(@GetUser() user: { userId: string }) {
    return this.authService.resendVerification(user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('verification-status')
  verificationStatus(@GetUser() user: { userId: string }) {
    return this.authService.getVerificationStatus(user.userId);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport intercepts this and redirects to Google's consent screen.
  }

  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = frontendBaseUrl();
    // Any failure goes back to /auth/callback without a token, which shows the "didn't go through" page.
    const failureRedirect = `${frontendUrl}/auth/callback?error=google`;

    const profile = req.user as Profile | null | undefined;
    if (!profile) return res.redirect(failureRedirect);

    try {
      const { access_token } = await this.authService.loginWithGoogle(profile);
      res.redirect(`${frontendUrl}/auth/callback?token=${access_token}`);
    } catch (err) {
      console.error('[AuthController] Google login failed:', err);
      res.redirect(failureRedirect);
    }
  }
}