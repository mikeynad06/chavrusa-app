import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { Topic, Location } from '@prisma/client';
import { frontendLink, humanizeEnum, renderEmail } from './email-content';

export const FROM_ADDRESS = 'Chavrusa <noreply@findachavrusa.org>';
// noreply@ isn't a real inbox, so route replies somewhere a person reads them.
export const REPLY_TO_ADDRESS = 'mikeynad06@gmail.com';

interface RequestCreatedEvent {
  id: string;
  topic: Topic;
  seferOrTopic?: string | null;
  location?: Location | null;
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
    if (!payload.location) return; // Skip if the request has no location

    // 1. Get everyone subscribed to this topic
    const topicSubs = await this.prisma.userTopic.findMany({
      where: { topic: payload.topic },
    });
    const topicUserIds = topicSubs.map(sub => sub.userId);

    // 2. Get everyone subscribed to this location
    const locationSubs = await this.prisma.userLocation.findMany({
      where: { location: payload.location },
    });
    const locationUserIds = locationSubs.map(sub => sub.userId);

    // 3. Find the overlap (users who are in BOTH lists)
    const perfectMatchIds = topicUserIds.filter(
      id => locationUserIds.includes(id) && id !== payload.requesterId,
    );

    if (perfectMatchIds.length === 0) return;

    // 4. Fetch all matched users in one query
    const users = await this.prisma.user.findMany({
      where: { id: { in: perfectMatchIds }, emailVerified: true, isSubscribed: true },
    });

    // 5. Send the targeted alerts
    const topic = humanizeEnum(payload.topic);
    const location = humanizeEnum(payload.location);
    // The title is optional on requests; skip that line rather than repeat the topic.
    const details = [payload.seferOrTopic, `Topic: ${topic}`, `Location: ${location}`].filter(Boolean).join('\n');
    for (const user of users) {
      const { text, html } = renderEmail({
        paragraphs: [
          `Hi ${user.name}, a new request matching your topic and location alerts was just posted.`,
          details,
          'Take a look and claim it before someone else does.',
        ],
        button: { label: 'See open requests', url: frontendLink('/dashboard') },
      });
      const { error } = await this.resend.emails.send({
        from: FROM_ADDRESS,
        replyTo: REPLY_TO_ADDRESS,
        to: user.email,
        subject: `New ${topic} request in ${location}`,
        text,
        html,
      });

      if (error) {
        console.error(`[NotificationsService] Failed to send perfect-match email to ${user.email}:`, error);
      }
    }
  }
}