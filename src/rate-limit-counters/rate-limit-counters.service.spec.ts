import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitCountersService } from './rate-limit-counters.service';

describe('RateLimitCountersService', () => {
  let service: RateLimitCountersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitCountersService],
    }).compile();

    service = module.get<RateLimitCountersService>(RateLimitCountersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
