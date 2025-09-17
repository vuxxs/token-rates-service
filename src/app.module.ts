import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GasPriceModule } from './gas-price/gas-price.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), GasPriceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
