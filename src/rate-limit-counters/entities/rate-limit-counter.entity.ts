import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity()
@Unique(['apiKeyId', 'bucketTime'])
export class RateLimitCounter {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column()
    apiKeyId!: string;

    @Column({ type: 'timestamptz' })
    bucketTime!: Date; // start time of the bucket

    @Column({ type: 'int', default: 0 })
    count!: number;
}