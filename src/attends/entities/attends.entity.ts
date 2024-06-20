import { Column, Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { UserEntity } from "../../user/entities/user.entity";
import { Form201Entity } from "../../form-201/entities/form-201.entity";
import { IAttend } from "../interfaces/attend.interface";
import { EmergencyEntity } from "src/emergency/entities/emergency.entity";

@Entity({ name: 'attend' })
export class AttendEntity extends BaseEntity implements IAttend {

    @Column({ name: 'position', type: 'varchar', length: 100, nullable: false })
    position: string;

    @Column({ name: 'date', type: 'date', nullable: false })
    date: Date;

    @ManyToOne(() => UserEntity, user => user.attends, { nullable: false, onDelete: 'CASCADE' })
    user: UserEntity;

    @ManyToOne(() => EmergencyEntity, emergency => emergency.attends, { nullable: false, onDelete: 'CASCADE' })
    emergency: EmergencyEntity;
}
