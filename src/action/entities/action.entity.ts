
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { IAction } from '../interfaces/action.interface';

@Entity({ name: 'action' })
export class ActionEntity extends BaseEntity implements IAction {
  @Column()
  description: string;

  @Column()
  date: Date;

  @Column()
  hour: string;
}
