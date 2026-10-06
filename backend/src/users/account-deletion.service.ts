import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export const DELETE_CONFIRMATION_TEXT = 'DELETE';
export const DELETION_LINK_TTL_MS = 30 * 60 * 1000;

// Google-only accounts confirm deletion through an emailed one-time link, built like the password reset
// link: a random token whose SHA-256 hash is stored, valid for 30 minutes. No schema change: it's kept in
// the resetToken / resetTokenExpiry columns, which Google-only accounts never use (forgot-password skips
// accounts without a password). The stored value is prefixed, so a deletion token can never be accepted by
// /auth/reset-password, which looks up the bare hash.
const DELETION_TOKEN_PREFIX = 'delete:';
const storedDeletionToken = (token: string) =>
  DELETION_TOKEN_PREFIX + crypto.createHash('sha256').update(token).digest('hex');

// Who to tell after an account is deleted. "claimed" = the deleted user had claimed this person's request
// (it's reopened); "requested" = this person had claimed the deleted user's request (it's gone).
export interface AffectedPartner {
  userId: string;
  kind: 'claimed' | 'requested';
  requestTitle: string | null;
  requestTopic: string;
}

export interface AccountDeletedEvent {
  name: string;
  email: string;
  partners: AffectedPartner[];
}

export interface AccountDeletionRequestedEvent {
  name: string;
  email: string;
  token: string;
}

@Injectable()
export class AccountDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  // DELETE /users/me. Password accounts are deleted straight away once the password checks out.
  // Google-only accounts (no password) get an email with a 30-minute confirmation link; nothing is deleted yet.
  async requestDeletion(userId: string, confirm: unknown, password: unknown) {
    if (confirm !== DELETE_CONFIRMATION_TEXT) {
      throw new BadRequestException(`Type ${DELETE_CONFIRMATION_TEXT} to confirm.`);
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, password: true },
    });
    if (!user) throw new UnauthorizedException();

    if (user.password) {
      if (typeof password !== 'string' || !(await bcrypt.compare(password, user.password))) {
        throw new UnauthorizedException('That password is incorrect.');
      }
      await this.deleteAccount(user.id);
      return { deleted: true as const };
    }

    // A new request replaces any earlier link, so only the latest email works.
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: storedDeletionToken(token), resetTokenExpiry: new Date(Date.now() + DELETION_LINK_TTL_MS) },
    });
    const event: AccountDeletionRequestedEvent = { name: user.name, email: user.email, token };
    this.emitSafely('account.deletion-requested', event);
    return { emailSent: true as const, email: user.email };
  }

  // POST /users/me/confirm-deletion, from the emailed link. Needs both the link and a login to the same
  // account. Single use: the account (and the token with it) is gone afterwards.
  async confirmDeletion(userId: string, token: unknown) {
    if (typeof token !== 'string' || token === '') {
      throw new BadRequestException('This link is invalid or has expired.');
    }
    const owner = await this.prisma.user.findUnique({
      where: { resetToken: storedDeletionToken(token) },
      select: { id: true, resetTokenExpiry: true },
    });
    if (!owner || owner.id !== userId || !owner.resetTokenExpiry || owner.resetTokenExpiry < new Date()) {
      throw new BadRequestException('This link is invalid or has expired.');
    }
    await this.deleteAccount(owner.id);
    return { deleted: true as const };
  }

  // Removes the user and everything that cascades from them, in one transaction:
  //  1. requests this user had claimed go back to OPEN, so the other person can be matched again
  //  2. location subscriptions are deleted explicitly (that foreign key is ON DELETE RESTRICT in the live
  //     database, so it would otherwise block the delete)
  //  3. the user row; the database cascades their topics, requests, matches and the messages in them
  // Emails go out afterwards and can never fail or undo the deletion.
  private async deleteAccount(userId: string) {
    const deleted = await this.prisma.$transaction(async (tx) => {
      // Captured now: the address is needed for the confirmation email after the row is gone.
      const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      if (!user) throw new BadRequestException('This account has already been deleted.');

      const claimed = await tx.match.findMany({
        where: { matchedUserId: userId },
        select: { request: { select: { id: true, requesterId: true, seferOrTopic: true, topic: true } } },
      });
      const ownRequestMatches = await tx.match.findMany({
        where: { request: { requesterId: userId } },
        select: { matchedUserId: true, request: { select: { seferOrTopic: true, topic: true } } },
      });

      if (claimed.length > 0) {
        await tx.request.updateMany({
          where: { id: { in: claimed.map((m) => m.request.id) }, status: 'MATCHED' },
          data: { status: 'OPEN' },
        });
      }
      await tx.userLocation.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });

      const partners: AffectedPartner[] = [
        ...claimed.map((m) => ({
          userId: m.request.requesterId,
          kind: 'claimed' as const,
          requestTitle: m.request.seferOrTopic,
          requestTopic: m.request.topic,
        })),
        ...ownRequestMatches.map((m) => ({
          userId: m.matchedUserId,
          kind: 'requested' as const,
          requestTitle: m.request.seferOrTopic,
          requestTopic: m.request.topic,
        })),
      ];
      return { name: user.name, email: user.email, partners };
    });

    // After commit, so nobody is told about a deletion that rolled back.
    const event: AccountDeletedEvent = deleted;
    this.emitSafely('account.deleted', event);
  }

  // Email handlers are listeners on these events. Nothing that happens there (or here) may fail the request:
  // the account deletion has already committed by the time account.deleted is emitted.
  private emitSafely(name: string, payload: unknown) {
    try {
      this.events.emit(name, payload);
    } catch (err) {
      console.error(`[AccountDeletionService] Failed to emit ${name}:`, err);
    }
  }
}
