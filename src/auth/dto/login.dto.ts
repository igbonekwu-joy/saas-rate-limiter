import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'user@demo.com', description: 'User email' })
    @IsEmail()
    email!: string;
    
    @ApiProperty({ example: 'password', description: 'User password' })
    @IsString()
    @MinLength(6)
    @MaxLength(20)
    password!: string;
}
