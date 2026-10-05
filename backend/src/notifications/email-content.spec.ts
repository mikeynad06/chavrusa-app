import { frontendBaseUrl, frontendLink, renderEmail } from './email-content';

describe('email-content', () => {
  const original = process.env.FRONTEND_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = original;
  });

  describe('frontendBaseUrl', () => {
    it('uses the first FRONTEND_URL entry, trimmed', () => {
      process.env.FRONTEND_URL = '  https://findachavrusa.org , https://www.findachavrusa.org,http://localhost:5173';
      expect(frontendBaseUrl()).toBe('https://findachavrusa.org');
    });

    it('drops trailing slashes', () => {
      process.env.FRONTEND_URL = 'https://findachavrusa.org//';
      expect(frontendBaseUrl()).toBe('https://findachavrusa.org');
    });

    it('falls back to localhost when FRONTEND_URL is unset or blank', () => {
      delete process.env.FRONTEND_URL;
      expect(frontendBaseUrl()).toBe('http://localhost:5173');
      process.env.FRONTEND_URL = '   ';
      expect(frontendBaseUrl()).toBe('http://localhost:5173');
      process.env.FRONTEND_URL = ', https://second.example';
      expect(frontendBaseUrl()).toBe('http://localhost:5173');
    });
  });

  describe('frontendLink', () => {
    it('joins paths with or without a leading slash', () => {
      process.env.FRONTEND_URL = 'https://findachavrusa.org/';
      expect(frontendLink('/matches/abc')).toBe('https://findachavrusa.org/matches/abc');
      expect(frontendLink('dashboard')).toBe('https://findachavrusa.org/dashboard');
    });
  });

  describe('renderEmail', () => {
    it('puts the link on its own line in the text version', () => {
      const { text } = renderEmail({ paragraphs: ['Hi'], button: { label: 'Open', url: 'https://x.test/a' } });
      expect(text).toBe('Hi\n\nOpen:\nhttps://x.test/a');
    });

    it('escapes user-supplied text in the HTML version', () => {
      const { html } = renderEmail({ paragraphs: ['<script>alert("x")</script> & co'] });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co');
    });
  });
});
