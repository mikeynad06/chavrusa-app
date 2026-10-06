import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { SupportService } from './support.service';
import { ReportProblemDto } from './dto/report-problem.dto';

const ONE_HOUR = 60 * 60_000;

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // The "Report a problem" form. Public (logged-out people can report problems too), rate limited per IP.
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: ONE_HOUR } })
  @Post('report')
  report(@Body() dto: ReportProblemDto) {
    return this.supportService.sendReport(dto);
  }
}
