import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import { handlerError } from '../../../common/utils/handlerError.utils';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { EquipmentEntity } from '../../equipment/entities/equipment.entity';
import { ResourceService } from '../../resource/services/resource.service';
import { EmergencyAccessService, SCI_CHARGE } from '../../emergency/services/emergency-access.service';
import { VehicleEntity } from '../entities/vehicle.entity';
import { VehicleLoadItemEntity } from '../entities/vehicle-load-item.entity';
import { VehicleDispatchEntity } from '../entities/vehicle-dispatch.entity';
import {
  AddVehicleItemsDto,
  CreateVehicleDto,
  DispatchVehicleDto,
  ReturnVehicleDto,
  UpdateVehicleDto,
  VehicleLoadItemDto,
} from '../dto/vehicle.dto';

/** Vehículo con su despacho activo, si está en una emergencia. */
export type VehicleWithDispatch = VehicleEntity & {
  activeDispatch: { id: string; emergency: { id: string; code: string; name: string } } | null;
};

/** Código de Postgres para una violación de índice único. */
const UNIQUE_VIOLATION = '23505';

/**
 * Vehículos y su carga estándar. Despachar un vehículo crea su despacho y descuenta del inventario
 * el equipo que lleva (con la misma regla que el despacho suelto); devolverlo reincorpora ese
 * equipo. Un vehículo no puede estar en dos emergencias a la vez.
 */
@Injectable()
export class VehicleService {
  private readonly logger = new Logger('VehicleService');

  constructor(
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepository: Repository<VehicleEntity>,
    @InjectRepository(VehicleDispatchEntity)
    private readonly dispatchRepository: Repository<VehicleDispatchEntity>,
    private readonly dataSource: DataSource,
    private readonly resourceService: ResourceService,
    private readonly emergencyAccessService: EmergencyAccessService,
  ) {}

