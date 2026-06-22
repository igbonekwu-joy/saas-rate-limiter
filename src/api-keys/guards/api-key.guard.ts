import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ApiKey } from "../entities/api-key.entity";
import { Repository } from "typeorm";

@Injectable()
export class ApiKeyGuard {
    constructor(
        @InjectRepository(ApiKey)
        private apiKeyRepository: Repository<ApiKey>
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const providedKey = request.headers['x-api-key'];

        if(!providedKey) {
            throw new UnauthorizedException('Missing API key');
        }

        const apiKey = await this.apiKeyRepository.findOne({ 
            where: { key: providedKey },
            relations: { user: true }
        });

        if(!apiKey) {
            throw new UnauthorizedException('Invalid API key');
        }

        request.apiKey = apiKey;

        return true;
    }
}