import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-users.dto';

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
      include: {
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

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { requests: true },
    });
  }
  async subscribeToTopic(userId: string, topic: string) {
    return this.prisma.userTopic.create({
      data: {
        userId: userId,
        topic: topic as any, // Cast to any to satisfy the Prisma Enum
      },
    });
  }
  async subscribeToLocation(userId: string, location: string) {
    return this.prisma.userLocation.create({
      data: {
        userId: userId,
        location: location.toUpperCase(),
      },
    });
  }
}