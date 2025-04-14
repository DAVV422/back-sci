import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ROLES } from '../../common/constants';
import { UserEntity } from '../entities/user.entity';

export class UserDTO {

    @ApiProperty({
        example: 'AILAS132-1234',
        type: String,
        description: 'ID del usuario',
    })
    @IsNotEmpty()
    @IsString()
    id: string;

    @ApiProperty({
        example: 'John',
        type: String,
        description: 'Nombre del usuario',
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    name: string;

    @ApiProperty({
        example: 'Doe',
        type: String,
        description: 'Apellido del usuario',
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    last_name: string;

    @ApiProperty({
        example: 'john@live.com',
        type: String,
        description: 'Correo electrónico del usuario',
    })
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    email: string;

    @ApiProperty({
        example: '67303349',
        type: String,
        description: 'Número de celular del usuario',
    })
    @IsOptional()
    @IsString()
    @MinLength(8)
    cellphone?: string;

    @ApiProperty({
        example: 'Capitán',
        type: String,
        description: 'Grado Jerárquico del usuario',
    })
    @IsOptional()
    @IsString()
    grade?: string;

    @ApiProperty({
        example: 'https://scontent.fsrz1-1.fna.fbcdn.net/v/t39.30808-6/321514687_828263794936611_9117207435075792485_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=5f2048&_nc_ohc=DZ3kknwy0MYQ7kNvgGpd28s&_nc_ht=scontent.fsrz1-1.fna&oh=00_AYDVBsizxPljlSdcHXm_2eM9syvkH1X9sUTlOzLPSBbsNw&oe=667B65BB',
        type: String,
        description: 'Url de la imagen de foto de perfil',
    })
    @IsOptional()
    @IsString()
    url_image?: string;

    @ApiProperty({
        example: '2023-01-01',
        type: Date,
        description: 'Fecha de nacimiento del usuario',
    })
    birthdate?: Date;

    @ApiProperty({
        example: true,
        type: Boolean,
        description: 'Estado del usuario en la institución',
    })
    @IsBoolean()
    is_active: boolean;

    @IsEnum(ROLES)
    role: ROLES;

    public constructor(user: UserEntity) {
        this.id = user.id;
        this.name = user.name;
        this.last_name = user.last_name;
        this.email = user.email;
        this.cellphone = user.cellphone;
        this.grade = user.grade;
        this.url_image = user.url_image;
        this.birthdate = user.birthdate;
        this.is_active = user.is_active;
        this.role = user.role;
    }
}