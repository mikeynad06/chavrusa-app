import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import type { Profile } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-users.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GetUser } from './get-user.decorator';
import { GoogleCallbackGuard } from './google-callback.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: CreateUserDto) {
    return this.authService.register(body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body.token);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
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
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0].trim() || 'http://localhost:5173';
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