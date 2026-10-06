import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  // This runs automatically if the token is valid.
  // We attach this returned object to the incoming request.
  async validate(payload: any) {
    // Tokens last a day; once an account is deleted its token must stop working straight away.
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } });
    if (!user) throw new UnauthorizedException();
    return { userId: payload.sub, email: payload.email };
  }
}
