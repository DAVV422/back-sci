import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { HealthFacilityEntity } from '../entities/health-facility.entity';

export const HEALTH_FACILITY_NAME_MAX = 150;

/** Espacios simples y sin bordes: lo que se guarda como nombre visible. */
export function cleanFacilityName(name: string): string {
  return (name ?? '').trim().replace(/\s+/g, ' ');
}

/** Clave de comparación: minúsculas y sin tildes. */
export function normalizeFacilityName(name: string): string {
  return cleanFacilityName(name)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

@Injectable()
export class HealthFacilityService {
  private readonly logger = new Logger('HealthFacilityService');

  constructor(
    @InjectRepository(HealthFacilityEntity)
    private readonly repository: Repository<HealthFacilityEntity>,
  ) {}

  /** Autocompletado: coincidencias por parte del nombre, sin distinguir tildes ni mayúsculas. */
  async search(term: string, limit = 10): Promise<Pick<HealthFacilityEntity, 'id' | 'name'>[]> {
    const normalized = normalizeFacilityName(term ?? '');
    const query = this.repository
      .createQueryBuilder('facility')
      .select(['facility.id', 'facility.name'])
      .where('facility.is_deleted = false')
      .orderBy('facility.name', 'ASC')
      .take(Math.min(Math.max(limit, 1), 20));
    if (normalized) {
      query.andWhere('facility.normalized_name LIKE :term', {
        term: `%${normalized.replace(/[%_\\]/g, '\\$&')}%`,
      });
    }
    const rows = await query.getMany();
    return rows.map(({ id, name }) => ({ id, name }));
  }

  /** Devuelve el centro con ese nombre (sin distinguir tildes ni mayúsculas) o lo crea. */
  async findOrCreate(rawName: string, manager?: EntityManager): Promise<HealthFacilityEntity> {
    const name = cleanFacilityName(rawName);
    if (!name) throw new BadRequestException('El lugar de traslado no puede estar vacío.');
    if (name.length > HEALTH_FACILITY_NAME_MAX) {
      throw new BadRequestException(`El lugar de traslado admite hasta ${HEALTH_FACILITY_NAME_MAX} caracteres.`);
    }
    const repo = manager ? manager.getRepository(HealthFacilityEntity) : this.repository;
    const normalizedName = normalizeFacilityName(name);

    const existing = await repo.findOne({ where: { normalizedName, isDeleted: false } });
    if (existing) return existing;
    try {
      const created = await repo.save(repo.create({ name, normalizedName }));
      this.logger.log(`[findOrCreate] Centro de salud creado. id=${created.id}, name=${name}`);
      return created;
    } catch (error) {
      // Dos registros simultáneos con el mismo destino: gana el primero y se reutiliza.
      const raced = await repo.findOne({ where: { normalizedName, isDeleted: false } });
      if (raced) return raced;
      throw error;
    }
  }
}
