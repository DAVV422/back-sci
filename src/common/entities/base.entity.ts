import { Column } from 'typeorm';
import { CreateDateColumn } from 'typeorm/decorator/columns/CreateDateColumn';
import { PrimaryGeneratedColumn } from 'typeorm/decorator/columns/PrimaryGeneratedColumn';
import { UpdateDateColumn } from 'typeorm/decorator/columns/UpdateDateColumn';
import { Exclude } from 'class-transformer';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  @Exclude()
  isDeleted: boolean;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'updated_at',
  })
  updatedAt: Date;
}
