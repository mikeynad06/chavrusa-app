import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Resend } from 'resend';
import { FROM_ADDRESS, SUPPORT_ADDRESS } from '../notifications/notifications.service';
import { renderEmail } from '../notifications/email-content';
import type { ReportProblemDto } from './dto/report-problem.dto';

@Injectable()
export class SupportService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  // Emails a "Report a problem" submission to the support inbox. Replying to it answers the reporter.
  async sendReport(report: ReportProblemDto) {
    // Honeypot filled in: almost certainly a bot. Say "sent" so it learns nothing, but send nothing.
    if (report.website && report.website.trim() !== '') {
      return { sent: true as const };
    }

    const email = report.email.trim();
    const subject = report.matchId ? `ChavrusaApp report (match ${report.matchId})` : 'ChavrusaApp report';
    const details = [
      `From: ${email}`,
      report.page ? `Page: ${report.page}` : null,
      report.matchId ? `Match: ${report.matchId}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    const { text, html } = renderEmail({
      paragraphs: ['A problem was reported on Chavrusa.', details, report.message.trim()],
      after: ['Reply to this email to answer the person who reported it.'],
    });

    try {
      const { error } = await this.resend.emails.send({
        from: FROM_ADDRESS,
        to: SUPPORT_ADDRESS,
        replyTo: email,
        subject,
        text,
        html,
      });
      if (error) throw new Error(typeof error === 'object' ? JSON.stringify(error) : String(error));
    } catch (err) {
      console.error('[SupportService] Failed to send a problem report:', err);
      // Unlike notification emails, the person is waiting on this one, so tell them it didn't go through.
      throw new ServiceUnavailableException(
        `We couldn't send your report just now. Please email us directly at ${SUPPORT_ADDRESS}.`,
      );
    }
    return { sent: true as const };
  }
}
