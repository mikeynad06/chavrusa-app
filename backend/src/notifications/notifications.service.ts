import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { Topic, Location } from '@prisma/client';

const FROM_ADDRESS = 'onboarding@resend.dev';

interface RequestCreatedEvent {
  id: string;
  topic: Topic;
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
    const { error } = await this.resend.emails.send({
      from: FROM_ADDRESS,
      to: request.requester.email,
      subject: 'Your Chavrusa request was claimed!',
      text: `Hey ${request.requester.name}, great news! ${claimer.name} has agreed to learn ${request.topic} with you. Open your matches to start chatting: /matches/${payload.matchId}`,
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
      where: { id: { in: perfectMatchIds } },
    });

    // 5. Send the targeted alerts
    for (const user of users) {
      const { error } = await this.resend.emails.send({
        from: FROM_ADDRESS,
        to: user.email,
        subject: `New ${payload.topic} request in ${payload.location}`,
        text: `Hi ${user.name}, a new ${payload.topic} request was just posted in ${payload.location} — matching your topic and location subscriptions. Check it out and claim it before someone else does!`,
      });

      if (error) {
        console.error(`[NotificationsService] Failed to send perfect-match email to ${user.email}:`, error);
      }
    }
  }
}