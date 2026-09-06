import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-users.dto';

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
  @Post('me/topics')
  subscribeToTopic(
    @GetUser() user: { userId: string }, 
    @Body('topic') topic: string // Extracts just the "topic" field from the JSON body
  ) {
    return this.usersService.subscribeToTopic(user.userId, topic);
  }
  @UseGuards(AuthGuard('jwt'))
  @Post('me/locations')
  subscribeToLocation(
    @GetUser() user: { userId: string }, 
    @Body('location') location: string
  ) {
    return this.usersService.subscribeToLocation(user.userId, location);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }
}