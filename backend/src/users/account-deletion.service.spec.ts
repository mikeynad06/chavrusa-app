import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AccountDeletionService, type AccountDeletedEvent, type AccountDeletionRequestedEvent } from './account-deletion.service';
import { PrismaService } from '../prisma/prisma.service';

const PASSWORD = 'correct horse';
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

// An in-memory database that behaves like the live one (see the foreign keys in WORK_REPORT.md, Task B):
// deleting a user cascades to their requests, matches and messages, but is REFUSED while UserLocation rows
// still point at them (ON DELETE RESTRICT).
function makeDb() {
  const db = {
    users: [
      { id: 'avi', name: 'Avi', email: 'avi@x.test', password: bcrypt.hashSync(PASSWORD, 4), resetToken: null as string | null, resetTokenExpiry: null as Date | null },
      { id: 'gila', name: 'Gila', email: 'gila@x.test', password: null as string | null, resetToken: null as string | null, resetTokenExpiry: null as Date | null },
      { id: 'bina', name: 'Bina', email: 'bina@x.test', password: 'x', resetToken: null as string | null, resetTokenExpiry: null as Date | null },
      { id: 'dovid', name: 'Dovid', email: 'dovid@x.test', password: 'x', resetToken: null as string | null, resetTokenExpiry: null as Date | null },
    ],
    requests: [
      { id: 'req-bina', requesterId: 'bina', status: 'MATCHED', seferOrTopic: 'Bava Metzia', topic: 'GEMARA' }, // Avi claimed it
      { id: 'req-avi', requesterId: 'avi', status: 'MATCHED', seferOrTopic: null, topic: 'MUSSAR' }, // Dovid claimed it
      { id: 'req-avi-open', requesterId: 'avi', status: 'OPEN', seferOrTopic: 'Berachos', topic: 'GEMARA' },
    ],
    matches: [
      { id: 'm1', requestId: 'req-bina', matchedUserId: 'avi' },
      { id: 'm2', requestId: 'req-avi', matchedUserId: 'dovid' },
    ],
    messages: [
      { id: 'msg1', matchId: 'm1', senderId: 'bina' },
      { id: 'msg2', matchId: 'm1', senderId: 'avi' },
      { id: 'msg3', matchId: 'm2', senderId: 'dovid' },
    ],
    locations: [
      { id: 'loc1', userId: 'avi', location: 'JERUSALEM' },
      { id: 'loc2', userId: 'bina', location: 'LONDON' },
    ],
  };
  const pick = (row: any, select?: Record<string, boolean>) =>
    select ? Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]])) : { ...row };
  const requestOf = (m: { requestId: string }) => db.requests.find((r) => r.id === m.requestId)!;

  const prisma: any = {
    db,
    user: {
      findUnique: jest.fn(async ({ where, select }: any) => {
        const [field, value] = Object.entries(where)[0];
        const row = db.users.find((u: any) => u[field] === value);
        return row ? pick(row, select) : null;
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(db.users.find((u) => u.id === where.id)!, data)),
      delete: jest.fn(async ({ where }: any) => {
        if (db.locations.some((l) => l.userId === where.id)) {
          throw new Error('Foreign key violation: UserLocation_userId_fkey (ON DELETE RESTRICT)');
        }
        // ON DELETE CASCADE: their requests -> matches on them -> messages; matches they claimed -> messages.
        const goneRequests = db.requests.filter((r) => r.requesterId === where.id).map((r) => r.id);
        const goneMatches = db.matches.filter((m) => m.matchedUserId === where.id || goneRequests.includes(m.requestId)).map((m) => m.id);
        db.messages = db.messages.filter((x) => !goneMatches.includes(x.matchId) && x.senderId !== where.id);
        db.matches = db.matches.filter((m) => !goneMatches.includes(m.id));
        db.requests = db.requests.filter((r) => !goneRequests.includes(r.id));
        db.users = db.users.filter((u) => u.id !== where.id);
      }),
    },
    match: {
      findMany: jest.fn(async ({ where }: any) => {
        const rows = where.matchedUserId
          ? db.matches.filter((m) => m.matchedUserId === where.matchedUserId)
          : db.matches.filter((m) => requestOf(m).requesterId === where.request.requesterId);
        return rows.map((m) => ({ matchedUserId: m.matchedUserId, request: { ...requestOf(m) } }));
      }),
    },
    request: {
      updateMany: jest.fn(async ({ where, data }: any) => {
        const rows = db.requests.filter((r) => where.id.in.includes(r.id) && r.status === where.status);
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      }),
    },
    userLocation: {
      deleteMany: jest.fn(async ({ where }: any) => {
        const before = db.locations.length;
        db.locations = db.locations.filter((l) => l.userId !== where.userId);
        return { count: before - db.locations.length };
      }),
    },
  };
  // All-or-nothing, like a real transaction: on error, restore the snapshot.
  prisma.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => {
    const snapshot = JSON.parse(JSON.stringify(db), (k, v) => (k === 'resetTokenExpiry' && v ? new Date(v) : v));
    try {
      return await fn(prisma);
    } catch (err) {
      Object.assign(db, snapshot);
      throw err;
    }
  });
  return prisma;
}

