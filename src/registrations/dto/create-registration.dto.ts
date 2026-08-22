import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PassType } from '@prisma/client';

export class CreateRegistrationDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  college?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  gradYear?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @IsNotEmpty()
  @IsEnum(PassType, {
    message:
      'passType must be one of: STUDENT_GENERAL, FOUNDER_PITCH, HACKATHON_BUILDER, CAMPUS_AMBASSADOR',
  })
  passType: PassType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tracks?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(30)
  referralCode?: string;
}
