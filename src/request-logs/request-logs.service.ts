import { Injectable } from '@nestjs/common';
import { CreateRequestLogDto } from './dto/create-request-log.dto';
import { UpdateRequestLogDto } from './dto/update-request-log.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestLog } from './entities/request-log.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RequestLogsService {
  constructor(
    @InjectRepository(RequestLog)
    private requestLogRepository: Repository<RequestLog>
  ) {}

  async countRequestsInWindow(apiKeyId: string, windowSeconds: number): Promise<number> {
    const windowStart = new Date(Date.now() - windowSeconds * 1000);

    return this.requestLogRepository
      .createQueryBuilder('log')
      .where('log.apiKeyId = :apiKeyId', { apiKeyId })
      .andWhere('log.created_at >= :windowStart', { windowStart })
      .getCount();
  }

  async logRequest(apiKeyId: string): Promise<void> {
    const log = this.requestLogRepository.create({ apiKeyId });
    await this.requestLogRepository.save(log);
  }

  create(createRequestLogDto: CreateRequestLogDto) {
    return 'This action adds a new requestLog';
  }

  findAll() {
    return `This action returns all requestLogs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} requestLog`;
  }

  update(id: number, updateRequestLogDto: UpdateRequestLogDto) {
    return `This action updates a #${id} requestLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} requestLog`;
  }
}
