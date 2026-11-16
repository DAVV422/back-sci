import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { handlerError } from '../../common/utils/handlerError.utils';
import { IStorageService, StoredObject } from '../../common/interfaces/storage.interface';
import { assertImageFile } from '../../common/services/storage/stored-files';
import { brandingKey, uniqueFileName } from '../../common/services/storage/storage-keys';
import { InstitutionEntity } from '../entities/institution.entity';
import { UpdateInstitutionDto } from '../dto/update-institution.dto';

/** Nombre por defecto cuando el despliegue no declara ninguno. */
export const DEFAULT_INSTITUTION_NAME = 'EmergIA';

/** Lo que la web y la app móvil necesitan para mostrar la marca, sin sesión. */
export interface PublicInstitution {
  readonly name: string;
  readonly shortName: string | null;
  /** Ruta del logo (`/api/institution/logo/<archivo>`) o `null` si no hay. */
  readonly logoUrl: string | null;
}

/**
 * La institución de esta instalación. Hay una sola fila: si no existe, se crea con lo que diga
 * el entorno (`INSTITUTION_NAME`, `INSTITUTION_SHORT_NAME`), que es como cada despliegue nace
 * con su nombre. A partir de ahí manda la base, para que el Admin la edite desde la aplicación.
 */
@Injectable()
export class InstitutionService {
  private readonly logger = new Logger('InstitutionService');

  constructor(
    @InjectRepository(InstitutionEntity)
    private readonly institutionRepository: Repository<InstitutionEntity>,
    @Inject('STORAGE_SERVICE')
    private readonly storage: IStorageService,
  ) {}

  async find(): Promise<InstitutionEntity> {
    try {
      const existing = await this.institutionRepository.findOne({ where: {}, order: { createdAt: 'ASC' } });
      if (existing) return existing;
      return await this.institutionRepository.save(
        this.institutionRepository.create({
          name: process.env.INSTITUTION_NAME?.trim() || DEFAULT_INSTITUTION_NAME,
          shortName: process.env.INSTITUTION_SHORT_NAME?.trim() || null,
        }),
      );
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  /** Lo que se publica sin sesión (pantalla de inicio de sesión incluida). */
  async findPublic(): Promise<PublicInstitution> {
    const institution = await this.find();
    return {
      name: institution.name,
      shortName: institution.shortName ?? null,
      logoUrl: institution.logoFileName ? `/api/institution/logo/${institution.logoFileName}` : null,
    };
  }

  async update(dto: UpdateInstitutionDto): Promise<InstitutionEntity> {
    try {
      const institution = await this.find();
      if (dto.name !== undefined) institution.name = dto.name.trim();
      if (dto.shortName !== undefined) institution.shortName = dto.shortName.trim() || null;
      return await this.institutionRepository.save(institution);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  /** Reemplaza el logo: guarda el nuevo y borra el anterior (el nombre lleva UUID, así no hay caché viejo). */
  async setLogo(file: Express.Multer.File): Promise<InstitutionEntity> {
    try {
      assertImageFile(file, 'El logo');
      const institution = await this.find();
      const previous = institution.logoFileName;
      const fileName = uniqueFileName('logo', file.originalname, '.png');
      await this.storage.put(brandingKey(fileName), file.buffer);
      institution.logoFileName = fileName;
      const saved = await this.institutionRepository.save(institution);
      if (previous) await this.storage.delete(brandingKey(previous)).catch(() => undefined);
      return saved;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async removeLogo(): Promise<InstitutionEntity> {
    try {
      const institution = await this.find();
      const previous = institution.logoFileName;
      institution.logoFileName = null;
      const saved = await this.institutionRepository.save(institution);
      if (previous) await this.storage.delete(brandingKey(previous)).catch(() => undefined);
      return saved;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  /** Solo sirve el logo vigente: un nombre viejo o inventado no abre ningún otro archivo. */
  async getLogo(fileName: string): Promise<StoredObject> {
    const institution = await this.find();
    if (!institution.logoFileName || institution.logoFileName !== fileName) {
      throw new NotFoundException('Logo no encontrado.');
    }
    return await this.storage.get(brandingKey(fileName));
  }
}
