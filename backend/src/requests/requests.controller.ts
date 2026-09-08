import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto'; // <-- 1. Import the DTO

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() createRequestDto: CreateRequestDto, // <-- 2. Replace 'body: any' with this
    @GetUser() user: { userId: string } 
  ) {
    return this.requestsService.create(createRequestDto, user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAllOpen() {
    return this.requestsService.findAllOpen();
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @GetUser() user: { userId: string }) {
    return this.requestsService.cancel(id, user.userId);
  }
}