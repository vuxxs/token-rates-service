import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { UniswapV2Service } from './uniswap-v2.service';
import { isAddressLike } from './uniswap-v2.types';

@Controller('return')
export class UniswapV2Controller {
  constructor(private readonly svc: UniswapV2Service) {}

  @Get(':fromTokenAddress/:toTokenAddress/:amountIn')
  async getReturn(
    @Param('fromTokenAddress') fromToken: string,
    @Param('toTokenAddress') toToken: string,
    @Param('amountIn') amountInStr: string,
  ) {
    if (!isAddressLike(fromToken)) {
      throw new HttpException(
        { statusCode: 400, error: 'Invalid fromTokenAddress' },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!isAddressLike(toToken)) {
      throw new HttpException(
        { statusCode: 400, error: 'Invalid toTokenAddress' },
        HttpStatus.BAD_REQUEST,
      );
    }

    let amountIn: bigint;
    try {
      if (!/^[0-9]+$/.test(amountInStr)) throw new Error('not integer');
      amountIn = BigInt(amountInStr);
    } catch {
      throw new HttpException(
        {
          statusCode: 400,
          error: 'Invalid amountIn (must be integer string in smallest units)',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (amountIn <= 0n) {
      throw new HttpException(
        { statusCode: 400, error: 'amountIn must be > 0' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const status = await this.svc.getPairStatus(fromToken, toToken);
    if (status === 'NO_PAIR') {
      throw new HttpException(
        { statusCode: 404, error: 'Pair does not exist on Uniswap V2' },
        HttpStatus.NOT_FOUND,
      );
    }
    if (status !== 'READY') {
      throw new HttpException(
        {
          statusCode: 503,
          error: 'Reserves not yet available',
          message: 'The service is warming this pair. Try again shortly.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const result = await this.svc.estimateReturn(fromToken, toToken, amountIn);

    if (!result) {
      throw new HttpException(
        { statusCode: 503, error: 'Unavailable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (result.amountOut === 0n) {
      throw new HttpException(
        {
          statusCode: 422,
          error: 'Insufficient liquidity for this trade size',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return {
      network: 'ethereum-mainnet',
      unit: 'wei',
      fromToken,
      toToken,
      amountIn: amountIn.toString(),
      amountOut: result.amountOut.toString(),
      ...result.meta,
    };
  }
}
