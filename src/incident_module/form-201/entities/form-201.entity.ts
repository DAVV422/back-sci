import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SituationMap } from '../situation-map';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EmergencyEntity } from '../../../organization_module/emergency/entities/emergency.entity';
import { UserEntity } from '../../../user/entities/user.entity';

@Entity({ name: 'form201' })
// Un solo F201 abierto por emergencia. Al traspasar el mando se finaliza y el nuevo CI abre el
// suyo (decisión 24: el traspaso cierra el periodo). Nombre nuevo para que `synchronize`
// elimine el índice anterior, que impedía más de un F201 en toda la vida de la emergencia.
@Index('uq_form201_open_per_emergency', ['emergency'], {
  unique: true,
  where: 'is_deleted = false AND is_finalized = false',
})
export class Form201Entity extends BaseEntity {
  @Column({ name: 'code', type: 'varchar', length: 15, nullable: false })
  code: string;

  @Column({ name: 'date', type: 'date', nullable: false })
  date: Date;

  @Column({ name: 'nature', type: 'varchar', length: 150, nullable: false })
  nature: string;

  @Column({ name: 'thread', type: 'text', nullable: false })
  thread: string;

  @Column({ name: 'affected_area', type: 'varchar', length: 255, nullable: false })
  affectedArea: string;

  @Column({
    name: 'communications_channel',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  communicationsChannel: string;

  @Column({ name: 'entry_route', type: 'varchar', length: 255, nullable: false })
  entryRoute: string;

  @Column({ name: 'egress_route', type: 'varchar', length: 255, nullable: false })
  egressRoute: string;

  @Column({
    name: 'affected_areas_map_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  affectedAreasMapUrl?: string;

  /** Casilla 12: imagen del croquis (nombre en el almacenamiento; se sirve en GET /form201/:id/croquis). */
  @Column({ name: 'croquis_image', type: 'varchar', length: 255, nullable: true })
  croquisImage?: string | null;

  /** Casilla 12: mapa de situación dibujado (perímetro y símbolos SCI). Ver `situation-map.ts`. */
  @Column({ name: 'situation_map', type: 'jsonb', nullable: true })
  situationMap?: SituationMap | null;

  @Column({ name: 'objectives', type: 'text', nullable: false })
  objectives: string;

  @Column({ name: 'strategies', type: 'text', nullable: false })
  strategies: string;

  @Column({ name: 'tactics', type: 'text', nullable: false })
  tactics: string;

  @Column({ name: 'safety_message', type: 'varchar', length: 500, nullable: false })
  safetyMessage: string;

  @Column({ name: 'organization_chart', type: 'jsonb', nullable: false })
  organizationChart: Record<string, any>;

  @Column({ name: 'is_finalized', type: 'boolean', default: false })
  isFinalized: boolean;

  /** Casilla 2: fecha y hora de preparación (instante UTC). Si no se indica, la de creación. */
  @Column({ name: 'prepared_at', type: 'timestamp', nullable: true })
  preparedAt?: Date | null;

  /** Cierre del 201 (fin del periodo de ese mando): acota su resumen de acciones (casilla 13). */
  @Column({ name: 'finalized_at', type: 'timestamp', nullable: true })
  finalizedAt?: Date | null;

  @Column({
    name: 'client_generated_id',
    type: 'uuid',
    unique: true,
    nullable: true,
  })
  clientGeneratedId?: string;

  @ManyToOne(() => EmergencyEntity, (emergency) => emergency.form201, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'emergency_id' })
  emergency: EmergencyEntity;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
