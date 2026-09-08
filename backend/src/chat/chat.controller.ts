import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { GetUser } from '../auth/get-user.decorator';

@Controller('matches/:matchId/messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getMessages(@Param('matchId') matchId: string, @GetUser() user: { userId: string }) {
    return this.chatService.getMessages(matchId, user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  sendMessage(
    @Param('matchId') matchId: string,
    @Body() dto: SendMessageDto,
    @GetUser() user: { userId: string },
  ) {
    return this.chatService.sendMessage(matchId, user.userId, dto.body);
  }
}
