import { ApiProperty, PartialType } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'user@demo.com', description: 'User email' })
    email!: string;
    
    @ApiProperty({ example: 'password', description: 'User password' })
    password!: string;
}
