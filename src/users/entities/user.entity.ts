import { ApiKey } from "src/api-keys/entities/api-key.entity";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    password!: string;

    @Column({ nullable: true })
    refreshToken?: string;

    @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
    apiKeys!: ApiKey[];

    @CreateDateColumn()
    createdAt!: Date
}