  async findAll(): Promise<VehicleWithDispatch[]> {
    try {
      const vehicles = await this.vehicleRepository.find({
        where: { isDeleted: false },
        relations: ['load', 'load.equipment'],
        order: { code: 'ASC' },
      });
      const active = vehicles.length
        ? await this.dispatchRepository.find({
            where: { vehicle: { id: In(vehicles.map((v) => v.id)) }, returnedAt: IsNull(), isDeleted: false },
            relations: ['vehicle', 'emergency'],
          })
        : [];
      const byVehicle = new Map(active.map((d) => [d.vehicle.id, d]));
      return vehicles.map((v) => {
        const d = byVehicle.get(v.id);
        return Object.assign(v, {
          activeDispatch: d ? { id: d.id, emergency: { id: d.emergency.id, code: d.emergency.code, name: d.emergency.name } } : null,
        });
      });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  /**
   * Vehículos despachados a la emergencia (activos y devueltos), aunque no lleven equipo: sin esto,
   * uno despachado sin carga no se vería en la emergencia y no se podría devolver.
   */
  async findDispatchesByEmergency(emergencyId: string): Promise<VehicleDispatchEntity[]> {
    try {
      return await this.dispatchRepository.find({
        where: { emergency: { id: emergencyId }, isDeleted: false },
        relations: ['vehicle'],
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async findOne(id: string): Promise<VehicleEntity> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['load', 'load.equipment'],
    });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado.');
    return vehicle;
  }

  async create(dto: CreateVehicleDto): Promise<VehicleEntity> {
    try {
      const code = dto.code.trim();
      await this.assertCodeAvailable(code);
      const load = await this.buildLoad(dto.load ?? []);
      const vehicle = await this.vehicleRepository.save(
        this.vehicleRepository.create({
          code,
          vehicleType: dto.vehicleType.trim(),
          plate: dto.plate?.trim() || null,
          status: dto.status ?? 'available',
          notes: dto.notes?.trim() || null,
          load,
        }),
      );
      return await this.findOne(vehicle.id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleEntity> {
    try {
      const vehicle = await this.findOne(id);
      if (dto.code !== undefined) {
        const code = dto.code.trim();
        if (code.toLowerCase() !== vehicle.code.toLowerCase()) await this.assertCodeAvailable(code, id);
        vehicle.code = code;
      }
      if (dto.vehicleType !== undefined) vehicle.vehicleType = dto.vehicleType.trim();
      if (dto.plate !== undefined) vehicle.plate = dto.plate?.trim() || null;
      if (dto.status !== undefined) vehicle.status = dto.status;
      if (dto.notes !== undefined) vehicle.notes = dto.notes?.trim() || null;

      await this.dataSource.transaction(async (manager) => {
        await manager.update(VehicleEntity, { id: vehicle.id }, {
          code: vehicle.code, vehicleType: vehicle.vehicleType, plate: vehicle.plate, status: vehicle.status, notes: vehicle.notes,
        });
        if (dto.load !== undefined) {
          // La carga se reemplaza completa: es una lista corta y así no quedan líneas huérfanas.
          await manager.delete(VehicleLoadItemEntity, { vehicle: { id: vehicle.id } });
          const load = await this.buildLoad(dto.load);
          for (const item of load) await manager.save(VehicleLoadItemEntity, { ...item, vehicle: { id: vehicle.id } });
        }
      });
      return await this.findOne(id);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const vehicle = await this.findOne(id);
      if (await this.activeDispatchOf(vehicle.id)) {
        throw new BadRequestException(`${vehicle.code} está en una emergencia: devuélvelo antes de eliminarlo.`);
      }
      await this.vehicleRepository.update(vehicle.id, { isDeleted: true });
      return { success: true, statusCode: 200, message: 'Vehículo eliminado.', data: null };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  /** Despacha el vehículo a la emergencia con el equipo indicado (normalmente, su carga estándar). */
  async dispatch(emergencyId: string, dto: DispatchVehicleDto, userId: string, userRole?: string): Promise<VehicleDispatchEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const emergency = await this.resourceService.assertCanDispatch(emergencyId, userId, userRole);
      const vehicle = await this.findOne(dto.vehicleId);
      if (vehicle.status === 'out_of_service') {
        throw new BadRequestException(`${vehicle.code} está fuera de servicio.`);
      }
      const current = await this.activeDispatchOf(vehicle.id);
      if (current) {
        throw new ConflictException(`${vehicle.code} ya está en la emergencia ${current.emergency.code}.`);
      }

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const dispatch = await queryRunner.manager.save(
          queryRunner.manager.create(VehicleDispatchEntity, {
            vehicle: { id: vehicle.id },
            emergency: { id: emergency.id },
            dispatchedBy: { id: userId },
            note: dto.note?.trim() || null,
          }),
        );
        const items = dto.items.filter((i) => i.amount > 0);
        const resources = items.length
          ? await this.resourceService.dispatchWithin(queryRunner.manager, emergency.id, items, {
              note: `A bordo de ${vehicle.code}${dto.note?.trim() ? ` · ${dto.note.trim()}` : ''}`,
              vehicleDispatchId: dispatch.id,
            })
          : [];
        const detail = resources.length
          ? `: ${resources.map((r) => `${r.equipment.name} x${r.amount}`).join(', ')}`
          : ' (sin equipo a bordo)';
        await this.resourceService.logAction(
          queryRunner.manager,
          emergency.id,
          userId,
          `Despacho de vehículo ${vehicle.code} (${vehicle.vehicleType})${detail}`,
        );
        await queryRunner.commitTransaction();
        return await this.dispatchRepository.findOne({
          where: { id: dispatch.id },
          relations: ['vehicle', 'emergency', 'resources', 'resources.equipment'],
        });
      } catch (error) {
        await queryRunner.rollbackTransaction();
        if (error?.code === UNIQUE_VIOLATION) {
          // Otro usuario lo despachó al mismo tiempo: el índice único parcial lo impide.
          throw new ConflictException(`${vehicle.code} ya fue despachado a otra emergencia.`);
        }
        throw error;
      }
    } catch (error) {
      handlerError(error, this.logger);
    } finally {
      if (queryRunner.isReleased === false) await queryRunner.release();
    }
  }

  /**
   * Más equipo a bordo de un vehículo que sigue en la emergencia (se pidió después o faltó al
   * despacharlo). Lo que ya lleva suma a su línea; descuenta del inventario como cualquier despacho.
   */
  async addItems(dispatchId: string, dto: AddVehicleItemsDto, userId: string, userRole?: string): Promise<VehicleDispatchEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const dispatch = await this.dispatchRepository.findOne({
        where: { id: dispatchId, isDeleted: false },
        relations: ['vehicle', 'emergency', 'resources', 'resources.equipment'],
      });
      if (!dispatch) throw new NotFoundException('Despacho de vehículo no encontrado.');
      if (dispatch.returnedAt) throw new BadRequestException(`${dispatch.vehicle.code} ya fue devuelto.`);
      await this.resourceService.assertCanDispatch(dispatch.emergency.id, userId, userRole);

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const added = await this.resourceService.dispatchWithin(queryRunner.manager, dispatch.emergency.id, dto.items, {
          note: `A bordo de ${dispatch.vehicle.code}`,
          vehicleDispatchId: dispatch.id,
          existing: dispatch.resources ?? [],
        });
        await this.resourceService.logAction(
          queryRunner.manager,
          dispatch.emergency.id,
          userId,
          `Equipo agregado a ${dispatch.vehicle.code}: ${added.map((r) => `${r.equipment.name} x${r.amount}`).join(', ')}`,
        );
        await queryRunner.commitTransaction();
        return await this.dispatchRepository.findOne({
          where: { id: dispatch.id },
          relations: ['vehicle', 'emergency', 'resources', 'resources.equipment'],
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

  /** El vehículo vuelve con su equipo: se reincorpora al inventario y queda libre para otro despacho. */
  async returnVehicle(dispatchId: string, dto: ReturnVehicleDto, userId: string, userRole?: string): Promise<VehicleDispatchEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const dispatch = await this.dispatchRepository.findOne({
        where: { id: dispatchId, isDeleted: false },
        relations: ['vehicle', 'emergency', 'resources', 'resources.equipment', 'resources.emergency'],
      });
      if (!dispatch) throw new NotFoundException('Despacho de vehículo no encontrado.');
      if (dispatch.returnedAt) throw new BadRequestException(`${dispatch.vehicle.code} ya fue devuelto.`);
      if (userRole) {
        await this.emergencyAccessService.assertHasCharge(
          dispatch.emergency.id,
          userId,
          userRole,
          [SCI_CHARGE.INCIDENT_COMMANDER],
          'Solo el Comandante del Incidente o un usuario con rol Manager o superior puede registrar devoluciones.',
        );
      }
      const requested = new Map((dto.items ?? []).map((i) => [i.resourceId, i.amountReturned]));
      const resources = (dispatch.resources ?? []).filter((r) => !r.isDeleted);
      for (const id of requested.keys()) {
        if (!resources.some((r) => r.id === id)) throw new BadRequestException('Uno de los equipos no pertenece a este vehículo.');
      }

      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const kept: string[] = [];
        for (const resource of resources) {
          const pending = resource.amount - (resource.amount_returned ?? 0);
          const amount = requested.has(resource.id) ? requested.get(resource.id) : pending;
          await this.resourceService.returnWithin(queryRunner.manager, resource, amount);
          if (pending - amount > 0) kept.push(`${resource.equipment.name} x${pending - amount}`);
        }
        await queryRunner.manager.update(VehicleDispatchEntity, { id: dispatch.id }, { returnedAt: new Date() });
        await this.resourceService.logAction(
          queryRunner.manager,
          dispatch.emergency.id,
          userId,
          `Vehículo ${dispatch.vehicle.code} devuelto${kept.length ? ` (sin devolver: ${kept.join(', ')})` : ' con todo su equipo'}`,
        );
        await queryRunner.commitTransaction();
        return await this.dispatchRepository.findOne({
          where: { id: dispatch.id },
          relations: ['vehicle', 'emergency', 'resources', 'resources.equipment'],
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

  private activeDispatchOf(vehicleId: string): Promise<VehicleDispatchEntity | null> {
    return this.dispatchRepository.findOne({
      where: { vehicle: { id: vehicleId }, returnedAt: IsNull(), isDeleted: false },
      relations: ['emergency'],
    });
  }

  private async assertCodeAvailable(code: string, exceptId?: string): Promise<void> {
    const existing = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .where('LOWER(vehicle.code) = LOWER(:code)', { code })
      .andWhere('vehicle.isDeleted = false')
      .getOne();
    if (existing && existing.id !== exceptId) throw new BadRequestException(`Ya existe un vehículo con el código ${existing.code}.`);
  }

  /** Valida la carga: equipos existentes, sin repetir y sin superar el total del inventario. */
  private async buildLoad(items: readonly VehicleLoadItemDto[]): Promise<Partial<VehicleLoadItemEntity>[]> {
    const merged = new Map<string, number>();
    for (const item of items) merged.set(item.equipmentId, (merged.get(item.equipmentId) ?? 0) + item.quantity);
    if (!merged.size) return [];
    const equipment = await this.dataSource.getRepository(EquipmentEntity).find({
      where: { id: In([...merged.keys()]), isDeleted: false },
    });
    const byId = new Map(equipment.map((e) => [e.id, e]));
    return [...merged].map(([equipmentId, quantity]) => {
      const e = byId.get(equipmentId);
      if (!e) throw new BadRequestException('Uno de los equipos de la carga no existe en el inventario.');
      if (quantity > e.totalQuantity) {
        throw new BadRequestException(`${e.name}: el inventario tiene ${e.totalQuantity} en total, no alcanza para ${quantity} a bordo.`);
      }
      return { equipment: { id: e.id } as EquipmentEntity, quantity };
    });
  }
}

