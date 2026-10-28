import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { ResourceEntity } from '../entities/resource.entity';
import { EquipmentEntity } from '../../../organization_module/equipment/entities/equipment.entity';
import { ActionEntity } from '../../../incident_module/action/entities/action.entity';
import { handlerError } from '../../../common/utils/handlerError.utils';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { EquipmentService } from '../../../organization_module/equipment/services/equipment.service';
import {
  EmergencyAccessService,
  SCI_CHARGE,
} from '../../../organization_module/emergency/services/emergency-access.service';
import { RealtimeService } from '../../../notification/services/realtime.service';

/** Un equipo y la cantidad a despachar. */
export interface DispatchItem {
  readonly equipmentId: string;
  readonly amount: number;
}

@Injectable()
export class ResourceService {
  private readonly logger = new Logger('ResourceService');

  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
    private readonly dataSource: DataSource,
    private readonly emergencyService: EmergencyService,
    private readonly equipmentService: EquipmentService,
    private readonly emergencyAccessService: EmergencyAccessService,
    @Optional() private readonly realtimeService?: RealtimeService,
  ) {}

  public async findOne(id: string): Promise<ResourceEntity> {
    try {
      const resource = await this.resourceRepository.findOne({
        where: { id, isDeleted: false },
        relations: ['equipment', 'emergency'],
      });
      if (!resource) throw new NotFoundException('Resource not found.');
      return resource;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async create(
    createResourceDto: CreateResourceDto,
    userId: string,
    userRole?: string,
  ): Promise<ResourceEntity> {
    const { emergencyId, equipmentId, amount, note } = createResourceDto;
    const [created] = await this.createMany(
      emergencyId,
      [{ equipmentId, amount }],
      note,
      userId,
      userRole,
    );
    return created;
  }

  /**
   * Despacho de varios equipos sueltos en una sola operación (un registro por equipo y una entrada
   * en la bitácora). Todo o nada: si a uno le falta stock, no se despacha ninguno.
   */
  public async createMany(
    emergencyId: string,
    items: readonly DispatchItem[],
    note: string | undefined,
    userId: string,
    userRole?: string,
  ): Promise<ResourceEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const emergency = await this.assertCanDispatch(emergencyId, userId, userRole);
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const saved = await this.dispatchWithin(queryRunner.manager, emergency.id, items, { note });
        await this.logAction(
          queryRunner.manager,
          emergency.id,
          userId,
          `Despacho de recurso: ${saved.map((r) => `${r.equipment.name} x${r.amount}`).join(', ')}`,
        );
        await queryRunner.commitTransaction();
        return await this.resourceRepository.find({
          where: { id: In(saved.map((r) => r.id)) },
          relations: ['equipment', 'emergency'],
        });
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      handlerError(error, this.logger);
    } finally {
      if (queryRunner.isReleased === false) await queryRunner.release();
    }
  }

  /** Emergencia abierta y usuario asignado a ella (o rol Manager o superior). */
  public async assertCanDispatch(emergencyId: string, userId: string, userRole?: string) {
    const emergency = await this.emergencyService.findOne(emergencyId);
    if (!emergency) throw new NotFoundException('Emergency not found.');
    this.emergencyService.assertEditable(emergency);
    if (userRole) {
      await this.emergencyAccessService.assertMember(
        emergency.id,
        userId,
        userRole,
        'Solo el personal asignado a la emergencia o un usuario con rol Manager o superior puede despachar recursos.',
      );
    }
    return emergency;
  }

  /**
   * Descuenta el stock y crea los registros de despacho dentro de una transacción abierta. Bloquea
   * cada equipo (`FOR UPDATE`) y valida lo disponible en ese momento; un mismo equipo repetido se
   * suma. Lo usan el despacho suelto y el de un vehículo con su carga. Con `existing` (lo que ya
   * va a bordo de ese vehículo), un equipo que ya lleva suma a su línea en vez de crear otra.
   */
  public async dispatchWithin(
    manager: EntityManager,
    emergencyId: string,
    items: readonly DispatchItem[],
    options: { note?: string | null; vehicleDispatchId?: string; existing?: readonly ResourceEntity[] } = {},
  ): Promise<ResourceEntity[]> {
    const merged = new Map<string, number>();
    for (const item of items) {
      if (item.amount > 0) merged.set(item.equipmentId, (merged.get(item.equipmentId) ?? 0) + item.amount);
    }
    if (merged.size === 0) throw new BadRequestException('Indica al menos un equipo con cantidad mayor a 0.');

    const shortages: string[] = [];
    const saved: ResourceEntity[] = [];
    for (const [equipmentId, amount] of merged) {
      const locked = await manager.findOne(EquipmentEntity, {
        where: { id: equipmentId, isDeleted: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Equipment not found.');
      if (amount > locked.availableQuantity) {
        shortages.push(`${locked.name} (pedido ${amount}, disponible ${locked.availableQuantity})`);
        continue;
      }
      locked.availableQuantity -= amount;
      await manager.save(locked);
      const aboard = options.existing?.find((r) => !r.isDeleted && r.equipment?.id === equipmentId);
      if (aboard) {
        aboard.amount += amount;
        await manager.save(aboard);
        // Lo devuelto describe lo agregado ahora (para la bitácora), no el total a bordo.
        saved.push({ ...aboard, equipment: locked, amount } as ResourceEntity);
        continue;
      }
      const resource = await manager.save(
        manager.create(ResourceEntity, {
          amount,
          note: options.note ?? undefined,
          emergency: { id: emergencyId },
          equipment: { id: locked.id },
          ...(options.vehicleDispatchId ? { vehicleDispatch: { id: options.vehicleDispatchId } } : {}),
        }),
      );
      resource.equipment = locked;
      saved.push(resource);
    }
    if (shortages.length) {
      throw new BadRequestException(`Cantidad no disponible en inventario: ${shortages.join('; ')}.`);
    }
    return saved;
  }

  /** Entrada en la bitácora de la emergencia con la hora actual. */
  public async logAction(manager: EntityManager, emergencyId: string, userId: string, description: string): Promise<void> {
    const now = new Date();
    await manager.save(
      manager.create(ActionEntity, {
        description,
        date: now,
        hour: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        user: { id: userId },
        emergency: { id: emergencyId },
      }),
    );
  }

  public async returnResource(
    id: string,
    amountReturned: number,
    userId: string,
    userRole?: string,
  ): Promise<ResourceEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const resource = await this.findOne(id);
      // Sin assertEditable: la desmovilización puede registrarse con la emergencia ya finalizada.
      if (userRole) {
        await this.emergencyAccessService.assertHasCharge(
          resource.emergency.id,
          userId,
          userRole,
          [SCI_CHARGE.INCIDENT_COMMANDER],
          'Solo el Comandante del Incidente o un usuario con rol Manager o superior puede registrar devoluciones.',
        );
      }
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await this.returnWithin(queryRunner.manager, resource, amountReturned);
        await this.logAction(
          queryRunner.manager,
          resource.emergency.id,
          userId,
          `Devolución de recurso: ${resource.equipment.name} x${amountReturned}`,
        );
        await queryRunner.commitTransaction();
        return await this.findOne(id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      handlerError(error, this.logger);
    } finally {
      if (queryRunner.isReleased === false) await queryRunner.release();
    }
  }

  /**
   * Reincorpora unidades de un despacho al inventario dentro de una transacción abierta.
   * 400 si supera lo pendiente o el total del equipo.
   */
  public async returnWithin(manager: EntityManager, resource: ResourceEntity, amountReturned: number): Promise<void> {
    const pending = resource.amount - (resource.amount_returned ?? 0);
    if (amountReturned > pending)
      throw new BadRequestException('Cantidad a devolver excede lo asignado');
    if (amountReturned <= 0) return;
    const lockedEquipment = await manager.findOne(EquipmentEntity, {
      where: { id: resource.equipment.id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    if (!lockedEquipment) throw new NotFoundException('Equipment not found.');
    if (lockedEquipment.availableQuantity + amountReturned > lockedEquipment.totalQuantity)
      throw new BadRequestException('La devolución supera la cantidad total del equipo');
    lockedEquipment.availableQuantity += amountReturned;
    await manager.save(lockedEquipment);
    resource.amount_returned = (resource.amount_returned ?? 0) + amountReturned;
    await manager.save(resource);
  }

  /**
   * Corrige las unidades despachadas (se cargó de más o de menos): el inventario se ajusta por la
   * diferencia y queda en la bitácora. No puede quedar por debajo de lo ya devuelto.
   */
  public async correctAmount(
    id: string,
    amount: number,
    userId: string,
    userRole?: string,
  ): Promise<ResourceEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const resource = await this.findOne(id);
      this.emergencyService.assertEditable(resource.emergency);
      if (userRole) {
        await this.emergencyAccessService.assertCommanderOrManager(
          resource.emergency.id,
          userId,
          userRole,
          'Solo el Comandante del Incidente o un usuario con rol Manager o superior puede corregir un despacho.',
        );
      }
      const returned = resource.amount_returned ?? 0;
      if (amount < returned) {
        throw new BadRequestException(`Ya se devolvieron ${returned}: la cantidad no puede ser menor.`);
      }
      const delta = amount - resource.amount;
      if (delta === 0) return resource;

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const locked = await queryRunner.manager.findOne(EquipmentEntity, {
          where: { id: resource.equipment.id, isDeleted: false },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked) throw new NotFoundException('Equipment not found.');
        if (delta > locked.availableQuantity) {
          throw new BadRequestException(`${locked.name}: hay ${locked.availableQuantity} disponibles, no alcanza para ${delta} más.`);
        }
        if (locked.availableQuantity - delta > locked.totalQuantity) {
          throw new BadRequestException('La corrección supera la cantidad total del equipo.');
        }
        locked.availableQuantity -= delta;
        await queryRunner.manager.save(locked);
        const before = resource.amount;
        resource.amount = amount;
        await queryRunner.manager.save(resource);
        await this.logAction(
          queryRunner.manager,
          resource.emergency.id,
          userId,
          `Corrección de despacho: ${resource.equipment.name} de ${before} a ${amount}`,
        );
        await queryRunner.commitTransaction();
        return await this.findOne(id);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      handlerError(error, this.logger);
    } finally {
      if (queryRunner.isReleased === false) await queryRunner.release();
    }
  }

  public async update(
    id: string,
    updateResourceDto: UpdateResourceDto,
    userId?: string,
    userRole?: string,
  ): Promise<ResourceEntity> {
    try {
      const resource = await this.findOne(id);
      if (resource.emergency) {
        this.emergencyService.assertEditable(resource.emergency);
        if (userRole) {
          await this.emergencyAccessService.assertCommanderOrManager(
            resource.emergency.id,
            userId,
            userRole,
            'Solo el Comandante del Incidente o un usuario con rol Manager o superior puede editar un despacho.',
          );
        }
      }
      const { emergencyId, equipmentId, amount: _ignored, ...resourceData } = updateResourceDto;
      const resourceUpdated = await this.resourceRepository.update(
        resource.id,
        resourceData,
      );
      if (resourceUpdated.affected === 0)
        throw new NotFoundException('Recurso no actualizado.');
      this.realtimeService?.notifyEmergency(resource.emergency?.id, 'resource', 'update', resource.id);
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  /**
   * Anula un despacho registrado por error: reincorpora al inventario las unidades que aún no
   * se devolvieron y deja constancia en la bitácora. Antes solo marcaba el registro como borrado,
   * con lo que esas unidades quedaban descontadas del stock para siempre.
   */
  public async delete(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<ApiResponse<null>> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const resource = await this.findOne(id);
      this.emergencyService.assertEditable(resource.emergency);
      if (userRole) {
        await this.emergencyAccessService.assertCommanderOrManager(
          resource.emergency.id,
          userId,
          userRole,
          'Solo el Comandante del Incidente o un usuario con rol Manager o superior puede anular un despacho.',
        );
      }
      const pending = resource.amount - (resource.amount_returned ?? 0);

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const lockedEquipment = await queryRunner.manager.findOne(
          EquipmentEntity,
          {
            where: { id: resource.equipment.id, isDeleted: false },
            lock: { mode: 'pessimistic_write' },
          },
        );
        if (!lockedEquipment)
          throw new NotFoundException('Equipment not found.');
        if (lockedEquipment.availableQuantity + pending > lockedEquipment.totalQuantity)
          throw new BadRequestException(
            'La anulación supera la cantidad total del equipo.',
          );

        lockedEquipment.availableQuantity += pending;
        await queryRunner.manager.save(lockedEquipment);

        resource.isDeleted = true;
        await queryRunner.manager.save(resource);

        const now = new Date();
        await queryRunner.manager.save(
          queryRunner.manager.create(ActionEntity, {
            description: `Despacho anulado: ${resource.equipment.name} x${resource.amount} (${pending} unidades reincorporadas al inventario)`,
            date: now,
            hour: `${String(now.getHours()).padStart(2, '0')}:${String(
              now.getMinutes(),
            ).padStart(2, '0')}`,
            user: { id: userId },
            emergency: { id: resource.emergency.id },
          }),
        );

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      }
      return {
        success: true,
        statusCode: 200,
        message: 'Despacho anulado y unidades reincorporadas al inventario.',
        data: null,
      };
    } catch (error) {
      handlerError(error, this.logger);
    } finally {
      if (queryRunner.isReleased === false) await queryRunner.release();
    }
  }

  public async findByEmergencyId(
    emergencyId: string,
  ): Promise<ResourceEntity[]> {
    try {
      const emergency = await this.emergencyService.findOne(emergencyId);
      this.logger.debug(`Emergency ${emergency?.id} fetched for resources`);
      if (!emergency) throw new NotFoundException('Emergency not found.');
      return await this.resourceRepository.find({
        where: { emergency: { id: emergency.id }, isDeleted: false },
        relations: ['equipment', 'emergency', 'vehicleDispatch', 'vehicleDispatch.vehicle'],
      });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async findByEquipmentId(
    equipmentId: string,
  ): Promise<ResourceEntity[]> {
    try {
      const equipment = await this.equipmentService.findOne(equipmentId);
      if (!equipment) throw new NotFoundException('Equipment not found.');

      return await this.resourceRepository.find({
        where: { equipment, isDeleted: false },
        relations: ['equipment', 'emergency'],
      });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
