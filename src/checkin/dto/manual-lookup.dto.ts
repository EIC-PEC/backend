import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ManualLookupDto {
  @IsNotEmpty()
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  gateName?: string;

  @IsOptional()
  @IsBoolean()
  performCheckIn?: boolean;
}
