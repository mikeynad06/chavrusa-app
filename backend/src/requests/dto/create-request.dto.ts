import { IsEnum, IsString, IsOptional } from 'class-validator';
import { Topic, LearningStyle, LearningLevel, LearningModality, Language, Location, TimeSlot, Timezone } from '@prisma/client';

export class CreateRequestDto {
  @IsEnum(Topic)
  topic!: Topic;

  @IsOptional()
  @IsString()
  seferOrTopic?: string;

  @IsEnum(LearningStyle)
  style!: LearningStyle;

  @IsEnum(LearningLevel)
  level!: LearningLevel;

  @IsOptional()
  @IsEnum(LearningModality)
  modality?: LearningModality;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Location)
  location?: Location;

  @IsEnum(TimeSlot)
  timeSlot!: TimeSlot;

  @IsEnum(Timezone)
  timezone!: Timezone;
}