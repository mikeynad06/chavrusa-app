import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'my-super-secret-jwt-key', // Must match the secret in auth.module.ts
    });
  }

  // This runs automatically if the token is valid.
  // We attach this returned object to the incoming request.
  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}