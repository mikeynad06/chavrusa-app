import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { DUMMY_RESEND_KEY, makeFakePrisma, makeFakeResend, type FakePrisma } from '../../test/fakes';

type Payload = Parameters<NotificationsService['handleRequestCreatedEvent']>[0];

// Who's subscribed to what. The requester is subscribed too, to prove they're never alerted.
const PEOPLE = [
  { id: 'alice', email: 'alice@x.test', topics: ['GEMARA'], locations: ['JERUSALEM'] }, // topic + matching location
  { id: 'bob', email: 'bob@x.test', topics: ['GEMARA'], locations: [] }, // topic only
  { id: 'carol', email: 'carol@x.test', topics: ['GEMARA'], locations: ['LONDON'] }, // topic + other location
  { id: 'frank', email: 'frank@x.test', topics: ['HALACHA'], locations: ['JERUSALEM'] }, // other topic
  { id: 'rachel', email: 'rachel@x.test', topics: ['GEMARA'], locations: ['JERUSALEM'] }, // the requester
  { id: 'dan', email: 'dan@x.test', topics: ['GEMARA'], locations: ['JERUSALEM'], emailVerified: false },
  { id: 'erin', email: 'erin@x.test', topics: ['GEMARA'], locations: ['JERUSALEM'], isSubscribed: false },
];

const request = (overrides: Partial<Payload>): Payload => ({
  id: 'req-1',
  topic: 'GEMARA',
  seferOrTopic: 'Bava Metzia',
  location: 'JERUSALEM',
  modality: 'IN_PERSON',
  requesterId: 'rachel',
  ...overrides,
});

describe('NotificationsService.handleRequestCreatedEvent', () => {
  let prisma: FakePrisma;
  let resend: ReturnType<typeof makeFakeResend>;
  let service: NotificationsService;

  function setup(options: { failFor?: string[] } = {}) {
    process.env.RESEND_API_KEY = DUMMY_RESEND_KEY;
    process.env.FRONTEND_URL = 'https://findachavrusa.org';
    prisma = makeFakePrisma(
      PEOPLE.map(({ topics, locations, ...u }) => ({ name: u.id[0].toUpperCase() + u.id.slice(1), emailVerified: true, ...u })),
    );
    for (const p of PEOPLE) {
      p.topics.forEach((topic) => prisma.topicSubs.push({ userId: p.id, topic }));
      p.locations.forEach((location) => prisma.locationSubs.push({ userId: p.id, location }));
    }
    resend = makeFakeResend(options);
    service = new NotificationsService(prisma as unknown as PrismaService);
    (service as any).resend = resend.client;
  }

  const recipients = () => resend.sent.map((m) => m.to.split('@')[0]).sort();

  beforeEach(() => setup());

  it('request with a location: only users subscribed to the topic and that location', async () => {
    await service.handleRequestCreatedEvent(request({}));
    expect(recipients()).toEqual(['alice']);
    expect(resend.sent[0].subject).toBe('New Gemara request in Jerusalem');
    expect(resend.sent[0].text).toContain('Bava Metzia\nTopic: Gemara\nLocation: Jerusalem');
  });

  it('online request without a location: every topic subscriber, whatever their locations', async () => {
    await service.handleRequestCreatedEvent(request({ location: null, modality: 'ONLINE', seferOrTopic: null }));
    expect(recipients()).toEqual(['alice', 'bob', 'carol']);
    expect(resend.sent[0].subject).toBe('New Gemara request (online)');
    expect(resend.sent[0].text).toContain('Topic: Gemara\nWhere: Online');
    expect(resend.sent[0].text).not.toMatch(/ in [A-Z]|Location:/);
  });

  it('EITHER request without a location: treated like online', async () => {
    await service.handleRequestCreatedEvent(request({ location: null, modality: 'EITHER' }));
    expect(recipients()).toEqual(['alice', 'bob', 'carol']);
    expect(resend.sent[0].subject).toBe('New Gemara request (online)');
  });

  it('in-person request without a location: nobody, with a log line saying why', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await service.handleRequestCreatedEvent(request({ location: null, modality: 'IN_PERSON' }));
    expect(resend.send).not.toHaveBeenCalled();
    expect(prisma.userTopic.findMany).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('in-person request has no location'));
    log.mockRestore();
  });

  it('a topic-only subscriber gets online alerts but not located ones', async () => {
    await service.handleRequestCreatedEvent(request({}));
    expect(recipients()).not.toContain('bob');
    await service.handleRequestCreatedEvent(request({ location: null, modality: 'ONLINE' }));
    expect(recipients()).toContain('bob');
  });

  it('never alerts the requester, unverified users or unsubscribed users', async () => {
    await service.handleRequestCreatedEvent(request({}));
    await service.handleRequestCreatedEvent(request({ location: null, modality: 'ONLINE' }));
    for (const excluded of ['rachel', 'dan', 'erin', 'frank']) {
      expect(recipients()).not.toContain(excluded);
    }
  });

  it('emails someone once even if their subscription rows are duplicated', async () => {
    prisma.topicSubs.push({ userId: 'alice', topic: 'GEMARA' }, { userId: 'alice', topic: 'GEMARA' });
    prisma.locationSubs.push({ userId: 'alice', location: 'JERUSALEM' });
    await service.handleRequestCreatedEvent(request({}));
    expect(recipients()).toEqual(['alice']);
  });

  it('a send that throws is logged and the remaining alerts still go out', async () => {
    setup({ failFor: ['alice@x.test'] });
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      service.handleRequestCreatedEvent(request({ location: null, modality: 'ONLINE' })),
    ).resolves.toBeUndefined();
    expect(resend.send).toHaveBeenCalledTimes(3);
    expect(recipients()).toEqual(['bob', 'carol']);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('alice@x.test'), expect.any(Error));
    error.mockRestore();
  });

  it('a send that returns an error is logged without stopping the others', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    resend.send.mockImplementationOnce(async () => ({ data: null, error: { message: 'rejected' } }) as any);
    await service.handleRequestCreatedEvent(request({ location: null, modality: 'ONLINE' }));
    expect(resend.send).toHaveBeenCalledTimes(3);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('every alert links to the dashboard and has an HTML version', async () => {
    await service.handleRequestCreatedEvent(request({ location: null, modality: 'ONLINE' }));
    for (const mail of resend.sent) {
      expect(mail.text).toContain('See open requests:\nhttps://findachavrusa.org/dashboard');
      expect(mail.html).toContain('href="https://findachavrusa.org/dashboard"');
    }
  });
});
