import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EmergencyEntity } from '../../../organization_module/emergency/entities/emergency.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { ActionEntity } from './action.entity';

@Entity({ name: 'audio' })
export class AudioEntity extends BaseEntity {
  @Column({
    name: 'path_audio',
    type: 'varchar',
    length: 500,
    nullable: false,
    comment:
      'Ruta local o relativa del archivo (ej. data/audios/{userId}/{emergencyId}/{filename})',
  })
  pathAudio: string;

  @Column({
    name: 'duration',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
    comment: 'Duración del audio en segundos',
  })
  duration: number;

  @Column({
    name: 'processed',
    type: 'boolean',
    default: false,
    comment: 'Indica si el audio ya fue procesado por el pipeline de NLP',
  })
  processed: boolean;

  @Column({
    name: 'file_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Nombre del archivo generado o recibido',
  })
  fileName?: string;

  @Column({
    name: 'mime_type',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment:
      'Formato MIME del audio (ej. audio/m4a, audio/mp3, audio/aac, audio/wav, audio/ogg)',
  })
  mimeType?: string;

  @Column({
    name: 'size_bytes',
    type: 'bigint',
    nullable: true,
    comment: 'Tamaño del archivo en bytes',
  })
  sizeBytes?: number;

  @Column({
    name: 'transcription',
    type: 'text',
    nullable: true,
    comment: 'Texto transcrito por el motor Speech-to-Text / Whisper',
  })
  transcription?: string;

  @Column({
    name: 'nlp_extracted_data',
    type: 'jsonb',
    nullable: true,
    comment: 'Entidades e intenciones estructuradas extraídas por el NLP',
  })
  nlpExtractedData?: Record<string, any>;

  @Column({
    name: 'client_generated_id',
    type: 'uuid',
    unique: true,
    nullable: true,
    comment: 'Identificador único offline generado por el cliente móvil',
  })
  clientGeneratedId?: string;

  @OneToOne(() => ActionEntity, (action) => action.audio, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  action?: ActionEntity;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => EmergencyEntity, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'emergency_id' })
  emergency: EmergencyEntity;
}
