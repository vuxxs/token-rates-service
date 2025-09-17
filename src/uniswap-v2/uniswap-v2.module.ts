import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UniswapV2Controller } from './uniswap-v2.controller';
import { UniswapV2Service } from './uniswap-v2.service';

@Module({
  imports: [ConfigModule],
  controllers: [UniswapV2Controller],
  providers: [UniswapV2Service],
  exports: [UniswapV2Service],
})
export class UniswapV2Module {}
