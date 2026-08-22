import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyQrDto {
  @IsNotEmpty()
  @IsString()
  qrToken: string;

  @IsOptional()
  @IsString()
  gateName?: string;
}
