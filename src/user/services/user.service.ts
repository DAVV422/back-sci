import { Repository, SelectQueryBuilder } from 'typeorm';
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
  BulkUpdateGradeDto,
  UserQueryDto,
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

  private applyUserFilters(
    query: SelectQueryBuilder<UserEntity>,
    queryDto: UserQueryDto,
  ): void {
    const {
      attr,
      value,
      search,
      name,
      lastName,
      email,
      role,
      grade,
      isActive,
      isOperational,
    } = queryDto;

    // 1. Retrocompatibilidad: attr y value dinámico
    if (attr) {
      validateAllowedAttrs(attr, USER_ALLOWED_ATTRS);
      if (value !== undefined && value !== null && value !== '') {
        query.andWhere(`user.${attr} ILIKE :value`, {
          value: `%${value}%`,
        });
      }
    }

    // 2. Búsqueda global por texto (search)
    if (search && search.trim() !== '') {
      query.andWhere(
        '(user.name ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    // 3. Filtros específicos combinables
    if (name && name.trim() !== '') {
      query.andWhere('user.name ILIKE :filterName', {
        filterName: `%${name.trim()}%`,
      });
    }

    if (lastName && lastName.trim() !== '') {
      query.andWhere('user.lastName ILIKE :filterLastName', {
        filterLastName: `%${lastName.trim()}%`,
      });
    }

    if (email && email.trim() !== '') {
      query.andWhere('user.email ILIKE :filterEmail', {
        filterEmail: `%${email.trim()}%`,
      });
    }

    if (role) {
      query.andWhere('user.role = :filterRole', {
        filterRole: (role as string).toLowerCase(),
      });
    }

    if (grade && grade.trim() !== '') {
      query.andWhere('user.grade ILIKE :filterGrade', {
        filterGrade: `%${grade.trim()}%`,
      });
    }

    if (isActive !== undefined) {
      query.andWhere('user.isActive = :filterIsActive', {
        filterIsActive: isActive,
      });
    }

    if (isOperational !== undefined) {
      query.andWhere('user.isOperational = :filterIsOperational', {
        filterIsOperational: isOperational,
      });
    }
  }

  public async findAll(
    queryDto: UserQueryDto,
    currentUserRole?: string,
  ): Promise<PaginatedResult<UserEntity>> {
    this.logger.log(`[findAll] Consultando lista de usuarios con filtros.`);
    try {
      const { limit, offset, order } = queryDto;
      const query = this.userRepository.createQueryBuilder('user');
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      if (order)
        query.orderBy('user.createdAt', order.toLocaleUpperCase() as any);

      this.applyUserFilters(query, queryDto);

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
    queryDto: UserQueryDto,
    currentUserRole?: string,
  ): Promise<PaginatedResult<AdminUserDto>> {
    this.logger.log(`[findAllAdmin] Consultando lista de usuarios con auditoría para SUADMIN/ADMIN.`);
    try {
      const { limit, offset, order } = queryDto;
      const query = this.userRepository.createQueryBuilder('user');
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      if (order)
        query.orderBy('user.createdAt', order.toLocaleUpperCase() as any);

      this.applyUserFilters(query, queryDto);

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

      const requireEmailActivation =
        this.configService.get<string>('REQUIRE_EMAIL_ACTIVATION') === 'true';
      const isActive = createUserDto.isActive ?? !requireEmailActivation;
      const isOperational = createUserDto.isOperational ?? true;

      await this.userRepository.save({
        ...createUserDto,
        isActive,
        isOperational,
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

  public async findOne(id: string, currentUserRole?: string): Promise<UserEntity> {
    this.logger.log(`[findOne] Buscando usuario por ID. id=${id}`);
    try {
      const user: UserEntity = await this.userRepository.findOne({
        where: { id },
      });
      if (!user) {
        this.logger.warn(`[findOne] Usuario no encontrado. id=${id}`);
        throw new NotFoundException('Usuario no encontrado.');
      }
      if (
        user.role === ROLES.SUADMIN &&
        currentUserRole &&
        currentUserRole.toLowerCase() !== ROLES.SUADMIN
      ) {
        this.logger.warn(
          `[findOne] Acceso denegado: intento de consultar un SUADMIN por rol no autorizado. id=${id}`,
        );
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

      // Regla de negocio: Admin/Suadmin puede editar email, role, isActive, isOperational, grade (y password)
      const allowedUpdates: Partial<UserEntity> = {};
      if (updateUserDto.email !== undefined) allowedUpdates.email = updateUserDto.email;
      if (updateUserDto.role !== undefined) allowedUpdates.role = updateUserDto.role;
      if (updateUserDto.isActive !== undefined) allowedUpdates.isActive = updateUserDto.isActive;
      if (updateUserDto.isOperational !== undefined) allowedUpdates.isOperational = updateUserDto.isOperational;
      if (updateUserDto.grade !== undefined) allowedUpdates.grade = updateUserDto.grade;
      if (updateUserDto.password) {
        allowedUpdates.password = await this.encryptPassword(updateUserDto.password);
      }

      const userUpdated = await this.userRepository.update(
        user.id,
        allowedUpdates,
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
      const editableFields: Partial<UserEntity> = {
        ...(updateProfileDto.name !== undefined && {
          name: updateProfileDto.name,
        }),
        ...(updateProfileDto.lastName !== undefined && {
          lastName: updateProfileDto.lastName,
        }),
        ...(updateProfileDto.cellphone !== undefined && {
          cellphone: updateProfileDto.cellphone,
        }),
        ...(updateProfileDto.birthdate !== undefined && {
          birthdate: updateProfileDto.birthdate,
        }),
        ...(updateProfileDto.urlImage !== undefined && {
          urlImage: updateProfileDto.urlImage,
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
    const operationalValue =
      updateUserStatusDto.isOperational !== undefined
        ? updateUserStatusDto.isOperational
        : (updateUserStatusDto.isActive ?? true);

    this.logger.log(`[updateStatus] Cambiando estado operativo de usuario. id=${id}, isOperational=${operationalValue}`);
    try {
      const user = await this.findOne(id);
      if (user.role === ROLES.SUADMIN && currentUserRole?.toLowerCase() !== ROLES.SUADMIN) {
        throw new ForbiddenException('No tienes permisos para modificar a un usuario Super Administrador.');
      }
      const userUpdated = await this.userRepository.update(id, {
        isOperational: operationalValue,
      });
      if (userUpdated.affected === 0) {
        this.logger.warn(`[updateStatus] No se pudo cambiar estado operativo. id=${id}`);
        throw new BadRequestException(
          'No se pudo cambiar el estado operativo del usuario.',
        );
      }
      this.logger.log(`[updateStatus] Estado operativo actualizado con éxito. id=${id}, isOperational=${operationalValue}`);
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

  public async bulkUpdateGrades(
    dto: BulkUpdateGradeDto,
    currentUserRole?: string,
  ): Promise<{
    summary: { total: number; successful: number; failed: number };
    results: Array<{
      userId: string;
      success: boolean;
      grade?: string;
      message?: string;
      error?: string;
    }>;
  }> {
    this.logger.log(
      `[bulkUpdateGrades] Procesando actualización masiva de grados institucionales. currentUserRole=${currentUserRole}`,
    );

    const operations: Array<{ userId: string; grade?: string }> = [];

    if (dto.userIds && Array.isArray(dto.userIds) && dto.userIds.length > 0) {
      for (const userId of dto.userIds) {
        operations.push({ userId, grade: dto.grade });
      }
    }

    if (dto.users && Array.isArray(dto.users) && dto.users.length > 0) {
      for (const item of dto.users) {
        operations.push({
          userId: item.userId,
          grade: item.grade !== undefined ? item.grade : dto.grade,
        });
      }
    }

    if (operations.length === 0) {
      throw new BadRequestException(
        'Debes proporcionar al menos un usuario para actualizar el grado institucional.',
      );
    }

    const results: Array<{
      userId: string;
      success: boolean;
      grade?: string;
      message?: string;
      error?: string;
    }> = [];

    const roleLower = currentUserRole?.toLowerCase();

    for (const op of operations) {
      try {
        if (op.grade === undefined) {
          results.push({
            userId: op.userId,
            success: false,
            error: 'No se especificó el grado a asignar para este usuario.',
          });
          continue;
        }

        const user = await this.userRepository.findOne({
          where: { id: op.userId, isDeleted: false },
        });

        if (!user) {
          results.push({
            userId: op.userId,
            success: false,
            error: 'Usuario no encontrado o dado de baja.',
          });
          continue;
        }

        // Restricciones de jerarquía:
        // 1. admin no puede modificar el grado de un suadmin
        if (roleLower === ROLES.ADMIN && user.role === ROLES.SUADMIN) {
          results.push({
            userId: op.userId,
            success: false,
            error:
              'No tienes permisos para modificar el grado de un usuario Super Administrador.',
          });
          continue;
        }

        // 2. manager no puede modificar el grado de un admin ni suadmin
        if (
          roleLower === ROLES.MANAGER &&
          (user.role === ROLES.SUADMIN || user.role === ROLES.ADMIN)
        ) {
          results.push({
            userId: op.userId,
            success: false,
            error:
              'Un manager solo puede modificar el grado institucional de usuarios con rol basic, advanced o manager.',
          });
          continue;
        }

        await this.userRepository.update(op.userId, { grade: op.grade });

        results.push({
          userId: op.userId,
          success: true,
          grade: op.grade,
          message: 'Grado institucional actualizado exitosamente.',
        });
      } catch (err: any) {
        results.push({
          userId: op.userId,
          success: false,
          error:
            err?.message || 'Error inesperado al procesar la actualización.',
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results,
    };
  }

  async countUsers(): Promise<number> {
    return await this.userRepository.count();
  }

  private async encryptPassword(password: string): Promise<string> {
    const saltRounds = Number(this.configService.get<string>('HASH_SALT')) || 10;
    return bcrypt.hash(password, saltRounds);
  }
}
