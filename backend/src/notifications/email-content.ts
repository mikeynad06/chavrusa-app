// Shared building blocks for every email the app sends (verification, reset, match claimed, new-request alert).

// Links in emails point at the first FRONTEND_URL entry (the env var also lists extra CORS origins).
export function frontendBaseUrl(): string {
  const first = process.env.FRONTEND_URL?.split(',')[0].trim();
  return (first || 'http://localhost:5173').replace(/\/+$/, '');
}

export function frontendLink(path: string): string {
  return `${frontendBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

// GEMARA -> Gemara, TEL_AVIV -> Tel Aviv (mirrors the frontend's humanizeEnum).
export function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailContent {
  // Each entry is one paragraph. Use \n inside an entry for line breaks (e.g. a details block).
  paragraphs: string[];
  button?: { label: string; url: string };
  // Paragraphs shown after the button, e.g. "If you didn't request this, ignore it."
  after?: string[];
}

// Renders plain text (the fallback, with the link on its own line) and a simple HTML version with a button.
export function renderEmail({ paragraphs, button, after = [] }: EmailContent): { text: string; html: string } {
  const textBlocks = [...paragraphs];
  if (button) textBlocks.push(`${button.label}:\n${button.url}`);
  textBlocks.push(...after);
  const text = textBlocks.join('\n\n');

  const p = (block: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#292524">${escapeHtml(block).replace(/\n/g, '<br>')}</p>`;
  const buttonHtml = button
    ? `<p style="margin:24px 0">` +
      `<a href="${escapeHtml(button.url)}" style="display:inline-block;background:#8a6a3c;color:#fffdf8;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:999px">${escapeHtml(button.label)}</a>` +
      `</p>` +
      `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#57534e">Or paste this link into your browser:<br><a href="${escapeHtml(button.url)}" style="color:#6f5430;word-break:break-all">${escapeHtml(button.url)}</a></p>`
    : '';
  const html =
    `<!doctype html><html><body style="margin:0;padding:24px;background:#faf7f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">` +
    `<div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e3dbc9;border-radius:16px;padding:28px">` +
    paragraphs.map(p).join('') +
    buttonHtml +
    after.map(p).join('') +
    `<p style="margin:24px 0 0;font-size:12px;color:#a8a29e">Chavrusa · findachavrusa.org</p>` +
    `</div></body></html>`;

  return { text, html };
}
