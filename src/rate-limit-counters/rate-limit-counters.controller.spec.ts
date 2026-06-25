import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitCountersController } from './rate-limit-counters.controller';
import { RateLimitCountersService } from './rate-limit-counters.service';

describe('RateLimitCountersController', () => {
  let controller: RateLimitCountersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RateLimitCountersController],
      providers: [RateLimitCountersService],
    }).compile();

    controller = module.get<RateLimitCountersController>(RateLimitCountersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
