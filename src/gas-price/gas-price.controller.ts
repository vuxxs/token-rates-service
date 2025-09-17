import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { GasPriceService } from './gas-price.service';

@Controller('gasPrice')
export class GasPriceController {
  constructor(private readonly gasPriceService: GasPriceService) {}

  @Get()
  getGasPrice() {
    const snap = this.gasPriceService.getLatest();
    if (!snap) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'Gas price not yet available',
          message:
            'The service is initializing and has not fetched a gas price snapshot yet. Try again shortly.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const ageMs = Date.now() - snap.fetchedAt;
    return {
      network: 'ethereum-mainnet',
      unit: 'wei',
      gasPrice: snap.gasPriceWei.toString(),
      fetchedAt: new Date(snap.fetchedAt).toISOString(),
      ageMs,
      source: 'ETHEREUM_RPC_URL',
    };
  }
}
