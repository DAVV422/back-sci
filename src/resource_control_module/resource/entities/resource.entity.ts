import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmergencyEntity } from '../../emergency/entities/emergency.entity';
import { EquipmentEntity } from '../../equipment/entities/equipment.entity';

@Entity({ name: 'resource' })
export class ResourceEntity extends BaseEntity {

  @Column({ name: 'state_initial', type: 'varchar', length: 255, nullable: false })
  state_initial: string;

  @Column({ name: 'state_end', type: 'varchar', length: 255, nullable: false })
  state_end: string;

  @Column({ name: 'date', type: 'date', nullable: false })
  date: Date;

  @Column({ name: 'hour', type: 'varchar', length: 5, nullable: false })
  hour: string;

  @ManyToOne(() => EmergencyEntity, (emergency) => emergency.resources, { nullable: false, onDelete: 'CASCADE' })
  emergency: EmergencyEntity;

  @ManyToOne(() => EquipmentEntity, (equipment) => equipment.resources, { nullable: false, onDelete: 'CASCADE' })
  equipment: EquipmentEntity;
}
