import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

describe('JwtStrategy.validate', () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-login-secret';

  const strategyWith = (user: { id: string } | null) =>
    new JwtStrategy({ user: { findUnique: jest.fn(async () => user) } } as unknown as PrismaService);

  it('accepts a token whose user still exists', async () => {
    await expect(strategyWith({ id: 'u1' }).validate({ sub: 'u1', email: 'a@x.test' })).resolves.toEqual({
      userId: 'u1',
      email: 'a@x.test',
    });
  });

  it('rejects a token whose account has been deleted', async () => {
    await expect(strategyWith(null).validate({ sub: 'gone', email: 'a@x.test' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
