import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

ConfigModule.forRoot({ envFilePath: '.env' });
const configService = new ConfigService();

/**
 * DB_SSL: `false` (Postgres en el mismo servidor), `true` (TLS verificando el certificado) o
 * `no-verify` (TLS sin verificar: solo si el proveedor no da un certificado válido). Sin definir,
 * se mantiene lo anterior: TLS sin verificar en producción y sin TLS en desarrollo.
 */
export function databaseSsl(value: string | undefined, isProduction: boolean): false | { rejectUnauthorized: boolean } {
  const mode = (value ?? (isProduction ? 'no-verify' : 'false')).toLowerCase();
  if (mode === 'true' || mode === 'verify') return { rejectUnauthorized: true };
  if (mode === 'no-verify') return { rejectUnauthorized: false };
  return false;
}

export const DataSourceConfig: DataSourceOptions = {
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  entities: [__dirname + '/../**/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  // El esquema se versiona con migraciones (src/migrations), que corren solas al arrancar.
  // `synchronize` alteraba las tablas según las entidades y podía borrar columnas con datos;
  // queda solo como herramienta puntual de desarrollo (DB_SYNCHRONIZE=true), nunca en producción.
  synchronize: configService.get('DB_SYNCHRONIZE') === 'true' && configService.get('APP_PROD') !== 'true',
  migrationsRun: configService.get('DB_MIGRATIONS_RUN') !== 'false',
  logging: false,
  extra: {
    ssl: databaseSsl(configService.get('DB_SSL'), configService.get('APP_PROD') === 'true'),
    timezone: 'America/La_Paz',
  },
  namingStrategy: new SnakeNamingStrategy(),
};

export const AppDS = new DataSource(DataSourceConfig);
