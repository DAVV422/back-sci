import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateForm201Dto } from '../dto/create-form-201.dto';
import { UpdateForm201Dto } from '../dto/update-form-201.dto';
import { Form201Entity } from '../entities/form-201.entity';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { UserService } from '../../../user/services/user.service';
import { AttendEntity } from '../../../organization_module/attends/entities/attends.entity';
import { ActionEntity } from '../../action/entities/action.entity';
import { ROLES } from '../../../common/constants';
import { RealtimeService } from '../../../notification/services/realtime.service';
import { IStorageService } from '../../../common/interfaces/storage.interface';
import { normalizeSituationMap } from '../situation-map';
import { isImageBuffer } from '../controllers/croquis-upload.options';

/** Carpeta del almacenamiento para las imágenes de croquis del 201. */
export const CROQUIS_FOLDER = 'croquis';

@Injectable()
export class Form201Service {
  private readonly logger = new Logger('Form201Service');

  constructor(
    @InjectRepository(Form201Entity)
    private readonly form201Repository: Repository<Form201Entity>,
    @InjectRepository(AttendEntity)
    private readonly attendRepository: Repository<AttendEntity>,
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly emergencyService: EmergencyService,
    private readonly userService: UserService,
    @Inject('STORAGE_SERVICE')
    private readonly storageService: IStorageService,
    @Optional() private readonly realtimeService?: RealtimeService,
  ) {}

  public async assertCanManageForm201(
    emergencyId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const roleLower = userRole?.toLowerCase();
    if (
      roleLower === ROLES.MANAGER ||
      roleLower === ROLES.ADMIN ||
      roleLower === ROLES.SUADMIN
    ) {
      return;
    }

    const activeCI = await this.attendRepository.findOne({
      where: {
        emergency: { id: emergencyId },
        user: { id: userId },
        chargeSystemName: 'incident_commander',
        isActive: true,
        isDeleted: false,
      },
    });

    if (!activeCI) {
      this.logger.warn(
        `[assertCanManageForm201] Acceso denegado: userId=${userId}, role=${userRole} no es CI activo ni Manager+ en emergencia=${emergencyId}`,
      );
      throw new ForbiddenException(
        'Solo el Comandante del Incidente activo o un usuario con rol Manager o superior puede gestionar el Formulario 201.',
      );
    }
  }

  public async assertCanDeleteForm201(
    emergencyId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const roleLower = userRole?.toLowerCase();
    if (roleLower === ROLES.ADMIN || roleLower === ROLES.SUADMIN) {
      return;
    }

    const activeCI = await this.attendRepository.findOne({
      where: {
        emergency: { id: emergencyId },
        user: { id: userId },
        chargeSystemName: 'incident_commander',
        isActive: true,
        isDeleted: false,
      },
    });

    if (!activeCI) {
      this.logger.warn(
        `[assertCanDeleteForm201] Acceso denegado a eliminar F201: userId=${userId}, role=${userRole} no es Admin ni CI activo en emergencia=${emergencyId}`,
      );
      throw new ForbiddenException(
        'La eliminación de un Formulario 201 está restringida a Administradores o al Comandante de Incidente activo de la emergencia.',
      );
    }
  }

