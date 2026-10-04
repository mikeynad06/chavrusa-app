import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Like AuthGuard('google'), but a failed sign-in (the user cancels on Google's consent screen,
// or the code exchange fails) leaves req.user empty instead of throwing a 401, so the
// controller can send the browser back to the frontend's error page.
@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  handleRequest<TUser>(err: unknown, user: TUser | false, info: unknown): TUser | null {
    if (err || !user) {
      console.warn('[GoogleCallbackGuard] Google sign-in failed:', err ?? info);
      return null;
    }
    return user;
  }
}
