import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Form207Service } from '../services/form-207.service';
import { CreateForm207Dto } from '../dto/create-form-207.dto';
import { UpdateForm207Dto } from '../dto/update-form-207.dto';
import { Form207Entity } from '../entities/form-207.entity';

@ApiTags('Form 207')
@Controller('form-207')
export class Form207Controller {
    constructor(private readonly form207Service: Form207Service) { }

    @Post()
    @ApiOperation({ summary: 'Create a new Form 207' })
    @ApiResponse({ status: 201, description: 'The form has been successfully created.', type: Form207Entity })
    async create(@Body() createForm207Dto: CreateForm207Dto) {
        return {
            statusCode: 201,
            data: await this.form207Service.create(createForm207Dto),
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get all Form 207 records' })
    @ApiResponse({ status: 200, description: 'Return all records.', type: [Form207Entity] })
    async findAll() {
        return {
            statusCode: 200,
            data: await this.form207Service.findAll(),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a Form 207 by ID' })
    @ApiResponse({ status: 200, description: 'Return the record.', type: Form207Entity })
    @ApiResponse({ status: 404, description: 'Record not found.' })
    async findOne(@Param('id') id: string) {
        return {
            statusCode: 200,
            data: await this.form207Service.findOne(id),
        };
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a Form 207' })
    @ApiResponse({ status: 200, description: 'The record has been successfully updated.', type: Form207Entity })
    @ApiResponse({ status: 404, description: 'Record not found.' })
    async update(@Param('id') id: string, @Body() updateForm207Dto: UpdateForm207Dto) {
        return {
            statusCode: 200,
            data: await this.form207Service.update(id, updateForm207Dto),
        };
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a Form 207' })
    @ApiResponse({ status: 200, description: 'The record has been successfully deleted.' })
    @ApiResponse({ status: 404, description: 'Record not found.' })
    async remove(@Param('id') id: string) {
        return {
            statusCode: 200,
            data: await this.form207Service.remove(id),
        };
    }
}
