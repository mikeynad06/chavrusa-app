import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Topic } from '@prisma/client';
import { GetUser } from '../auth/get-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SubscribeTopicDto, SubscribeLocationDto } from './dto/subscribe.dto';
import { ConfirmAccountDeletionDto, DeleteAccountDto } from './dto/delete-account.dto';
import { AccountDeletionService } from './account-deletion.service';

const FIFTEEN_MINUTES = 15 * 60_000;

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly accountDeletion: AccountDeletionService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll() {
    return this.usersService.findAllUsers();
  }

  // MUST be above ':id' to prevent "me" from being read as a dynamic ID
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getDashboard(@GetUser() user: { userId: string }) {
    return this.usersService.getDashboard(user.userId);
  }

  // Deletes the logged-in user's account (password accounts), or emails a confirmation link (Google-only).
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, AuthGuard('jwt'))
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MINUTES } })
  @Delete('me')
  deleteAccount(@GetUser() user: { userId: string }, @Body() dto: DeleteAccountDto) {
    return this.accountDeletion.requestDeletion(user.userId, dto.confirm, dto.password);
  }

  // Confirms a Google-only account's deletion from the emailed one-time link. Needs the link and a login
  // to the same account.
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, AuthGuard('jwt'))
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MINUTES } })
  @Post('me/confirm-deletion')
  confirmAccountDeletion(@GetUser() user: { userId: string }, @Body() dto: ConfirmAccountDeletionDto) {
    return this.accountDeletion.confirmDeletion(user.userId, dto.token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  updateProfile(@GetUser() user: { userId: string }, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/topics')
  subscribeToTopic(@GetUser() user: { userId: string }, @Body() dto: SubscribeTopicDto) {
    return this.usersService.subscribeToTopic(user.userId, dto.topic);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/topics/:topic')
  unsubscribeFromTopic(@GetUser() user: { userId: string }, @Param('topic') topic: Topic) {
    return this.usersService.unsubscribeFromTopic(user.userId, topic);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/locations')
  subscribeToLocation(@GetUser() user: { userId: string }, @Body() dto: SubscribeLocationDto) {
    return this.usersService.subscribeToLocation(user.userId, dto.location);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/locations/:id')
  unsubscribeFromLocation(@GetUser() user: { userId: string }, @Param('id') id: string) {
    return this.usersService.unsubscribeFromLocation(user.userId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }
}