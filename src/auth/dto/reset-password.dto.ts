import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(255)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/, {
    message: 'Password must contain at least one uppercase letter, one number, and one special character',
  })
  newPassword!: string;
}
