import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class ReportProblemDto {
  // Where to reply. Required, so admin@ can answer the person who reported the problem.
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(10, 5000, { message: 'Please describe the problem in at least 10 characters.' })
  message!: string;

  // The page the report was started from, e.g. "/matches/abc".
  @IsOptional()
  @IsString()
  @MaxLength(500)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  matchId?: string;

  // Honeypot: a field real users never see. Bots that fill every input put something here.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}
