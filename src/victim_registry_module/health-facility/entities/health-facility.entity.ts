import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Centro de salud de destino de un traslado del SCI-207 (casilla 7, "Lugar de traslado").
 * Se crean sobre la marcha al registrar un traslado (decisión 27) y alimentan el
 * autocompletado, para que "Hospital del Niño" y "hospital del niño " sean el mismo destino.
 */
@Entity('health_facility')
@Index('uq_health_facility_normalized_name', ['normalizedName'], {
  unique: true,
  where: 'is_deleted = false',
})
export class HealthFacilityEntity extends BaseEntity {
  /** Como lo escribió quien lo registró por primera vez. */
  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  /** Minúsculas, sin tildes y con espacios simples: clave de unicidad y de búsqueda. */
  @Column({ name: 'normalized_name', type: 'varchar', length: 150 })
  normalizedName: string;
}
