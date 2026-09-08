import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface PlatformStats {
  pairsMade: number;
  avgClaimDays: number | null;
  asOf: string;
}

@Injectable()
export class StatsService {
  private cache: PlatformStats | null = null;
  private cachedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<PlatformStats> {
    const isStale = Date.now() - this.cachedAt > CACHE_TTL_MS;
    if (!this.cache || isStale) {
      this.cache = await this.computeStats();
      this.cachedAt = Date.now();
    }
    return this.cache;
  }

  private async computeStats(): Promise<PlatformStats> {
    const matches = await this.prisma.match.findMany({
      select: { createdAt: true, request: { select: { createdAt: true } } },
    });

    const pairsMade = matches.length;

    let avgClaimDays: number | null = null;
    if (pairsMade > 0) {
      const totalDays = matches.reduce((sum, match) => {
        const claimMs = match.createdAt.getTime() - match.request.createdAt.getTime();
        return sum + claimMs / (1000 * 60 * 60 * 24);
      }, 0);
      avgClaimDays = totalDays / pairsMade;
    }

    return { pairsMade, avgClaimDays, asOf: new Date().toISOString() };
  }
}
