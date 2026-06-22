import { User } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    key!: string;

    @Column()
    name!: string;

    @Column({ default: 1000 })
    rateLimitPerMinute!: number;

    @ManyToOne(() => User, (user) => user.apiKeys)
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;
}
