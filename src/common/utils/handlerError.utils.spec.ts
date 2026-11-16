import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { handlerError } from './handlerError.utils';

describe('handlerError', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = { warn: jest.fn(), error: jest.fn() } as unknown as Logger;
  });

  /** Lanza y devuelve el error, para poder revisar su mensaje. */
  const capturar = (error: unknown): any => {
    try {
      handlerError(error, logger);
      throw new Error('handlerError debía lanzar');
    } catch (e) {
      return e;
    }
  };

  it('deja pasar las excepciones HTTP tal cual, y las registra como aviso', () => {
    const original = new ForbiddenException('No tienes permisos.');
    expect(capturar(original)).toBe(original);
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  describe('errores de PostgreSQL', () => {
    // El `detail` de Postgres trae el valor que chocó: devolverlo mostraba el dato de otra persona
    // («Key (email)=(juan@ejemplo.com) already exists») y los nombres internos del esquema.
    const duplicado = {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
      detail: 'Key (email)=(juan@ejemplo.com) already exists.',
      constraint: 'UQ_user_email',
    };

    it('traduce el duplicado a 409 nombrando el campo, nunca el valor', () => {
      const error = capturar(duplicado);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toBe('Ya existe un registro con ese correo electrónico.');
    });

    it('no filtra el valor, ni el detalle, ni el nombre de la restricción', () => {
      const texto = JSON.stringify(capturar(duplicado).getResponse());
      expect(texto).not.toContain('juan@ejemplo.com');
      expect(texto).not.toContain('UQ_user_email');
      expect(texto).not.toContain('already exists');
    });

    it('sí deja el detalle crudo en el registro del servidor, que es donde hace falta', () => {
      capturar(duplicado);
      const registrado = (logger.error as jest.Mock).mock.calls[0][0];
      expect(registrado).toContain('code=23505');
      expect(registrado).toContain('juan@ejemplo.com');
    });

    it('usa el nombre de la columna cuando no tiene traducción conocida', () => {
      const error = capturar({ ...duplicado, detail: 'Key (plate_number)=(ABC-123) already exists.' });
      expect(error.message).toBe('Ya existe un registro con ese plate number.');
      expect(error.message).not.toContain('ABC-123');
    });

    it('sin detalle reconocible, da un mensaje genérico', () => {
      const error = capturar({ code: '23505', message: 'duplicate', detail: 'otra cosa' });
      expect(error.message).toBe('Ya existe un registro con esos datos.');
    });

    it('traduce la llave foránea sin exponer tablas', () => {
      const error = capturar({
        code: '23503',
        detail: 'Key (user_id)=(abc) is still referenced from table "attend".',
      });
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).not.toContain('attend');
      expect(error.message).not.toContain('abc');
    });

    it('traduce el campo obligatorio nombrando la columna', () => {
      const error = capturar({ code: '23502', column: 'email' });
      expect(error.message).toBe('Falta un dato obligatorio: correo electrónico.');
    });

    it.each([
      ['22P02', 'formato no válido'],
      ['23514', 'regla de validación'],
      ['22001', 'más largo de lo permitido'],
    ])('traduce el código %s a un mensaje en español', (code, fragmento) => {
      expect(capturar({ code }).message).toContain(fragmento);
    });
  });

  it('un error desconocido se convierte en 500 sin filtrar el mensaje interno', () => {
    const error = capturar(new Error('connect ECONNREFUSED 10.0.0.5:5432'));
    expect(error).toBeInstanceOf(InternalServerErrorException);
    expect(JSON.stringify(error.getResponse())).not.toContain('10.0.0.5');
  });

  it('traduce el 404 interno sin devolver el detalle', () => {
    const error = capturar({ type: 'Not Found', detail: 'tabla interna xyz' });
    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.message).not.toContain('xyz');
  });
});
