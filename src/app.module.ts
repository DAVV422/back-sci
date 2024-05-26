import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceConfig } from './config/data.source';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ProvidersModule } from './providers/providers.module';
import { CommonModule } from './common/common.module';
import { SeederModule } from './seeder/seeder.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ActionModule } from './action/action.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRoot({ ...DataSourceConfig }),
    MongooseModule.forRoot(process.env.URL_MONGO),
    ProvidersModule,
    CommonModule,
    UserModule,
    AuthModule,
    SeederModule,
    ActionModule,
  ],
})
export class AppModule {}