import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column({ default: 1000 })
    rateLimitPerMinute!: number;

    @CreateDateColumn()
    createdAt!: Date;
}
