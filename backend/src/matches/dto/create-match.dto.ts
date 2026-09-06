import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateMatchDto {
  @IsUUID()
  @IsNotEmpty()
  requestId!: string;

  @IsUUID()
  @IsNotEmpty()
  matchedUserId!: string;
}