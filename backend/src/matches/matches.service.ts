import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async claimRequest(requestId: string, matchedUserId: string) {
    // We use a transaction to prevent race conditions (two people claiming at once)
    const result = await this.prisma.$transaction(
      async (tx) => {
        // 1. Verify the request exists and is still OPEN
        const request = await tx.request.findUnique({
          where: { id: requestId },
        });

        if (!request) {
          throw new BadRequestException('Request not found.');
        }
        if (request.status !== RequestStatus.OPEN) {
          throw new BadRequestException('This request has already been claimed or is closed.');
        }
        if (request.requesterId === matchedUserId) {
          throw new BadRequestException('You cannot claim your own request.');
        }

        // 2. Create the Match record
        const match = await tx.match.create({
          data: {
            requestId: request.id,
            matchedUserId: matchedUserId,
          },
        });

        // 3. Mark the original request as MATCHED
        await tx.request.update({
          where: { id: request.id },
          data: { status: RequestStatus.MATCHED },
        });

        return {
          message: 'Match claimed successfully!',
          match,
        };
      },
      {
        maxWait: 5000,  // 5 seconds to wait for Prisma to connect to the database
        timeout: 10000, // 10 seconds for the entire transaction to finish
      }
    );

    // 4. Emit the event AFTER the transaction has committed successfully
    //    (so we never notify anyone about a match that got rolled back)
    this.eventEmitter.emit('match.claimed', {
      matchId: result.match.id,
      requestId,
      claimerId: matchedUserId,
    });

    return result;
  }

  async findAll() {
    return this.prisma.match.findMany({
      include: {
        request: true,
        // select only safe fields — never spread the full User row (it includes password hash)
        matchedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.match.findMany({
      where: {
        OR: [{ matchedUserId: userId }, { request: { requesterId: userId } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        matchedUser: { select: { id: true, name: true } },
        request: {
          select: {
            id: true,
            topic: true,
            seferOrTopic: true,
            description: true,
            requesterId: true,
            requester: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async findOne(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        matchedUser: { select: { id: true, name: true } },
        request: {
          select: {
            id: true,
            topic: true,
            seferOrTopic: true,
            description: true,
            requesterId: true,
            requester: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found.');
    }
    if (match.matchedUserId !== userId && match.request.requesterId !== userId) {
      throw new ForbiddenException('You are not part of this match.');
    }

    return match;
  }
}