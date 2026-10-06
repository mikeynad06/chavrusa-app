import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService.getDashboard', () => {
  const serviceReturning = (row: Record<string, unknown> | null) =>
    new UsersService({ user: { findUnique: jest.fn(async () => row) } } as unknown as PrismaService);

  it('reports whether a password exists without ever returning the hash', async () => {
    const result = await serviceReturning({ id: 'u1', name: 'Avi', password: '$2a$10$hashhashhash' }).getDashboard('u1');
    expect(result).toEqual({ id: 'u1', name: 'Avi', hasPassword: true });
    expect(JSON.stringify(result)).not.toContain('$2a$');
  });

  it('reports hasPassword false for Google-only accounts', async () => {
    const result = await serviceReturning({ id: 'g1', name: 'Gila', password: null }).getDashboard('g1');
    expect(result).toEqual({ id: 'g1', name: 'Gila', hasPassword: false });
  });

  it('returns null for an unknown user', async () => {
    await expect(serviceReturning(null).getDashboard('ghost')).resolves.toBeNull();
  });
});
