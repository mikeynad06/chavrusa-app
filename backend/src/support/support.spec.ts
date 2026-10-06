import { Test } from '@nestjs/testing';
import { INestApplication, ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { DUMMY_RESEND_KEY, makeFakeResend } from '../../test/fakes';

const report = {
  email: 'reporter@example.com',
  message: 'The chat page shows an error when I open it.',
  page: '/matches/m-42',
  matchId: 'm-42',
};

function makeService(options: { failFor?: string[] } = {}) {
  process.env.RESEND_API_KEY = DUMMY_RESEND_KEY;
  const resend = makeFakeResend(options);
  const service = new SupportService();
  (service as any).resend = resend.client;
  return { service, resend };
}

describe('SupportService.sendReport', () => {
  it('emails the report to admin@, with replies going to the reporter', async () => {
    const { service, resend } = makeService();
    await expect(service.sendReport(report)).resolves.toEqual({ sent: true });
    expect(resend.sent).toHaveLength(1);
    expect(resend.sent[0]).toMatchObject({
      from: 'Chavrusa <noreply@findachavrusa.org>',
      to: 'admin@findachavrusa.org',
      replyTo: 'reporter@example.com',
      subject: 'ChavrusaApp report (match m-42)',
    });
    expect(resend.sent[0].text).toContain('From: reporter@example.com\nPage: /matches/m-42\nMatch: m-42');
    expect(resend.sent[0].text).toContain('The chat page shows an error when I open it.');
  });

  it('uses the plain subject when there is no match', async () => {
    const { service, resend } = makeService();
    await service.sendReport({ email: 'a@b.co', message: 'Something is broken here.' });
    expect(resend.sent[0].subject).toBe('ChavrusaApp report');
    expect(resend.sent[0].text).not.toContain('Match:');
  });

  it("escapes the reporter's text in the HTML version", async () => {
    const { service, resend } = makeService();
    await service.sendReport({ ...report, message: '<script>alert(1)</script> it broke' });
    expect(resend.sent[0].html).not.toContain('<script>');
    expect(resend.sent[0].html).toContain('&lt;script&gt;');
  });

  it('pretends to succeed but sends nothing when the hidden honeypot field is filled', async () => {
    const { service, resend } = makeService();
    await expect(service.sendReport({ ...report, website: 'http://spam.example' })).resolves.toEqual({ sent: true });
    expect(resend.send).not.toHaveBeenCalled();
  });

  it('tells the person when the email could not be sent (so the report is not silently lost)', async () => {
    const { service } = makeService({ failFor: ['admin@findachavrusa.org'] });
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = service.sendReport(report);
    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.sendReport(report)).rejects.toThrow('admin@findachavrusa.org');
    error.mockRestore();
  });

  it('treats an error returned by the email provider as a failure too', async () => {
    const { service, resend } = makeService();
    resend.send.mockImplementationOnce(async () => ({ data: null, error: { message: 'rejected' } }) as any);
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(service.sendReport(report)).rejects.toBeInstanceOf(ServiceUnavailableException);
    error.mockRestore();
  });
});

describe('POST /support/report', () => {
  let app: INestApplication;
  const sendReport = jest.fn(async () => ({ sent: true }));

  beforeEach(async () => {
    sendReport.mockClear();
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] })],
      controllers: [SupportController],
      providers: [{ provide: SupportService, useValue: { sendReport } }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(() => app.close());

  it('rejects a missing or invalid email and a too-short message before sending anything', async () => {
    const post = (body: object) => request(app.getHttpServer()).post('/support/report').send(body);
    expect((await post({ message: 'long enough message' })).status).toBe(400);
    expect((await post({ email: 'not-an-email', message: 'long enough message' })).status).toBe(400);
    expect((await post({ email: 'a@b.co', message: 'short' })).status).toBe(400);
    expect(sendReport).not.toHaveBeenCalled();
  });

  it('allows 5 reports per hour per IP, then answers 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await request(app.getHttpServer()).post('/support/report').send(report)).status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(sendReport).toHaveBeenCalledTimes(5);
    expect(sendReport).toHaveBeenCalledWith(report);
  });
});
