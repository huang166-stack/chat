import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CheckUsernameQueryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_]+$/)
  username!: string;
}