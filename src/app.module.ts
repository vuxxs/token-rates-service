import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GasPriceModule } from './gas-price/gas-price.module';
import { UniswapV2Module } from './uniswap-v2/uniswap-v2.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GasPriceModule,
    UniswapV2Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
