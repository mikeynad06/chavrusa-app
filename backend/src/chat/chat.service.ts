import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertParticipant(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        matchedUserId: true,
        request: { select: { requesterId: true } },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found.');
    }
    if (match.matchedUserId !== userId && match.request.requesterId !== userId) {
      throw new ForbiddenException('You are not part of this match.');
    }
  }

  async getMessages(matchId: string, userId: string) {
    await this.assertParticipant(matchId, userId);

    return this.prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });
  }

  async sendMessage(matchId: string, userId: string, body: string) {
    await this.assertParticipant(matchId, userId);

    return this.prisma.message.create({
      data: { matchId, senderId: userId, body },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });
  }
}
