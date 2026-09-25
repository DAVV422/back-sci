import { Test, TestingModule } from '@nestjs/testing';

import { AttendController } from './attends.controller';
import { AttendService } from '../services/attends.service';
import { UserService } from '../../../user/services/user.service';
import { ROLES, ROLES_KEY } from '../../../common/constants';
import { AuthGuard, RolesGuard } from '../../../auth/guards';

describe('AttendController', () => {
  let controller: AttendController;
  const mockService = {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByEmergency: jest.fn(),
    findByUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendController],
      providers: [
        { provide: AttendService, useValue: mockService },
        { provide: UserService, useValue: { findOneAuth: jest.fn() } },
        { provide: AuthGuard, useValue: { canActivate: jest.fn() } },
        { provide: RolesGuard, useValue: { canActivate: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AttendController>(AttendController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('protege la clase con AuthGuard y RolesGuard (AC1)', () => {
    const guards = Reflect.getMetadata('__guards__', AttendController) || [];
    expect(guards).toEqual(expect.arrayContaining([AuthGuard, RolesGuard]));
  });

  const rolesOf = (method: string) => {
    const handler = (controller as any)[method];
    return Reflect.getMetadata(ROLES_KEY, handler);
  };

  it('permite acceso desde rol BASIC para mutaciones con autorización táctica en servicio (AC2)', () => {
    expect(rolesOf('create')).toContain(ROLES.BASIC);
    expect(rolesOf('update')).toContain(ROLES.BASIC);
    expect(rolesOf('delete')).toContain(ROLES.BASIC);
  });

  it('requiere rol mínimo BASIC para los GET (AC3)', () => {
    expect(rolesOf('findOne')).toContain(ROLES.BASIC);
    expect(rolesOf('findByEmergency')).toContain(ROLES.BASIC);
    expect(rolesOf('findByUser')).toContain(ROLES.BASIC);
  });

  it('PATCH /:id delega en el servicio con el chargeId (AC4)', async () => {
    mockService.update.mockResolvedValue({ id: 'att-1' });

    const result = await controller.update(
      'att-1',
      {
        chargeId: 'ch-2',
      } as any,
      'user-1',
      ROLES.ADMIN,
    );

    expect(mockService.update).toHaveBeenCalledWith(
      'att-1',
      {
        chargeId: 'ch-2',
      },
      'user-1',
      ROLES.ADMIN,
    );
    expect(result.data).toEqual({ id: 'att-1' });
  });
});
