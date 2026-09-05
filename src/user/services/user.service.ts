import { Repository } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';

import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UpdateProfileDto,
  AdminUserDto,
} from '../dto/';
import { UserEntity } from '../entities/user.entity';
import { handlerError } from '../../common/utils/handlerError.utils';
import { QueryDto } from '../../common/dto/query.dto';
import {
  ApiResponse,
  PaginatedResult,
} from '../../common/interfaces/responseMessage.interface';
import {
  USER_ALLOWED_ATTRS,
  validateAllowedAttrs,
} from '../../common/decorators/allowed-query-attrs.decorator';
import { FRONTEND_ROUTES, ROLES } from '../../common/constants';
import { EmailService } from '../../common/services/email.service';
import { AuthTokenService } from '../../auth/services/auth-token.service';
import { AuthTokenType } from '../../auth/entities/auth-token.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => AuthTokenService))
    private readonly authTokenService: AuthTokenService,
    private readonly configService: ConfigService,
  ) { }

  public async findAll(
    queryDto: QueryDto,
    currentUserRole?: string,
  ): Promise<PaginatedResult<UserEntity>> {
    this.logger.log(`[findAll] Consultando lista de usuarios.`);
    try {
      const { limit, offset, order, attr, value } = queryDto;
      validateAllowedAttrs(attr, USER_ALLOWED_ATTRS);
      const query = this.userRepository.createQueryBuilder('user');
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      if (order)
        query.orderBy('user.createdAt', order.toLocaleUpperCase() as any);
      if (attr && value)
        query.andWhere(`user.${attr} ILIKE :value`, { value: `%${value}%` });
      query.andWhere('user.is_deleted = false');
      if (currentUserRole?.toLowerCase() !== ROLES.SUADMIN) {
        query.andWhere('user.role != :suadminRole', { suadminRole: ROLES.SUADMIN });
      }
      const [items, total] = await query.getManyAndCount();
      this.logger.log(`[findAll] Usuarios encontrados: total=${total}, devueltos=${items.length}`);
      return { items, total };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findAllAdmin(
    queryDto: QueryDto,
    currentUserRole?: string,
  ): Promise<PaginatedResult<AdminUserDto>> {
    this.logger.log(`[findAllAdmin] Consultando lista de usuarios con auditoría para SUADMIN/ADMIN.`);
    try {
      const { limit, offset, order, attr, value } = queryDto;
      validateAllowedAttrs(attr, USER_ALLOWED_ATTRS);
      const query = this.userRepository.createQueryBuilder('user');
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      if (order)
        query.orderBy('user.createdAt', order.toLocaleUpperCase() as any);
      if (attr && value)
        query.andWhere(`user.${attr} ILIKE :value`, { value: `%${value}%` });
      query.andWhere('user.is_deleted = false');
      if (currentUserRole?.toLowerCase() !== ROLES.SUADMIN) {
        query.andWhere('user.role != :suadminRole', { suadminRole: ROLES.SUADMIN });
      }
      const [items, total] = await query.getManyAndCount();
      const adminUsers = items.map((user) => new AdminUserDto(user));
      this.logger.log(`[findAllAdmin] Usuarios de auditoría encontrados: total=${total}, devueltos=${adminUsers.length}`);
      return { items, total };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async createUser(
    createUserDto: CreateUserDto,
    currentUserRole?: string,
  ): Promise<UserEntity> {
    if (createUserDto.role && typeof createUserDto.role === 'string') {
      createUserDto.role = (createUserDto.role as string).toLowerCase() as ROLES;
    }
    if (createUserDto.role === ROLES.SUADMIN && currentUserRole?.toLowerCase() !== ROLES.SUADMIN) {
      throw new ForbiddenException('No tienes permisos para crear un usuario Super Administrador.');
    }
    this.logger.log(`[createUser] Creando nuevo usuario. email=${createUserDto.email}, role=${createUserDto.role}`);
    try {
      const rawPassword = createUserDto.password || randomBytes(12).toString('hex') + '!1A';
      createUserDto.password = await this.encryptPassword(rawPassword);
      if (createUserDto.birthdate) {
        createUserDto.birthdate = new Date(createUserDto.birthdate);
      }

      const isActive = createUserDto.isActive ?? false;

      await this.userRepository.save({
        ...createUserDto,
        isActive,
      });

      const created = await this.findOneBy({ key: 'email', value: createUserDto.email });

      if (!isActive) {
        // Generar token de activación
        const expiryHours = Number(this.configService.get<number>('ACTIVATION_TOKEN_EXPIRY_HOURS')) || 72;
        const rawToken = await this.authTokenService.createToken(
          created,
          AuthTokenType.ACTIVATION,
          expiryHours,
        );

        // Construir URL de activación
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
        const activationUrl = `${frontendUrl}${FRONTEND_ROUTES.ACTIVATE_ACCOUNT}?token=${rawToken}`;

        // Enviar email de activación
        await this.emailService.sendActivationEmail(
          created.email,
          `${created.name} ${created.lastName}`,
          activationUrl,
        );

        this.logger.log(`[createUser] Usuario creado e email de activación enviado. id=${created.id}, email=${created.email}`);
      } else {
        this.logger.log(`[createUser] Usuario creado directamente activo. id=${created.id}, email=${created.email}`);
      }
      return created;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOne(id: string): Promise<UserEntity> {
    this.logger.log(`[findOne] Buscando usuario por ID. id=${id}`);
    try {
      const user: UserEntity = await this.userRepository.findOne({
        where: { id },
      });
      if (!user) {
        this.logger.warn(`[findOne] Usuario no encontrado. id=${id}`);
        throw new NotFoundException('Usuario no encontrado.');
      }
      return user;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByEmail(email: string): Promise<UserEntity> {
    this.logger.log(`[findByEmail] Buscando usuario por email. email=${email}`);
    try {
      const user: UserEntity = await this.userRepository.findOne({
        where: { email },
      });
      if (!user) {
        this.logger.warn(`[findByEmail] Usuario no encontrado. email=${email}`);
        throw new NotFoundException('Usuario no encontrado.');
      }
      return user;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserRole?: string,
  ): Promise<UserEntity> {
    if (updateUserDto.role && typeof updateUserDto.role === 'string') {
      updateUserDto.role = (updateUserDto.role as string).toLowerCase() as ROLES;
    }
    this.logger.log(`[update] Actualizando datos de usuario (ADMIN). id=${id}`);
    try {
      const user: UserEntity = await this.findOne(id);
      if (user.role === ROLES.SUADMIN && currentUserRole?.toLowerCase() !== ROLES.SUADMIN) {
        throw new ForbiddenException('No tienes permisos para modificar a un usuario Super Administrador.');
      }
      if (updateUserDto.role === ROLES.SUADMIN && currentUserRole?.toLowerCase() !== ROLES.SUADMIN) {
        throw new ForbiddenException('No tienes permisos para asignar el rol Super Administrador.');
      }
      if (updateUserDto.password)
        updateUserDto.password = await this.encryptPassword(
          updateUserDto.password,
        );
      const userUpdated = await this.userRepository.update(
        user.id,
        updateUserDto,
      );
      if (userUpdated.affected === 0) {
        this.logger.warn(`[update] Usuario no actualizado. id=${id}`);
        throw new NotFoundException('Usuario no actualizado.');
      }
      this.logger.log(`[update] Usuario actualizado exitosamente. id=${id}`);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserEntity> {
    this.logger.log(`[updateProfile] Actualizando perfil propio. id=${id}`);
    try {
      await this.findOne(id);
      const editableFields: Partial<UpdateProfileDto> = {
        ...(updateProfileDto.name !== undefined && {
          name: updateProfileDto.name,
        }),
        ...(updateProfileDto.lastName !== undefined && {
          lastName: updateProfileDto.lastName,
        }),
        ...(updateProfileDto.cellphone !== undefined && {
          cellphone: updateProfileDto.cellphone,
        }),
      };
      const userUpdated = await this.userRepository.update(id, editableFields);
      if (userUpdated.affected === 0) {
        this.logger.warn(`[updateProfile] Perfil no actualizado. id=${id}`);
        throw new BadRequestException('Perfil no actualizado.');
      }
      this.logger.log(`[updateProfile] Perfil actualizado exitosamente. id=${id}`);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async updateStatus(
    id: string,
    updateUserStatusDto: UpdateUserStatusDto,
    currentUserRole?: string,
  ): Promise<UserEntity> {
    this.logger.log(`[updateStatus] Cambiando estado de usuario. id=${id}, isActive=${updateUserStatusDto.isActive}`);
    try {
      const user = await this.findOne(id);
      if (user.role === ROLES.SUADMIN && currentUserRole?.toLowerCase() !== ROLES.SUADMIN) {
        throw new ForbiddenException('No tienes permisos para modificar a un usuario Super Administrador.');
      }
      const userUpdated = await this.userRepository.update(id, {
        isActive: updateUserStatusDto.isActive,
      });
      if (userUpdated.affected === 0) {
        this.logger.warn(`[updateStatus] No se pudo cambiar estado. id=${id}`);
        throw new BadRequestException(
          'No se pudo cambiar el estado del usuario.',
        );
      }
      this.logger.log(`[updateStatus] Estado actualizado con éxito. id=${id}, active=${updateUserStatusDto.isActive}`);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(
    id: string,
    currentUserRole?: string,
  ): Promise<ApiResponse<null>> {
    this.logger.log(`[delete] Desactivando/eliminando usuario (soft-delete). id=${id}`);
    try {
      const user = await this.findOne(id);
      if (user.role === ROLES.SUADMIN && currentUserRole?.toLowerCase() !== ROLES.SUADMIN) {
        throw new ForbiddenException('No tienes permisos para eliminar a un usuario Super Administrador.');
      }
      user.isDeleted = true;
      const deletedUser = await this.userRepository.update(user.id, user);
      if (deletedUser.affected === 0) {
        this.logger.warn(`[delete] Usuario no eliminado. id=${id}`);
        throw new BadRequestException('Usuario no eliminado.');
      }
      this.logger.log(`[delete] Usuario eliminado exitosamente. id=${id}`);
      return {
        success: true,
        statusCode: 200,
        message: 'Usuario eliminado.',
        data: null,
      };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOneBy({
    key,
    value,
  }: {
    key: keyof CreateUserDto;
    value: any;
  }) {
    try {
      const user: UserEntity = await this.userRepository.findOne({
        where: { [key]: value },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado.');
      return user;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOneAuth(id: string): Promise<UserEntity> {
    try {
      const user: UserEntity = await this.userRepository.findOne({
        where: { id },
      });
      if (!user)
        throw new UnauthorizedException(
          'Usuario asociado al token no encontrado.',
        );
      return user;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async countUsers(): Promise<number> {
    return await this.userRepository.count();
  }

  private async encryptPassword(password: string): Promise<string> {
    const saltRounds = Number(this.configService.get<string>('HASH_SALT')) || 10;
    return bcrypt.hash(password, saltRounds);
  }
}
