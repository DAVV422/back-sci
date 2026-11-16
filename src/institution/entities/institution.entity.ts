import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * La institución dueña de esta instalación (una sola fila). Cada despliegue atiende a una
 * institución: el nombre y el logo distinguen una copia de otra. Los valores iniciales salen
 * de `INSTITUTION_NAME` / `INSTITUTION_SHORT_NAME` del entorno la primera vez que arranca;
 * después los administra el Admin desde la aplicación, sin tocar el servidor.
 */
@Entity({ name: 'institution' })
export class InstitutionEntity extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  /** Sigla o nombre corto para espacios chicos (barra lateral, encabezados). */
  @Column({ name: 'short_name', type: 'varchar', length: 40, nullable: true })
  shortName?: string | null;

  /** Archivo del logo en el almacenamiento (`uploads/branding/<archivo>`); nulo si no hay. */
  @Column({ name: 'logo_file_name', type: 'varchar', length: 255, nullable: true })
  logoFileName?: string | null;
}
