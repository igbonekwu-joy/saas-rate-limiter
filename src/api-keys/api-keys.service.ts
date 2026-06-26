import { Injectable } from '@nestjs/common';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiKey, Plan } from './entities/api-key.entity';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { PLAN_LIMITS } from './config/plans.config';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>
  ){}

  async create(createApiKeyDto: CreateApiKeyDto, userId: string) {
    const plan = (createApiKeyDto.plan as Plan) ?? Plan.FREE;
    const limits = PLAN_LIMITS[plan];

    const apiKey = this.apiKeyRepository.create({
      key: randomBytes(32).toString('hex'),
      name: createApiKeyDto.name,
      plan,
      rateLimitPerMinute: limits.rateLimitPerMinute,
      burstLimitPerSecond: limits.burstLimitPerSecond,
      user: { id: userId },
    });

    // const apiKey = this.apiKeyRepository.create({
    //   key: randomBytes(32).toString('hex'),
    //   name: createApiKeyDto.name,
    //   rateLimitPerMinute: createApiKeyDto.rateLimitPerMinute,
    //   user: { id: userId }
    // })

    return this.apiKeyRepository.save(apiKey);
  }

  findAll() {
    return `This action returns all apiKeys`;
  }

  findOne(id: number) {
    return `This action returns a #${id} apiKey`;
  }

  update(id: number, updateApiKeyDto: UpdateApiKeyDto) {
    return `This action updates a #${id} apiKey`;
  }

  remove(id: number) {
    return `This action removes a #${id} apiKey`;
  }
}
