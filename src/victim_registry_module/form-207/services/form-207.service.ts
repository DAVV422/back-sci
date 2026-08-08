import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form207Entity } from './../entities/form-207.entity';
import { CreateForm207Dto } from './../dto/create-form-207.dto';
import { UpdateForm207Dto } from './../dto/update-form-207.dto';

@Injectable()
export class Form207Service {
  constructor(
    @InjectRepository(Form207Entity)
    private readonly form207Repository: Repository<Form207Entity>,
  ) {}

  async create(createForm207Dto: CreateForm207Dto): Promise<Form207Entity> {
    const { emergency, ...createForm207 } = createForm207Dto;
    const form207 = this.form207Repository.create({
      ...createForm207,
      emergency: { id: emergency },
    });
    return await this.form207Repository.save(form207);
  }

  async findAll(): Promise<Form207Entity[]> {
    return await this.form207Repository.find();
  }

  async findOne(id: string): Promise<Form207Entity> {
    const form207 = await this.form207Repository.findOne({ where: { id } });
    if (!form207) {
      throw new NotFoundException(`Form207 with ID ${id} not found`);
    }
    return form207;
  }

  async update(
    id: string,
    updateForm207Dto: UpdateForm207Dto,
  ): Promise<Form207Entity> {
    const form207 = await this.findOne(id);
    const { emergency, ...updateForm207 } = updateForm207Dto;
    this.form207Repository.merge(form207, {
      ...updateForm207,
      emergency: { id: emergency },
    });
    return await this.form207Repository.save(form207);
  }

  async remove(id: string): Promise<void> {
    const form207 = await this.findOne(id);
    await this.form207Repository.remove(form207);
  }
}
