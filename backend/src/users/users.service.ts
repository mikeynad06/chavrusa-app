import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, Topic, Location } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        ...dto,
        password: 'DISABLED_ACCOUNT', // Dummy password to satisfy the updated schema
      },
    });
  }

  async findAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        timezone: true,
        requests: true,
      },
    });
  }

  async getDashboard(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        timezone: true,
        whatsappNumber: true,
        isSubscribed: true,
        preferredTopics: { select: { id: true, topic: true } },
        subscribedLocations: { select: { id: true, location: true } },
        requests: {
          orderBy: { createdAt: 'desc' },
        },
        matches: {
          include: { request: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        timezone: true,
        whatsappNumber: true,
        isSubscribed: true,
      },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        timezone: true,
        requests: true,
      },
    });
  }
  async subscribeToTopic(userId: string, topic: Topic) {
    try {
      return await this.prisma.userTopic.create({
        data: { userId, topic },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return this.prisma.userTopic.findFirstOrThrow({ where: { userId, topic } });
      }
      throw err;
    }
  }

  async unsubscribeFromTopic(userId: string, topic: Topic) {
    await this.prisma.userTopic.deleteMany({ where: { userId, topic } });
  }

  async subscribeToLocation(userId: string, location: Location) {
    const existing = await this.prisma.userLocation.findFirst({ where: { userId, location } });
    if (existing) return existing;
    return this.prisma.userLocation.create({ data: { userId, location } });
  }

  async unsubscribeFromLocation(userId: string, id: string) {
    const row = await this.prisma.userLocation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Subscription not found.');
    if (row.userId !== userId) throw new ForbiddenException('Not your subscription.');
    await this.prisma.userLocation.delete({ where: { id } });
  }
}