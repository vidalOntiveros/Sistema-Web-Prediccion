import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsEmail()
  email: string;

  @IsUUID()
  roleId: string;
}
