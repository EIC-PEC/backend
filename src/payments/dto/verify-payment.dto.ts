import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  transactionId: string;

  @IsOptional()
  @IsString()
  signature?: string;
}
