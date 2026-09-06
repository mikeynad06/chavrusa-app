import { Injectable } from '@nestjs/common';
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
  async create(data: CreateRequestDto, userId: string) { {
    // 1. Save to DB
    const newRequest = await this.prisma.request.create({
      data: {
        ...data,
        requesterId: userId,
      },
    });

    // 2. Fire the event!
    this.eventEmitter.emit('request.created', newRequest);

    return newRequest;
  }

 

}}