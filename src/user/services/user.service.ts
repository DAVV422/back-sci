import { Repository } from 'typeorm';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UpdateProfileDto,
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

@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  public async findAll(
    queryDto: QueryDto,
  ): Promise<PaginatedResult<UserEntity>> {
    try {
      const { limit, offset, order, attr, value } = queryDto;
      validateAllowedAttrs(attr, USER_ALLOWED_ATTRS);
      const query = this.userRepository.createQueryBuilder('user');
      if (limit) query.take(limit);
      if (offset) query.skip(offset);
      if (order)
        query.orderBy('user.createdAt', order.toLocaleUpperCase() as any);
      if (attr && value)
        query.where(`user.${attr} ILIKE :value`, { value: `%${value}%` });
      query.where('user.is_deleted = false');
      const [items, total] = await query.getManyAndCount();
      return { items, total };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async createUser(createUserDto: CreateUserDto): Promise<UserEntity> {
    try {
      createUserDto.password = await this.encryptPassword(
        createUserDto.password,
      );
      createUserDto.birthdate = new Date(createUserDto.birthdate);
      const user_created: UserEntity = await this.userRepository.save(
        createUserDto,
      );
      return await this.findOneBy({ key: 'email', value: createUserDto.email });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findOne(id: string): Promise<UserEntity> {
    try {
      const user: UserEntity = await this.userRepository.findOne({
        where: { id },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado.');
      return user;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByEmail(email: string): Promise<UserEntity> {
    try {
      const user: UserEntity = await this.userRepository.findOne({
        where: { email },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado.');
      return user;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    try {
      if (updateUserDto.password)
        updateUserDto.password = await this.encryptPassword(
          updateUserDto.password,
        );
      const user: UserEntity = await this.findOne(id);
      const userUpdated = await this.userRepository.update(
        user.id,
        updateUserDto,
      );
      if (userUpdated.affected === 0)
        throw new NotFoundException('Usuario no actualizado.');
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserEntity> {
    try {
      await this.findOne(id);
      const editableFields: Partial<UpdateProfileDto> = {
        ...(updateProfileDto.name !== undefined && {
          name: updateProfileDto.name,
        }),
        ...(updateProfileDto.last_name !== undefined && {
          last_name: updateProfileDto.last_name,
        }),
        ...(updateProfileDto.cellphone !== undefined && {
          cellphone: updateProfileDto.cellphone,
        }),
        ...(updateProfileDto.grade !== undefined && {
          grade: updateProfileDto.grade,
        }),
      };
      const userUpdated = await this.userRepository.update(id, editableFields);
      if (userUpdated.affected === 0)
        throw new BadRequestException('Perfil no actualizado.');
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async updateStatus(
    id: string,
    updateUserStatusDto: UpdateUserStatusDto,
  ): Promise<UserEntity> {
    try {
      await this.findOne(id);
      const userUpdated = await this.userRepository.update(id, {
        is_active: updateUserStatusDto.is_active,
      });
      if (userUpdated.affected === 0)
        throw new BadRequestException(
          'No se pudo cambiar el estado del usuario.',
        );
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const user = await this.findOne(id);
      user.isDeleted = true;
      const deletedUser = await this.userRepository.update(user.id, user);
      if (deletedUser.affected === 0)
        throw new BadRequestException('Usuario no eliminado.');
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
    return bcrypt.hashSync(password, +process.env.HASH_SALT);
  }
}
