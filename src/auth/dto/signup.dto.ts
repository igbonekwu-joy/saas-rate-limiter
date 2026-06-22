import { ApiProperty } from "@nestjs/swagger";

export class SignUpDto {
    @ApiProperty({ example: 'user@demo.com', description: 'User email' })
    email!: string;

    @ApiProperty({ example: 'password', description: 'User password' })
    password!: string;
}
