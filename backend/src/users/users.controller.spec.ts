import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AccountDeletionService } from './account-deletion.service';

// A real HTTP app around UsersController with every service faked (no database, no email), to check the
// rate limits and validation on the account deletion routes.
describe('UsersController account deletion routes', () => {
  let app: INestApplication;
  const deletion = {
    requestDeletion: jest.fn(async () => ({ deleted: true })),
    confirmDeletion: jest.fn(async () => ({ deleted: true })),
  };

  beforeEach(async () => {
    deletion.requestDeletion.mockClear();
    deletion.confirmDeletion.mockClear();
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] })],
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: {} },
        { provide: AccountDeletionService, useValue: deletion },
      ],
    })
      // Stand-in for the JWT check: every request is the logged-in user "u1".
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: (ctx: any) => ((ctx.switchToHttp().getRequest().user = { userId: 'u1' }), true) })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(() => app.close());

  it('DELETE /users/me allows 5 attempts per 15 minutes, then answers 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app.getHttpServer()).delete('/users/me').send({ confirm: 'DELETE', password: 'x' });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(deletion.requestDeletion).toHaveBeenCalledTimes(5);
    expect(deletion.requestDeletion).toHaveBeenCalledWith('u1', 'DELETE', 'x');
  });

  it('POST /users/me/confirm-deletion passes the logged-in user and token, and is limited too', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app.getHttpServer()).post('/users/me/confirm-deletion').send({ token: 'abc' });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(deletion.confirmDeletion).toHaveBeenCalledWith('u1', 'abc');
  });

  it('validates the body before anything runs', async () => {
    const res = await request(app.getHttpServer()).delete('/users/me').send({ password: 'x' });
    expect(res.status).toBe(400);
    const res2 = await request(app.getHttpServer()).post('/users/me/confirm-deletion').send({});
    expect(res2.status).toBe(400);
    expect(deletion.requestDeletion).not.toHaveBeenCalled();
    expect(deletion.confirmDeletion).not.toHaveBeenCalled();
  });
});
