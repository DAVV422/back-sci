import { Column, Entity, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { ROLES } from '../../common/constants';
import { MAP_TYPES, MapType } from '../map-type';
import { EmergencyEntity } from '../../organization_module/emergency/entities/emergency.entity';
import { AttendEntity } from '../../organization_module/attends/entities/attends.entity';
import { RefreshTokenEntity } from '../../auth/entities/refresh-token.entity';
import { AuthTokenEntity } from '../../auth/entities/auth-token.entity';
import { IUser } from '../interfaces/user.interface';

@Entity({ name: 'user' })
export class UserEntity extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: false })
  lastName: string;

  @Column({ name: 'password', type: 'varchar', length: 255, nullable: false })
  @Exclude()
  password: string;

  @Column({ name: 'cellphone', type: 'varchar', length: 20, nullable: true })
  cellphone?: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 100,
    nullable: false,
    unique: true,
  })
  email: string;

  @Column({ name: 'grade', type: 'varchar', length: 50, nullable: true })
  grade?: string;

  @Column({ name: 'birthdate', type: 'date', nullable: true })
  birthdate?: Date;

  @Column({ name: 'url_image', type: 'varchar', nullable: true })
  urlImage?: string;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  /**
   * Cuándo entró en funcionamiento la cuenta. Nulo = **nunca se activó**.
   *
   * Hace falta porque `isActive: false` significa dos cosas muy distintas: una cuenta recién creada
   * que espera su invitación, y una cuenta que un administrador suspendió. Sin separarlas, corregir
   * el correo de una cuenta suspendida (o eliminada) le habría mandado una invitación para volver a
   * entrar. Con esta marca, "pendiente de activación" es una condición positiva y no la ausencia de
   * otra cosa.
   */
  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt?: Date | null;

  @Column({ name: 'is_operational', type: 'boolean', default: true })
  isOperational: boolean;

  @Column({
    name: 'role',
    type: 'enum',
    enum: ROLES,
    default: ROLES.BASIC,
  })
  role: ROLES;

  /** Preferencia del usuario: vista con la que abren los mapas (mapa normal o satelital). */
  @Column({ name: 'map_type', type: 'enum', enum: MAP_TYPES, default: 'roadmap' })
  mapType: MapType;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @OneToMany(() => EmergencyEntity, (emergency) => emergency.user)
  emergencies: EmergencyEntity[];

  @OneToMany(() => AttendEntity, (attend) => attend.user)
  attends: AttendEntity[];

  @OneToMany(() => RefreshTokenEntity, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshTokenEntity[];

  @OneToMany(() => AuthTokenEntity, (authToken) => authToken.user)
  authTokens: AuthTokenEntity[];
}
