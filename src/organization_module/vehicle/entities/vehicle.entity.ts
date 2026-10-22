import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { VehicleLoadItemEntity } from './vehicle-load-item.entity';
import { VehicleDispatchEntity } from './vehicle-dispatch.entity';

export const VEHICLE_STATUSES = ['available', 'out_of_service'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

/**
 * Vehículo de la institución (autobomba, ambulancia, rescate...) con su carga estándar: el equipo
 * que lleva siempre a bordo. "En emergencia" no es un estado guardado: se deriva de tener un
 * despacho activo (ver `VehicleDispatchEntity`).
 */
@Entity({ name: 'vehicle' })
@Index('uq_vehicle_code', ['code'], { unique: true, where: 'is_deleted = false' })
export class VehicleEntity extends BaseEntity {
  /** Código operativo, el que se usa por radio (ej. AB-3). */
  @Column({ name: 'code', type: 'varchar', length: 20 })
  code: string;

  /** Tipo de vehículo (ej. Autobomba, Ambulancia, Rescate). */
  @Column({ name: 'vehicle_type', type: 'varchar', length: 50 })
  vehicleType: string;

  @Column({ name: 'plate', type: 'varchar', length: 20, nullable: true })
  plate?: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'available' })
  status: VehicleStatus;

  @Column({ name: 'notes', type: 'varchar', length: 255, nullable: true })
  notes?: string | null;

  @OneToMany(() => VehicleLoadItemEntity, (item) => item.vehicle, { cascade: true })
  load: VehicleLoadItemEntity[];

  @OneToMany(() => VehicleDispatchEntity, (dispatch) => dispatch.vehicle)
  dispatches: VehicleDispatchEntity[];
}
