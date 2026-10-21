import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_]+$/)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/)
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  confirmPassword!: string;
}