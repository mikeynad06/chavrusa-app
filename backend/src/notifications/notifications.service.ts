import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { Topic, Location, LearningModality } from '@prisma/client';
import { frontendLink, humanizeEnum, renderEmail } from './email-content';

export const FROM_ADDRESS = 'Chavrusa <noreply@findachavrusa.org>';
// noreply@ isn't a real inbox, so route replies somewhere a person reads them.
export const REPLY_TO_ADDRESS = 'mikeynad06@gmail.com';

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
}