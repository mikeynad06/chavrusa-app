import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  // Must be exactly "DELETE" (checked in AccountDeletionService so the message can say so).
  @IsString()
  @MaxLength(20)
  confirm!: string;

  // Required for accounts that have a password; Google-only accounts confirm by email instead.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  password?: string;
}

export class ConfirmAccountDeletionDto {
  @IsString()
  @MaxLength(200)
  token!: string;
}
