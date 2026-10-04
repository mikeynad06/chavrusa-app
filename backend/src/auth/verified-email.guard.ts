import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Use after AuthGuard('jwt'): blocks actions that involve other users until the email is verified.
// Reads the DB rather than the JWT so it takes effect as soon as the user verifies.
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();
    const record = await this.prisma.user.findUnique({
      where: { id: user?.userId },
      select: { emailVerified: true },
    });
    if (!record?.emailVerified) {
      throw new ForbiddenException('Please verify your email address before doing this.');
    }
    return true;
  }
}
