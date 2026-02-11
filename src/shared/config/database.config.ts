import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const dbSsl =
    configService.get<string>('DB_SSL', 'false').toLowerCase() === 'true';

  const config: TypeOrmModuleOptions = {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_NAME', 'tourism_db'),
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
    logging: configService.get<boolean>('DB_LOGGING', false),
    migrations: [__dirname + '/../../database/migrations/**/*{.ts,.js}'],
    migrationsRun: configService.get<boolean>('DB_MIGRATIONS_RUN', false),
    // Connection pool settings
    extra: {
      max: configService.get<number>('DB_MAX_CONNECTIONS', 10),
      min: configService.get<number>('DB_MIN_CONNECTIONS', 2),
      idleTimeoutMillis: configService.get<number>('DB_IDLE_TIMEOUT', 30000),
      connectionTimeoutMillis: configService.get<number>(
        'DB_CONNECTION_TIMEOUT',
        2000,
      ),
    },
    // Only add SSL configuration if explicitly enabled
    ...(dbSsl && {
      ssl: {
        rejectUnauthorized: false,
      },
    }),
  };

  return config;
};
