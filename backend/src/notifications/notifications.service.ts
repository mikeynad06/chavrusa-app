import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { Topic, Location, LearningModality } from '@prisma/client';
import { frontendLink, humanizeEnum, renderEmail } from './email-content';
import type { AccountDeletedEvent, AccountDeletionRequestedEvent } from '../users/account-deletion.service';

export const FROM_ADDRESS = 'Chavrusa <noreply@findachavrusa.org>';
// noreply@ isn't a real inbox, so route replies somewhere a person reads them.
export const REPLY_TO_ADDRESS = 'admin@findachavrusa.org';
// The support inbox: where "Report a problem" submissions are sent.
export const SUPPORT_ADDRESS = 'admin@findachavrusa.org';

interface RequestCreatedEvent {
  id: string;
  topic: Topic;
  seferOrTopic?: string | null;
  location?: Location | null;
  modality: LearningModality;
  requesterId: string;
}

interface MatchClaimedEvent {
  matchId: string;
  requestId: string;
  claimerId: string;
}

@Injectable()
export class NotificationsService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('match.claimed')
  async handleMatchClaimedEvent(payload: MatchClaimedEvent) {
    // 1. Fetch the original request (to get Sarah's details) and the claimer (David's details)
    const request = await this.prisma.request.findUnique({
      where: { id: payload.requestId },
      include: { requester: true },
    });

    const claimer = await this.prisma.user.findUnique({
      where: { id: payload.claimerId },
    });

    if (!request || !claimer) return;

    // 2. Send the email alert
    const title = request.seferOrTopic || humanizeEnum(request.topic);
    const { text, html } = renderEmail({
      paragraphs: [
        `Hi ${request.requester.name}, great news!`,
        `${claimer.name} has claimed your request "${title}" and wants to learn it with you. Open your match to start chatting and set a first seder.`,
      ],
      button: { label: 'Open your match', url: frontendLink(`/matches/${payload.matchId}`) },
    });
    const { error } = await this.resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO_ADDRESS,
      to: request.requester.email,
      subject: 'Your Chavrusa request was claimed!',
      text,
      html,
    });

    if (error) {
      console.error(`[NotificationsService] Failed to send match-claimed email to ${request.requester.email}:`, error);
    }
  }

  @OnEvent('request.created')
  async handleRequestCreatedEvent(payload: RequestCreatedEvent) {
    // Who gets alerted depends on whether the request has a place to match on:
    //  - has a location:                  users subscribed to the topic AND that location
    //  - no location, ONLINE or EITHER:    users subscribed to the topic (location doesn't matter online)
    //  - no location, IN_PERSON:           nobody -- there's no place to match against
    if (!payload.location && payload.modality === 'IN_PERSON') {
      console.log(`[NotificationsService] No alerts for request ${payload.id}: in-person request has no location to match.`);
      return;
    }

    // 1. Everyone subscribed to this topic
    const topicSubs = await this.prisma.userTopic.findMany({
      where: { topic: payload.topic },
    });
    let candidateIds = topicSubs.map((sub) => sub.userId);

    // 2. With a location, narrow to users who are also subscribed to it
    if (payload.location) {
      const locationSubs = await this.prisma.userLocation.findMany({
        where: { location: payload.location },
      });
      const locationUserIds = new Set(locationSubs.map((sub) => sub.userId));
      candidateIds = candidateIds.filter((id) => locationUserIds.has(id));
    }

    // 3. Never the requester, and each person at most once
    const recipientIds = [...new Set(candidateIds)].filter((id) => id !== payload.requesterId);
    if (recipientIds.length === 0) return;

    // 4. Only verified users who haven't turned alerts off
    const users = await this.prisma.user.findMany({
      where: { id: { in: recipientIds }, emailVerified: true, isSubscribed: true },
    });

    // 5. Send the alerts
    const topic = humanizeEnum(payload.topic);
    const where = payload.location ? humanizeEnum(payload.location) : 'Online';
    const subject = payload.location ? `New ${topic} request in ${where}` : `New ${topic} request (online)`;
    const intro = payload.location
      ? 'a new request matching your topic and location alerts was just posted.'
      : 'a new online request matching your topic alerts was just posted.';
    // The title is optional on requests; skip that line rather than repeat the topic.
    const details = [payload.seferOrTopic, `Topic: ${topic}`, payload.location ? `Location: ${where}` : 'Where: Online']
      .filter(Boolean)
      .join('\n');

    for (const user of users) {
      const { text, html } = renderEmail({
        paragraphs: [`Hi ${user.name}, ${intro}`, details, 'Take a look and claim it before someone else does.'],
        button: { label: 'See open requests', url: frontendLink('/dashboard') },
      });
      // One failed send (returned error or thrown) is logged and skipped, so the rest still go out.
      try {
        const { error } = await this.resend.emails.send({
          from: FROM_ADDRESS,
          replyTo: REPLY_TO_ADDRESS,
          to: user.email,
          subject,
          text,
          html,
        });
        if (error) {
          console.error(`[NotificationsService] Failed to send new-request alert to ${user.email}:`, error);
        }
      } catch (err) {
        console.error(`[NotificationsService] Failed to send new-request alert to ${user.email}:`, err);
      }
    }
  }

  // Google-only accounts confirm deletion through this emailed link (password accounts confirm in the app).
  @OnEvent('account.deletion-requested')
  async handleAccountDeletionRequested(payload: AccountDeletionRequestedEvent) {
    const { text, html } = renderEmail({
      paragraphs: [
        `Hi ${payload.name}, we received a request to delete your Chavrusa account.`,
        'Open the link below and press the button to confirm. This permanently deletes your profile, your requests, your matches and their messages. The link expires in 30 minutes.',
      ],
      button: { label: 'Confirm account deletion', url: frontendLink(`/delete-account?token=${payload.token}`) },
      after: ["If you didn't ask for this, ignore this email and your account will stay as it is."],
    });
    await this.send(payload.email, 'Confirm deleting your Chavrusa account', text, html, 'deletion-confirmation');
  }

  // After an account is deleted: confirm it to the person who left, and tell each matched partner what changed.
  @OnEvent('account.deleted')
  async handleAccountDeleted(payload: AccountDeletedEvent) {
    const goodbye = renderEmail({
      paragraphs: [
        `Hi ${payload.name}, your Chavrusa account has been deleted, along with your requests, matches and messages.`,
        "If you didn't do this, reply to this email and let us know.",
      ],
    });
    await this.send(payload.email, 'Your Chavrusa account has been deleted', goodbye.text, goodbye.html, 'account-deleted');

    if (payload.partners.length === 0) return;

    // One email per partner, even if several of their matches were affected. Only verified users who
    // haven't turned emails off. The deleted person isn't named: the request title identifies the match.
    const byUser = new Map<string, AccountDeletedEvent['partners']>();
    for (const p of payload.partners) byUser.set(p.userId, [...(byUser.get(p.userId) ?? []), p]);
    let users: { id: string; name: string; email: string }[];
    try {
      users = await this.prisma.user.findMany({
        where: { id: { in: [...byUser.keys()] }, emailVerified: true, isSubscribed: true },
        select: { id: true, name: true, email: true },
      });
    } catch (err) {
      console.error('[NotificationsService] Could not look up partners to notify after an account deletion:', err);
      return;
    }

    const titleOf = (p: AccountDeletedEvent['partners'][number]) => p.requestTitle || humanizeEnum(p.requestTopic);
    const list = (titles: string[]) => titles.map((t) => `"${t}"`).join(', ');
    for (const user of users) {
      const affected = byUser.get(user.id) ?? [];
      const reopened = affected.filter((p) => p.kind === 'claimed').map(titleOf);
      const removed = affected.filter((p) => p.kind === 'requested').map(titleOf);
      const { text, html } = renderEmail({
        paragraphs: [
          `Hi ${user.name}, your chavrusa for ${list(affected.map(titleOf))} has deleted their Chavrusa account, so your conversation with them has been removed.`,
          ...(reopened.length ? [`Your request ${list(reopened)} is open again, so someone else can claim it.`] : []),
          ...(removed.length ? [`Your match for ${list(removed)} has been removed.`] : []),
        ],
        button: { label: 'See open requests', url: frontendLink('/dashboard') },
      });
      await this.send(user.email, 'Your chavrusa has left Chavrusa', text, html, 'partner-left');
    }
  }

  // Sends one email; a failure (returned or thrown) is logged and never breaks the caller.
  private async send(to: string, subject: string, text: string, html: string, kind: string) {
    try {
      const { error } = await this.resend.emails.send({ from: FROM_ADDRESS, replyTo: REPLY_TO_ADDRESS, to, subject, text, html });
      if (error) console.error(`[NotificationsService] Failed to send ${kind} email to ${to}:`, error);
    } catch (err) {
      console.error(`[NotificationsService] Failed to send ${kind} email to ${to}:`, err);
    }
  }
}
