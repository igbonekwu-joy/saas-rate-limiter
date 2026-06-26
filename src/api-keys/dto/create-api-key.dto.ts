import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString } from "class-validator";
import { Plan } from "../entities/api-key.entity";

export class CreateApiKeyDto {
    @ApiProperty({ example: 'My production key', description: 'A label to identify this key' })
    @IsString()
    name!: string;

    @ApiProperty({ enum: Plan, enumName: 'Plan', default: Plan.FREE, example: Plan.FREE, description: 'The plan this key belongs to' })
    @IsEnum(Plan)
    plan!: string;
    // @ApiProperty({ example: 1000, description: 'Requests allowed per minute' })
    // rateLimitPerMinute!: number;
}
