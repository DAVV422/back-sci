import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { EmergencyEntity } from '../../organization_module/emergency/entities/emergency.entity';

export type NotificationType =
  | 'ci_change'
  | 'form_finalized'
  | 'emergency_state_change'
  | 'sync_conflict'
  | 'resource_assigned'
  | 'assignment';

@Entity('notification')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, nullable: false })
  type: NotificationType;

  @Column({ name: 'title', type: 'varchar', length: 100, nullable: false })
  title: string;

  @Column({ name: 'message', type: 'varchar', length: 255, nullable: false })
  message: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  /** Emergencia a la que se refiere (para abrirla desde el centro de notificaciones). */
  @ManyToOne(() => EmergencyEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'emergency_id' })
  emergency?: EmergencyEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
