import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { Topic, Location } from '@prisma/client';

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

    // 2. Simulate sending a WhatsApp/Email alert
    console.log('\n====================================================');
    console.log(`🔔 NEW NOTIFICATION`);
    console.log(`To: ${request.requester.email} (${request.requester.name})`);
    console.log(`Subject: Your Chavrusa request was claimed!`);
    console.log(`Message: Hey ${request.requester.name}, great news! ${claimer.name} has agreed to learn ${request.topic} with you. Open your matches to start chatting: /matches/${payload.matchId}`);
    console.log('====================================================\n');
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
      console.log(`🎯 [PERFECT MATCH] To: ${user.email} - A ${payload.topic} request was posted in ${payload.location}!`);
    }
  }
}