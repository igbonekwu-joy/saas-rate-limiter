import { User } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

export enum Plan {
    FREE = 'free',
    PAID = 'paid'
};

@Entity()
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    key!: string;

    @Column()
    name!: string;

    @Column({ type: 'enum', enum: Plan, default: Plan.FREE })
    plan!: Plan;

    // per minute limit
    @Column({ default: 100 })
    rateLimitPerMinute!: number;

    // burst limit (per-second limit)
    @Column({ default: 20 })
    burstLimitPerSecond!: number;

    @ManyToOne(() => User, (user) => user.apiKeys)
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;
}
