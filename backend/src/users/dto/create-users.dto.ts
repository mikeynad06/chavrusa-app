import { IsString, IsEmail, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Location, Timezone } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsEnum(Location)
  location!: Location;

  @IsEnum(Timezone)
  timezone!: Timezone;

  // Add this so NestJS doesn't strip it out!
  @IsOptional()
  @IsBoolean()
  isSubscribed?: boolean; 
}