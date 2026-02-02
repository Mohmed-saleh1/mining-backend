import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { getDatabaseConfig } from './shared';
import { ContactUsModule } from './contact-us/contact-us.module';
import { MiningMachinesModule } from './mining-machines/mining-machines.module';
import { WalletsModule } from './wallets/wallets.module';

@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),

    // Database Module
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),

    // Shared Module (S3, Upload Services)
    SharedModule,

    // Auth Module
    AuthModule,

    // User Management Module
    UsersModule,

    // Contact Us Module
    ContactUsModule,

    // Mining Machines Module
    MiningMachinesModule,

    // Wallets Module
    WalletsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
