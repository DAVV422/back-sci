import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Form201Entity } from '../../form-201/entities/form-201.entity';

@Entity({ name: 'action' })
export class ActionEntity extends BaseEntity {
  
  @Column({ name: 'description', type: 'varchar', length: 255, nullable: false })
  description: string;
  
  @Column({ name: 'date', type: 'date', nullable: false })
  date: Date;
  
  @Column({ name: 'hour', type: 'varchar', length: 10, nullable: false })
  hour: string;
  
  @ManyToOne(() => Form201Entity, (form201) => form201.actions, { nullable: false, onDelete: 'CASCADE' })
  form201: Form201Entity;
}
