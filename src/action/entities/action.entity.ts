import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmergencyEntity } from 'src/emergency/entities/emergency.entity';

@Entity({ name: 'action' })
export class ActionEntity extends BaseEntity {
  
  @Column({ name: 'description', type: 'varchar', length: 255, nullable: false })
  description: string;
  
  @Column({ name: 'date', type: 'date', nullable: false })
  date: Date;
  
  @Column({ name: 'hour', type: 'varchar', length: 10, nullable: false })
  hour: string;
  
  @ManyToOne(() => EmergencyEntity, (emergency) => emergency.actions, { nullable: false, onDelete: 'CASCADE' })
  emergency: EmergencyEntity;
}
