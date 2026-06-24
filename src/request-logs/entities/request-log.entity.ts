import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class RequestLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column()
    apiKeyId!: string;

    @CreateDateColumn()
    createdAt!: Date
}
