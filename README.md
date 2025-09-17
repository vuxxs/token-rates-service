# Token Rates Service

A lightweight NestJS HTTP service providing token-related utilities.

## Setup

### Install dependencies

```bash
npm i
```

### Configure environment

- You can use a `.env` file by copying `.env.example` at the project root or export variables in your shell
  ```bash
  export ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/<YOUR_KEY>"
  # Optional: tune polling interval (ms). Default: 5000
  export GAS_PRICE_POLL_INTERVAL_MS=5000
  ```

## API

### GET /gasPrice

Returns a recently fetched gas price for Ethereum mainnet. Implemented with background polling to ensure endpoint latency under 50ms by serving from in-memory cache.

- Method: GET
- Path: /gasPrice
- Success Response (200 application/json):
  ```json
  {
    "network": "ethereum-mainnet",
    "unit": "wei",
    "gasPrice": "28394723942",
    "fetchedAt": "2025-01-01T12:34:56.789Z",
    "ageMs": 1234,
    "source": "ETHEREUM_RPC_URL"
  }
  ```
- Error Response (503 application/json) when service has not yet fetched a snapshot:
  ```json
  {
    "statusCode": 503,
    "error": "Gas price not yet available",
    "message": "The service is initializing and has not fetched a gas price snapshot yet. Try again shortly."
  }
  ```

## Development

- Lint: `npm run lint`
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`

## Environment Variables

- `ETHEREUM_RPC_URL` (required): Mainnet RPC URL from Infura, Alchemy, or QuickNode
- `GAS_PRICE_POLL_INTERVAL_MS` (optional): Poll frequency in milliseconds (default 5000)
