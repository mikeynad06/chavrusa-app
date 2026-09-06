import { Controller, Post, Param, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MatchesService } from './matches.service';
import { GetUser } from '../auth/get-user.decorator'; // <-- Import your custom decorator

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @UseGuards(AuthGuard('jwt')) // <-- This locks the route down!
  @Post('claim/:requestId')
  claim(
    @Param('requestId') requestId: string,
    @GetUser() user: { userId: string; email: string } // <-- Extracts the user from the token
  ) {
    // You now have the securely verified user.userId!
    return this.matchesService.claimRequest(requestId, user.userId);
  }

  @UseGuards(AuthGuard('jwt')) // <-- Added: this was public before, now requires auth
  @Get()
  findAll() {
    return this.matchesService.findAll();
  }
}