// In-memory stand-ins for the services the backend talks to, so unit tests never touch the real
// database (backend/.env points at production) and never send real email.

type Row = Record<string, any>;

const USER_DEFAULTS: Row = {
  password: null,
  googleId: null,
  resetToken: null,
  resetTokenExpiry: null,
  emailVerified: false,
  verificationToken: null,
  verificationTokenExpiry: null,
  whatsappNumber: null,
  location: 'OTHER',
  timezone: 'GMT',
  isSubscribed: true,
};

// Same columns as the @unique / @id fields on the User model.
const UNIQUE_USER_FIELDS = ['id', 'email', 'googleId', 'resetToken', 'verificationToken'];

function pick(row: Row, select?: Record<string, boolean>): Row {
  if (!select) return { ...row };
  return Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]]));
}

function assertUnique(rows: Row[], candidate: Row, ignoreId?: string) {
  for (const field of UNIQUE_USER_FIELDS) {
    const value = candidate[field];
    if (value == null) continue;
    if (rows.some((r) => r.id !== ignoreId && r[field] === value)) {
      throw new Error(`Unique constraint failed on User.${field}`);
    }
  }
}

export interface FakePrisma {
  users: Row[];
  topicSubs: { userId: string; topic: string }[];
  locationSubs: { userId: string; location: string }[];
  user: Record<'findUnique' | 'create' | 'update' | 'findMany', jest.Mock>;
  userTopic: { findMany: jest.Mock };
  userLocation: { findMany: jest.Mock };
}

// A fake PrismaService covering the calls AuthService and NotificationsService make.
export function makeFakePrisma(seed: Row[] = []): FakePrisma {
  let nextId = 1;
  const users: Row[] = seed.map((u) => ({ ...USER_DEFAULTS, id: `seed-${nextId++}`, ...u }));
  const fake: FakePrisma = {
    users,
    topicSubs: [],
    locationSubs: [],
    user: {
      findUnique: jest.fn(async ({ where, select }: { where: Row; select?: Record<string, boolean> }) => {
        const [field, value] = Object.entries(where)[0];
        if (value == null) return null;
        const row = users.find((u) => u[field] === value);
        return row ? pick(row, select) : null;
      }),
      create: jest.fn(async ({ data, select }: { data: Row; select?: Record<string, boolean> }) => {
        const row = { ...USER_DEFAULTS, id: `user-${nextId++}`, ...data };
        assertUnique(users, row);
        users.push(row);
        return pick(row, select);
      }),
      update: jest.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const row = users.find((u) => u.id === where.id);
        if (!row) throw new Error(`No user with id ${where.id}`);
        assertUnique(users, { ...row, ...data }, row.id);
        Object.assign(row, data);
        return { ...row };
      }),
      // Supports the filter NotificationsService uses: { id: { in }, emailVerified, isSubscribed }.
      findMany: jest.fn(async ({ where }: { where: Row }) =>
        users
          .filter((u) => !where.id?.in || where.id.in.includes(u.id))
          .filter((u) => where.emailVerified === undefined || u.emailVerified === where.emailVerified)
          .filter((u) => where.isSubscribed === undefined || u.isSubscribed === where.isSubscribed)
          .map((u) => ({ ...u })),
      ),
    },
    userTopic: {
      findMany: jest.fn(async ({ where }: { where: Row }) => fake.topicSubs.filter((s) => s.topic === where.topic)),
    },
    userLocation: {
      findMany: jest.fn(async ({ where }: { where: Row }) =>
        fake.locationSubs.filter((s) => s.location === where.location),
      ),
    },
  };
  return fake;
}

export interface SentEmail {
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// A fake Resend client: records every email instead of sending it. failFor makes sends to that
// address throw, to simulate a network error.
export function makeFakeResend(options: { failFor?: string[] } = {}) {
  const sent: SentEmail[] = [];
  const send = jest.fn(async (msg: SentEmail) => {
    if (options.failFor?.includes(msg.to)) throw new Error(`simulated send failure to ${msg.to}`);
    sent.push(msg);
    return { data: { id: `email-${sent.length}` }, error: null };
  });
  return { client: { emails: { send } }, sent, send };
}

export function makeFakeJwt() {
  return { signAsync: jest.fn(async (payload: { sub: string }) => `jwt-for-${payload.sub}`) };
}

// Pulls the raw token out of a verification or reset link in an email body.
export function tokenFromEmail(email: SentEmail, path: '/verify-email' | '/reset-password'): string {
  const match = email.text.match(new RegExp(`${path}\\?token=([a-f0-9]+)`));
  if (!match) throw new Error(`No ${path} link in email: ${email.text}`);
  return match[1];
}

// Construction of AuthService/NotificationsService creates a Resend client, which needs some key.
// This one is never used: the tests swap the client for a fake before anything is sent.
export const DUMMY_RESEND_KEY = 're_test_dummy_never_used';
