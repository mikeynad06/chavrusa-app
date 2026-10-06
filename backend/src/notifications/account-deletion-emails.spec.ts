import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { DUMMY_RESEND_KEY, makeFakePrisma, makeFakeResend } from '../../test/fakes';

describe('NotificationsService account deletion emails', () => {
  let resend: ReturnType<typeof makeFakeResend>;
  let service: NotificationsService;
  let prisma: ReturnType<typeof makeFakePrisma>;

  function setup(options: { failFor?: string[] } = {}) {
    process.env.RESEND_API_KEY = DUMMY_RESEND_KEY;
    process.env.FRONTEND_URL = 'https://www.findachavrusa.org';
    prisma = makeFakePrisma([
      { name: 'Bina', email: 'bina@x.test', emailVerified: true, isSubscribed: true },
      { name: 'Dovid', email: 'dovid@x.test', emailVerified: true, isSubscribed: true },
      { name: 'Eli', email: 'eli@x.test', emailVerified: false, isSubscribed: true },
      { name: 'Frida', email: 'frida@x.test', emailVerified: true, isSubscribed: false },
    ]);
    prisma.users.forEach((u) => (u.id = u.email.split('@')[0]));
    resend = makeFakeResend(options);
    service = new NotificationsService(prisma as unknown as PrismaService);
    (service as any).resend = resend.client;
  }

  beforeEach(() => setup());

  it('sends the Google-only confirmation link to the account owner', async () => {
    await service.handleAccountDeletionRequested({ name: 'Gila', email: 'gila@x.test', token: 'a1b2c3' });
    expect(resend.sent).toHaveLength(1);
    expect(resend.sent[0]).toMatchObject({
      to: 'gila@x.test',
      subject: 'Confirm deleting your Chavrusa account',
      replyTo: 'admin@findachavrusa.org',
    });
    expect(resend.sent[0].text).toContain('Confirm account deletion:\nhttps://www.findachavrusa.org/delete-account?token=a1b2c3');
    expect(resend.sent[0].text).toContain('expires in 30 minutes');
  });

  it('confirms the deletion to the person who left, even with no partners', async () => {
    await service.handleAccountDeleted({ name: 'Avi', email: 'avi@x.test', partners: [] });
    expect(resend.sent.map((m) => m.to)).toEqual(['avi@x.test']);
    expect(resend.sent[0].subject).toBe('Your Chavrusa account has been deleted');
  });

  it('emails each verified, subscribed partner once, without naming the deleted person', async () => {
    await service.handleAccountDeleted({
      name: 'Avi',
      email: 'avi@x.test',
      partners: [
        { userId: 'bina', kind: 'claimed', requestTitle: 'Bava Metzia', requestTopic: 'GEMARA' },
        { userId: 'bina', kind: 'claimed', requestTitle: null, requestTopic: 'MUSSAR' },
        { userId: 'dovid', kind: 'requested', requestTitle: 'Berachos', requestTopic: 'GEMARA' },
        { userId: 'eli', kind: 'claimed', requestTitle: 'Tehillim', requestTopic: 'TANACH' }, // unverified
        { userId: 'frida', kind: 'claimed', requestTitle: 'Mishnah', requestTopic: 'MISHNAH' }, // unsubscribed
      ],
    });
    expect(resend.sent.map((m) => m.to)).toEqual(['avi@x.test', 'bina@x.test', 'dovid@x.test']);

    const bina = resend.sent[1];
    expect(bina.subject).toBe('Your chavrusa has left Chavrusa');
    expect(bina.text).toContain('your chavrusa for "Bava Metzia", "Mussar" has deleted their Chavrusa account');
    expect(bina.text).toContain('Your request "Bava Metzia", "Mussar" is open again');
    expect(bina.text).not.toContain('Your match for');

    const dovid = resend.sent[2];
    expect(dovid.text).toContain('Your match for "Berachos" has been removed.');
    expect(dovid.text).not.toContain('open again');
    expect(dovid.text).toContain('https://www.findachavrusa.org/dashboard');

    for (const mail of resend.sent.slice(1)) expect(mail.text).not.toContain('Avi');
  });

  it('keeps going when one email fails', async () => {
    setup({ failFor: ['avi@x.test'] });
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await service.handleAccountDeleted({
      name: 'Avi',
      email: 'avi@x.test',
      partners: [{ userId: 'bina', kind: 'claimed', requestTitle: 'Bava Metzia', requestTopic: 'GEMARA' }],
    });
    expect(resend.sent.map((m) => m.to)).toEqual(['bina@x.test']);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('avi@x.test'), expect.any(Error));
    error.mockRestore();
  });

  it('never throws, even if looking up partners fails', async () => {
    prisma.user.findMany.mockRejectedValueOnce(new Error('database down'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      service.handleAccountDeleted({
        name: 'Avi',
        email: 'avi@x.test',
        partners: [{ userId: 'bina', kind: 'claimed', requestTitle: 'Bava Metzia', requestTopic: 'GEMARA' }],
      }),
    ).resolves.toBeUndefined();
    expect(resend.sent.map((m) => m.to)).toEqual(['avi@x.test']);
    error.mockRestore();
  });
});
