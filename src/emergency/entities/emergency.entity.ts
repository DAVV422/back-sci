import { Column, Entity, ManyToOne, OneToMany, OneToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { UserEntity } from "../../user/entities/user.entity";
import { Form201Entity } from "../../form-201/entities/form-201.entity";
// import { Form207Entity } from "../../form-207/entities/form-207.entity";
// import { ImageEntity } from "../../media/entities/image.entity";
// import { SpecificDateEntity } from "../../specific-dates/entities/specific-date.entity";
// import { Form211Entity } from "../../form-211/entities/form-211.entity";
// import { ResourceEntity } from "../../resource/entities/resource.entity";
import { AttendEntity } from "src/attends/entities/attends.entity";
import { ResourceEntity } from "src/resource/entities/resource.entity";
import { ActionEntity } from "src/action/entities/action.entity";

@Entity({ name: 'emergency' })
export class EmergencyEntity extends BaseEntity {

    @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
    name: string;

    @Column({ name: 'location_description', type: 'varchar', length: 255, nullable: true })
    location_description?: string;

    @Column({ name: 'date', type: 'varchar', nullable: false })
    date: Date;

    @Column({ name: 'hour', type: 'varchar', nullable: false })
    hour: string;

    @Column({ name: 'type', type: 'varchar', length: 50, nullable: false })
    type: string;

    @Column({ 
        name: 'coordinates', 
        type: 'simple-array', 
        nullable: true, 
        comment: 'Array with latitude and longitude'
    })
    coordinates?: number[];

    @Column({ 
        name: 'coordinates_pc', 
        type: 'simple-array', 
        nullable: true, 
        comment: 'Array with longitude and latitude'
    })
    coordinates_pc?: number[];

    @Column({ 
        name: 'coordinates_e', 
        type: 'simple-array', 
        nullable: true, 
        comment: 'Array with longitude and latitude'
    })
    coordinates_e?: number[];

    @Column({ name: 'state', type: 'varchar', length: 50, default: 'en curso' })
    state: string;

    @Column({ name: 'duration', type: 'varchar', length: 50, default: '' })
    duration: string;

    @OneToMany(() => Form201Entity, (form201) => form201.emergency, { nullable: true, onDelete: 'CASCADE' })
    form201?: Form201Entity[];

    @ManyToOne(() => UserEntity, (user) => user.emergencies, { nullable: true, onDelete: 'CASCADE' })
    user: UserEntity;

    @OneToMany(() => AttendEntity, (attend) => attend.emergency, { nullable: true, onDelete: 'CASCADE' })
    attends?: AttendEntity[];

    @OneToMany(() => ActionEntity, (action) => action.emergency)
    actions: ActionEntity[];

    @OneToMany(() => ResourceEntity, (resource) => resource.equipment)
    resources?: ResourceEntity[];

    // @OneToMany(() => Form207Entity, form207 => form207.emergency)
    // form207: Form207Entity[];

    // @OneToMany(() => ImageEntity, image => image.emergency)
    // images: ImageEntity[];

    // @OneToOne(() => SpecificDateEntity)
    // @JoinColumn()
    // specificDate: SpecificDateEntity;

    // @OneToMany(() => Form211Entity, form211 => form211.emergency)
    // form211: Form211Entity[];

    // @OneToMany(() => ResourceEntity, resource => resource.emergency)
    // resources: ResourceEntity[];
}
