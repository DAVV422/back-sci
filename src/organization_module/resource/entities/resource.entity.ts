import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EmergencyEntity } from '../../../organization_module/emergency/entities/emergency.entity';
import { EquipmentEntity } from '../../../organization_module/equipment/entities/equipment.entity';
import { VehicleDispatchEntity } from '../../vehicle/entities/vehicle-dispatch.entity';

@Entity({ name: 'resource' })
export class ResourceEntity extends BaseEntity {
  @Column({ name: 'amount', type: 'int', nullable: false })
  amount: number;

  @Column({ name: 'note', type: 'varchar', length: 255, nullable: true })
  note: string;

  @Column({ name: 'amount_returned', type: 'int', default: 0 })
  amount_returned: number;

  @ManyToOne(() => EmergencyEntity, (emergency) => emergency.resources, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  emergency: EmergencyEntity;

  @ManyToOne(() => EquipmentEntity, (equipment) => equipment.resources, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  equipment: EquipmentEntity;

  /** Si el equipo fue a bordo de un vehículo, ese despacho; nulo si se despachó suelto. */
  @ManyToOne(() => VehicleDispatchEntity, (dispatch) => dispatch.resources, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_dispatch_id' })
  vehicleDispatch?: VehicleDispatchEntity | null;
}
