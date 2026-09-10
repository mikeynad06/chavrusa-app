import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  async findAllOpen() {
  return this.prisma.request.findMany({
    where: { status: 'OPEN' },
    include: { requester: { select: { id: true, name: true, /* whatever's safe to expose */ } } },
  });
}
  async create(data: CreateRequestDto, userId: string) {
    const newRequest = await this.prisma.request.create({
      data: {
        ...data,
        description: data.description ?? '',
        requesterId: userId,
      },
    });

    this.eventEmitter.emit('request.created', newRequest);

    return newRequest;
  }

  async cancel(requestId: string, userId: string) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });

    if (!request) {
      throw new NotFoundException('Request not found.');
    }
    if (request.requesterId !== userId) {
      throw new ForbiddenException('You can only cancel your own requests.');
    }
    if (request.status !== 'OPEN') {
      throw new BadRequestException('Only open requests can be canceled.');
    }

    return this.prisma.request.update({
      where: { id: requestId },
      data: { status: 'CLOSED' },
    });
  }

}