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

### GET /return/:fromTokenAddress/:toTokenAddress/:amountIn

Estimates the output amount for a Uniswap V2 swap using cached on-chain reserves and the AMM formula (off-chain math only). The endpoint serves from in-memory cache to meet <50ms target latency; first-time requests for a pair may return 503 until warmed.

- Path params:
  - fromTokenAddress: ERC-20 token address (checksummed or lower/upper mixed OK)
  - toTokenAddress: ERC-20 token address
  - amountIn: integer string in smallest units (wei-like) for the fromToken
- Success Response (200 application/json):
  ```json
  {
    "network": "ethereum-mainnet",
    "unit": "wei",
    "fromToken": "0x...",
    "toToken": "0x...",
    "amountIn": "1000000000000000000",
    "amountOut": "9876543210",
    "pair": "0x...",
    "tokenIn": "0x...",
    "tokenOut": "0x...",
    "reserveIn": "1234567890123456789012",
    "reserveOut": "98765432109876543210",
    "feeBps": 30,
    "fetchedAt": "2025-01-01T12:34:56.789Z",
    "ageMs": 123
  }
  ```
- Error Responses:
  - 400: invalid address or amountIn
  - 404: pair does not exist on Uniswap V2
  - 422: insufficient liquidity for this trade size (amountOut = 0)
  - 503: reserves not yet available (warming)

Notes:

- amountIn/amountOut are returned in smallest units. No decimals conversion is performed.
- Reserves are refreshed periodically; you can tune the poll interval via environment variable.

## Development

- Lint: `npm run lint`
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`

## Environment Variables

- `ETHEREUM_RPC_URL` (required): Mainnet RPC URL from Infura, Alchemy, or QuickNode
- `GAS_PRICE_POLL_INTERVAL_MS` (optional): Gas price poll frequency in ms (default 5000)
- `UNI_V2_POLL_INTERVAL_MS` (optional): Uniswap V2 reserves poll frequency in ms (default 5000)
- `UNI_V2_FACTORY_ADDRESS` (optional): Uniswap V2 factory address (defaults to mainnet)
