import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['apiKeyId', 'hourBucket']) // one row per key per hour
@Index(['hourBucket'])           // speeds up time-range queries across all keys
@Index(['apiKeyId', 'hourBucket']) // speeds up per-key time-range queries
export class AnalyticsRollup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  apiKeyId!: string;

  @Column({ type: 'timestamptz' })
  hourBucket!: Date; // floored to the hour: 12:00:00, 13:00:00, etc.

  @Column({ type: 'int', default: 0 })
  totalRequests!: number; // allowed requests in this hour

  @Column({ type: 'int', default: 0 })
  totalRejections!: number; // rejected requests in this hour

  @Column({ type: 'timestamptz' })
  updatedAt!: Date;
}