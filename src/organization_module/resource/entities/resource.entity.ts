import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EmergencyEntity } from '../../../organization_module/emergency/entities/emergency.entity';
import { EquipmentEntity } from '../../../organization_module/equipment/entities/equipment.entity';

@Entity({ name: 'resource' })
export class ResourceEntity extends BaseEntity {

  @Column({ name: 'amount', type: 'int', nullable: false })
  amount: number;

  @Column({ name: 'note', type: 'varchar', length: 255, nullable: false })
  note: string;

  @ManyToOne(() => EmergencyEntity, (emergency) => emergency.resources, { nullable: false, onDelete: 'CASCADE' })
  emergency: EmergencyEntity;

  @ManyToOne(() => EquipmentEntity, (equipment) => equipment.resources, { nullable: false, onDelete: 'CASCADE' })
  equipment: EquipmentEntity;
}
