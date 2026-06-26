import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateApiKeyDto {
    @ApiProperty({ example: 'My production key', description: 'A label to identify this key' })
    @IsString()
    name!: string;

    @ApiProperty({ example: 1000, description: 'Requests allowed per minute' })
    rateLimitPerMinute!: number;
}
