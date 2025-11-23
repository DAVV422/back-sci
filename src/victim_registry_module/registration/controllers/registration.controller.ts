import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegistrationService } from '../services/registration.service';
import { CreateRegistrationDto } from '../dto/create-registration.dto';
import { UpdateRegistrationDto } from '../dto/update-registration.dto';
import { RegistrationEntity } from '../entities/registration.entity';

@ApiTags('Registration')
@Controller('registration')
export class RegistrationController {
    constructor(private readonly registrationService: RegistrationService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new registration' })
    @ApiResponse({ status: 201, description: 'The registration has been successfully created.', type: RegistrationEntity })
    async create(@Body() createRegistrationDto: CreateRegistrationDto) {
        return {
            statusCode: 201,
            data: await this.registrationService.create(createRegistrationDto),
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get all registrations' })
    @ApiResponse({ status: 200, description: 'Return all registrations.', type: [RegistrationEntity] })
    async findAll() {
        return {
            statusCode: 200,
            data: await this.registrationService.findAll(),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a registration by ID' })
    @ApiResponse({ status: 200, description: 'Return the registration.', type: RegistrationEntity })
    @ApiResponse({ status: 404, description: 'Registration not found.' })
    async findOne(@Param('id') id: string) {
        return {
            statusCode: 200,
            data: await this.registrationService.findOne(id),
        };
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a registration' })
    @ApiResponse({ status: 200, description: 'The registration has been successfully updated.', type: RegistrationEntity })
    @ApiResponse({ status: 404, description: 'Registration not found.' })
    async update(@Param('id') id: string, @Body() updateRegistrationDto: UpdateRegistrationDto) {
        return {
            statusCode: 200,
            data: await this.registrationService.update(id, updateRegistrationDto),
        };
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a registration' })
    @ApiResponse({ status: 200, description: 'The registration has been successfully deleted.' })
    @ApiResponse({ status: 404, description: 'Registration not found.' })
    async remove(@Param('id') id: string) {
        return {
            statusCode: 200,
            data: await this.registrationService.remove(id),
        };
    }
}