  async create(
    emergencyId: string,
    createForm201Dto: CreateForm201Dto,
    userId: string,
    userRole?: string,
  ): Promise<Form201Entity> {
    this.logger.log(
      `[create] Iniciando creación de Form201. emergencyId=${emergencyId}, userId=${userId}, clientGeneratedId=${createForm201Dto.clientGeneratedId ?? 'N/A'}`,
    );
    try {
      if (userRole) {
        await this.assertCanManageForm201(emergencyId, userId, userRole);
      }
      if (createForm201Dto.clientGeneratedId) {
        const existing = await this.form201Repository.findOne({
          where: { clientGeneratedId: createForm201Dto.clientGeneratedId },
          relations: ['emergency', 'user'],
        });
        if (existing) {
          this.logger.warn(
            `[create] Idempotencia: Form201 con clientGeneratedId ${createForm201Dto.clientGeneratedId} ya procesado. id=${existing.id}`,
          );
          return existing;
        }
      }

      const emergencyEntity = await this.emergencyService.findOne(emergencyId);
      this.emergencyService.assertEditable(emergencyEntity);

      // Solo un F201 abierto a la vez; los finalizados de mandos anteriores no bloquean.
      const activeForm = await this.form201Repository.findOne({
        where: { emergency: { id: emergencyId }, isDeleted: false, isFinalized: false },
      });
      if (activeForm) {
        this.logger.warn(`[create] Ya existe un Form201 activo para la emergencia ${emergencyId}`);
        throw new BadRequestException(
          'Ya existe un Formulario 201 activo para esta emergencia.',
        );
      }

      const userEntity = await this.userService.findOne(userId);

      // Generar código correlativo incremental seguro
      const totalFormsCount = await this.form201Repository.count({
        where: { emergency: { id: emergencyId } },
      });
      const code = `F201-${String(totalFormsCount + 1).padStart(3, '0')}`;

      // Capturar organigrama (snapshot inmutable de attends)
      const attends = await this.attendRepository.find({
        where: { emergency: { id: emergencyId }, isActive: true, isDeleted: false },
        relations: ['user', 'charge'],
      });

      const organizationChart = attends.map((att) => ({
        attendId: att.id,
        user: {
          id: att.user.id,
          name: att.user.name,
          lastName: att.user.lastName,
        },
        charge: {
          id: att.charge.id,
          name: att.charge.name,
          level: att.charge.level,
          systemName: att.chargeSystemName,
        },
        date: att.date,
        hour: att.hour,
      }));

      const form201 = this.form201Repository.create({
        ...createForm201Dto,
        situationMap: normalizeSituationMap(createForm201Dto.situationMap ?? null),
        preparedAt: createForm201Dto.preparedAt ? new Date(createForm201Dto.preparedAt) : new Date(),
        code,
        organizationChart: createForm201Dto.organizationChart || { members: organizationChart },
        emergency: emergencyEntity,
        user: userEntity,
      });

      try {
        const saved = await this.form201Repository.save(form201);
        this.logger.log(
          `[create] Form201 creado exitosamente. id=${saved.id}, code=${saved.code}, emergencyId=${emergencyId}`,
        );
        return saved;
      } catch (error) {
        if (error?.code === '23505') {
          this.logger.warn(`[create] Conflicto de código o exclusividad: ${error.message}`);
          throw new ConflictException(
            'Ya existe un Formulario 201 activo para esta emergencia.',
          );
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(`[create] Error al crear Form201. emergencyId=${emergencyId}. Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Form201Entity> {
    this.logger.log(`[findOne] Buscando Form201. id=${id}`);
    try {
      const form201 = await this.form201Repository.findOne({
        where: { id, isDeleted: false },
        relations: ['emergency', 'user'],
      });
      if (!form201) {
        this.logger.warn(`[findOne] Form201 no encontrado. id=${id}`);
        throw new NotFoundException('Formulario 201 no encontrado.');
      }
      this.logger.log(`[findOne] Form201 encontrado. id=${form201.id}, code=${form201.code}`);
      return form201;
    } catch (error) {
      this.logger.error(`[findOne] Error al buscar Form201: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findActiveByEmergency(emergencyId: string): Promise<Form201Entity> {
    this.logger.log(`[findActiveByEmergency] Buscando Form201 activo. emergencyId=${emergencyId}`);
    try {
      // El abierto si existe; si no, el más reciente (el último mando ya cerrado).
      const form201 = await this.form201Repository.findOne({
        where: { emergency: { id: emergencyId }, isDeleted: false },
        relations: ['emergency', 'user'],
        order: { isFinalized: 'ASC', createdAt: 'DESC' },
      });
      if (!form201) {
        this.logger.warn(`[findActiveByEmergency] No se encontró Form201 activo. emergencyId=${emergencyId}`);
        throw new NotFoundException(
          'No se encontró un Formulario 201 activo para esta emergencia.',
        );
      }
      this.logger.log(`[findActiveByEmergency] Form201 activo encontrado. id=${form201.id}, code=${form201.code}`);
      return form201;
    } catch (error) {
      this.logger.error(`[findActiveByEmergency] Error al buscar Form201 por emergencia: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByEmergency(emergencyId: string): Promise<Form201Entity[]> {
    this.logger.log(`[findByEmergency] Listando Form201s por emergencia. emergencyId=${emergencyId}`);
    try {
      const items = await this.form201Repository.find({
        where: { emergency: { id: emergencyId }, isDeleted: false },
        relations: ['emergency', 'user'],
      });
      this.logger.log(`[findByEmergency] Se encontraron ${items.length} formularios. emergencyId=${emergencyId}`);
      return items;
    } catch (error) {
      this.logger.error(`[findByEmergency] Error al listar Form201 por emergencia: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    updateForm201Dto: UpdateForm201Dto,
    userId?: string,
    userRole?: string,
  ): Promise<Form201Entity> {
    this.logger.log(`[update] Actualizando Form201. id=${id}`);
    try {
      const form201 = await this.findOne(id);
      this.emergencyService.assertEditable(form201.emergency);

      if (userId && userRole) {
        await this.assertCanManageForm201(
          form201.emergency.id,
          userId,
          userRole,
        );
      }

      if (form201.isFinalized) {
        this.logger.warn(`[update] Intento de actualizar Form201 ya finalizado. id=${id}`);
        throw new BadRequestException(
          'El formulario ya está finalizado y no se puede editar.',
        );
      }

      const { clientGeneratedId, code, isFinalized, croquisImage, finalizedAt, ...updateData } = updateForm201Dto as any;
      if (updateData.preparedAt) updateData.preparedAt = new Date(updateData.preparedAt);
      if ('situationMap' in updateData) updateData.situationMap = normalizeSituationMap(updateData.situationMap);
      await this.form201Repository.update(id, updateData);
      this.logger.log(`[update] Form201 actualizado exitosamente. id=${id}`);
      this.realtimeService?.notifyEmergency(form201.emergency.id, 'form201', 'update', id);

      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`[update] Error al actualizar Form201: ${error.message}`, error.stack);
      throw error;
    }
  }

  /** Mismas reglas que editar: emergencia editable, CI o manager+ y formulario abierto. */
  private async loadEditable(id: string, userId: string, userRole: string): Promise<Form201Entity> {
    const form201 = await this.findOne(id);
    this.emergencyService.assertEditable(form201.emergency);
    await this.assertCanManageForm201(form201.emergency.id, userId, userRole);
    if (form201.isFinalized) {
      throw new BadRequestException('El formulario ya está finalizado y no se puede editar.');
    }
    return form201;
  }

  /** Casilla 12: sube o reemplaza la imagen del croquis. */
  async setCroquis(id: string, file: Express.Multer.File, userId: string, userRole: string): Promise<Form201Entity> {
    if (!file) throw new BadRequestException('Adjunta la imagen del croquis en el campo "file".');
    if (!isImageBuffer(file.buffer)) throw new BadRequestException('El archivo no es una imagen JPG, PNG o WebP válida.');
    const form201 = await this.loadEditable(id, userId, userRole);
    const filename = await this.storageService.saveFile(file, CROQUIS_FOLDER);
    await this.form201Repository.update(id, { croquisImage: filename });
    if (form201.croquisImage) await this.storageService.deleteFile(form201.croquisImage, CROQUIS_FOLDER);
    this.logger.log(`[setCroquis] Croquis actualizado. id=${id}`);
    this.realtimeService?.notifyEmergency(form201.emergency.id, 'form201', 'update', id);
    return this.findOne(id);
  }

  async removeCroquis(id: string, userId: string, userRole: string): Promise<Form201Entity> {
    const form201 = await this.loadEditable(id, userId, userRole);
    if (form201.croquisImage) {
      await this.form201Repository.update(id, { croquisImage: null });
      await this.storageService.deleteFile(form201.croquisImage, CROQUIS_FOLDER);
      this.realtimeService?.notifyEmergency(form201.emergency.id, 'form201', 'update', id);
    }
    return this.findOne(id);
  }

  /** Ruta en disco del croquis (404 si el formulario no tiene). */
  async getCroquisPath(id: string): Promise<string> {
    const form201 = await this.findOne(id);
    if (!form201.croquisImage) throw new NotFoundException('Este Formulario 201 no tiene croquis.');
    return this.storageService.getFilePath(form201.croquisImage, CROQUIS_FOLDER);
  }

  async finalize(
    id: string,
    userId: string,
    userRole?: string,
  ): Promise<Form201Entity> {
    this.logger.log(`[finalize] Finalizando Form201. id=${id}, userId=${userId}`);
    try {
      const form201 = await this.findOne(id);
      this.emergencyService.assertEditable(form201.emergency);

      if (userRole) {
        await this.assertCanManageForm201(
          form201.emergency.id,
          userId,
          userRole,
        );
      }

      if (form201.isFinalized) {
        this.logger.warn(`[finalize] Form201 ya estaba finalizado. id=${id}`);
        throw new BadRequestException('El formulario ya está finalizado.');
      }

      form201.isFinalized = true;
      form201.finalizedAt = new Date();
      await this.form201Repository.save(form201);

      // Registrar en bitácora de la emergencia
      const now = new Date();
      const user = await this.userService.findOne(userId);
      await this.actionRepository.save(
        this.actionRepository.create({
          description: `Formulario 201 finalizado (${form201.code})`,
          date: now,
          hour: `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes(),
          ).padStart(2, '0')}`,
          user,
          emergency: form201.emergency,
        }),
      );

      this.logger.log(`[finalize] Form201 finalizado exitosamente. id=${id}, code=${form201.code}`);
      return form201;
    } catch (error) {
      this.logger.error(`[finalize] Error al finalizar Form201: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<void> {
    this.logger.log(`[delete] Eliminando Form201. id=${id}`);
    try {
      const form201 = await this.findOne(id);
      this.emergencyService.assertEditable(form201.emergency);

      if (userId && userRole) {
        await this.assertCanDeleteForm201(
          form201.emergency.id,
          userId,
          userRole,
        );
      }

      await this.form201Repository.update(id, { isDeleted: true });
      this.logger.log(`[delete] Form201 eliminado exitosamente. id=${id}`);
      this.realtimeService?.notifyEmergency(form201.emergency.id, 'form201', 'delete', id);
    } catch (error) {
      this.logger.error(`[delete] Error al eliminar Form201: ${error.message}`, error.stack);
      throw error;
    }
  }
}
