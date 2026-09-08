import { IsEnum } from 'class-validator';
import { Topic, Location } from '@prisma/client';

export class SubscribeTopicDto {
  @IsEnum(Topic)
  topic!: Topic;
}

export class SubscribeLocationDto {
  @IsEnum(Location)
  location!: Location;
}
