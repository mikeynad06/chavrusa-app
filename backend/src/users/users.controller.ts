import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Topic } from '@prisma/client';
import { GetUser } from '../auth/get-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SubscribeTopicDto, SubscribeLocationDto } from './dto/subscribe.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }
}