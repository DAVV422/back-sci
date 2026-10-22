import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EmergencyEntity } from '../../emergency/entities/emergency.entity';
import { ResourceEntity } from '../../resource/entities/resource.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { VehicleEntity } from './vehicle.entity';

/**
 * Un vehículo despachado a una emergencia, con el equipo que llevó (los `ResourceEntity` ligados).
 * Un vehículo no puede tener dos despachos activos: índice único parcial sobre `vehicle_id`
 * mientras `returned_at` sea nulo.
 */
@Entity({ name: 'vehicle_dispatch' })
@Index('uq_vehicle_dispatch_active', ['vehicle'], { unique: true, where: 'returned_at IS NULL AND is_deleted = false' })
export class VehicleDispatchEntity extends BaseEntity {
  @ManyToOne(() => VehicleEntity, (vehicle) => vehicle.dispatches, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: VehicleEntity;

  @ManyToOne(() => EmergencyEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'emergency_id' })
  emergency: EmergencyEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dispatched_by' })
  dispatchedBy?: UserEntity | null;

  @Column({ name: 'note', type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  /** Cuándo volvió el vehículo; nulo mientras sigue en la emergencia. */
  @Column({ name: 'returned_at', type: 'timestamptz', nullable: true })
  returnedAt?: Date | null;

  @OneToMany(() => ResourceEntity, (resource) => resource.vehicleDispatch)
  resources: ResourceEntity[];
}
