import { ApiProperty } from "@nestjs/swagger";

export class CreateApiKeyDto {
    @ApiProperty({ example: 'My production key', description: 'A label to identify this key' })
    name!: string;

    @ApiProperty({ example: 1000, description: 'Requests allowed per minute' })
    rateLimitPerMinute!: number;
}