describe('AccountDeletionService', () => {
  let prisma: ReturnType<typeof makeDb>;
  let events: { emit: jest.Mock };
  let service: AccountDeletionService;

  beforeEach(() => {
    prisma = makeDb();
    events = { emit: jest.fn() };
    service = new AccountDeletionService(prisma as unknown as PrismaService, events as any);
  });

  const emitted = (name: string) => events.emit.mock.calls.filter(([n]) => n === name).map(([, p]) => p);

  describe('password accounts', () => {
    it('deletes the account, reopens requests it had claimed, and removes its subscriptions', async () => {
      await expect(service.requestDeletion('avi', 'DELETE', PASSWORD)).resolves.toEqual({ deleted: true });
      const { db } = prisma;
      expect(db.users.map((u: any) => u.id)).toEqual(['gila', 'bina', 'dovid']);
      // Bina's request, which Avi had claimed, is open again and its match and messages are gone.
      expect(db.requests.find((r: any) => r.id === 'req-bina').status).toBe('OPEN');
      expect(db.matches.map((m: any) => m.id)).toEqual([]);
      expect(db.messages).toEqual([]);
      // Avi's own requests are gone; Avi's location rows are gone; Bina's are untouched.
      expect(db.requests.map((r: any) => r.id)).toEqual(['req-bina']);
      expect(db.locations).toEqual([{ id: 'loc2', userId: 'bina', location: 'LONDON' }]);
    });

    it('runs the steps in order inside one transaction', async () => {
      await service.requestDeletion('avi', 'DELETE', PASSWORD);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const order = [prisma.request.updateMany, prisma.userLocation.deleteMany, prisma.user.delete].map(
        (fn: jest.Mock) => fn.mock.invocationCallOrder[0],
      );
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    });

    it('tells the right people afterwards: claimed-request owners and people who claimed their requests', async () => {
      await service.requestDeletion('avi', 'DELETE', PASSWORD);
      const [payload] = emitted('account.deleted') as AccountDeletedEvent[];
      expect(payload).toEqual({
        name: 'Avi',
        email: 'avi@x.test',
        partners: [
          { userId: 'bina', kind: 'claimed', requestTitle: 'Bava Metzia', requestTopic: 'GEMARA' },
          { userId: 'dovid', kind: 'requested', requestTitle: null, requestTopic: 'MUSSAR' },
        ],
      });
    });

    it('rejects a wrong or missing password with 401 and deletes nothing', async () => {
      await expect(service.requestDeletion('avi', 'DELETE', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(service.requestDeletion('avi', 'DELETE', undefined)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.db.users).toHaveLength(4);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('requires the confirmation text to be exactly DELETE', async () => {
      for (const confirm of [undefined, '', 'delete', 'DELETE ', 'yes']) {
        await expect(service.requestDeletion('avi', confirm, PASSWORD)).rejects.toBeInstanceOf(BadRequestException);
      }
      expect(prisma.db.users).toHaveLength(4);
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('would be blocked by the database without the explicit UserLocation cleanup', async () => {
      prisma.userLocation.deleteMany.mockImplementationOnce(async () => ({ count: 0 })); // skip the cleanup
      await expect(service.requestDeletion('avi', 'DELETE', PASSWORD)).rejects.toThrow('ON DELETE RESTRICT');
      // Rolled back: nothing changed and nobody was told.
      expect(prisma.db.users).toHaveLength(4);
      expect(prisma.db.requests.find((r: any) => r.id === 'req-bina').status).toBe('MATCHED');
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('still reports success when sending the notifications fails', async () => {
      events.emit.mockImplementation(() => {
        throw new Error('email system down');
      });
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.requestDeletion('avi', 'DELETE', PASSWORD)).resolves.toEqual({ deleted: true });
      expect(prisma.db.users.find((u: any) => u.id === 'avi')).toBeUndefined();
      error.mockRestore();
    });
  });

  describe('Google-only accounts', () => {
    async function requestLink() {
      await expect(service.requestDeletion('gila', 'DELETE', undefined)).resolves.toEqual({ emailSent: true, email: 'gila@x.test' });
      const [payload] = emitted('account.deletion-requested') as AccountDeletionRequestedEvent[];
      return payload.token;
    }

    it('emails a link and deletes nothing yet; only a hash of the token is stored', async () => {
      const token = await requestLink();
      const gila = prisma.db.users.find((u: any) => u.id === 'gila');
      expect(prisma.db.users).toHaveLength(4);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
      expect(gila.resetToken).toBe(`delete:${sha256(token)}`);
      expect(gila.resetToken).not.toContain(token);
      const minutesLeft = (gila.resetTokenExpiry.getTime() - Date.now()) / 60_000;
      expect(minutesLeft).toBeGreaterThan(29);
      expect(minutesLeft).toBeLessThanOrEqual(30);
    });

    it('deletes the account when the logged-in owner confirms the link', async () => {
      const token = await requestLink();
      await expect(service.confirmDeletion('gila', token)).resolves.toEqual({ deleted: true });
      expect(prisma.db.users.map((u: any) => u.id)).not.toContain('gila');
      expect(emitted('account.deleted')).toEqual([{ name: 'Gila', email: 'gila@x.test', partners: [] }]);
    });

    it('is single use', async () => {
      const token = await requestLink();
      await service.confirmDeletion('gila', token);
      await expect(service.confirmDeletion('gila', token)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expired link and deletes nothing', async () => {
      const token = await requestLink();
      prisma.db.users.find((u: any) => u.id === 'gila').resetTokenExpiry = new Date(Date.now() - 1000);
      await expect(service.confirmDeletion('gila', token)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.db.users).toHaveLength(4);
    });

    it("rejects someone else's login, an older link, and garbage", async () => {
      const first = await requestLink();
      const second = await requestLink(); // a new request replaces the earlier link
      await expect(service.confirmDeletion('bina', second)).rejects.toBeInstanceOf(BadRequestException);
      for (const token of [first, 'not-a-token', '', undefined, `delete:${sha256(second)}`]) {
        await expect(service.confirmDeletion('gila', token)).rejects.toBeInstanceOf(BadRequestException);
      }
      expect(prisma.db.users).toHaveLength(4);
    });

    it('cannot be used as a password reset token', async () => {
      const token = await requestLink();
      // /auth/reset-password looks up the bare hash; the stored value carries a "delete:" prefix.
      const resetLookup = await prisma.user.findUnique({ where: { resetToken: sha256(token) } });
      expect(resetLookup).toBeNull();
    });
  });
});
