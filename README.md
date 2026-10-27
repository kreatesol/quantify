# Quantify

Quantify turns everyday receipts into a clear picture of spending, item by item, and predicts what a buyer will need next. Sellers use opted-in buying patterns to send timely offers, including when a buyer is near their shop. Version 1 launches in India only.

- [Product spec](docs/product-spec.md)
- [Technical architecture](docs/architecture.md)

## What's here

| Path | What it is |
| --- | --- |
| `apps/buyer` | Buyer app for Android, iOS and the web (Expo, React Native) |
| `services/api` | Backend API (Node.js, Fastify, PostgreSQL) |
| `packages/shared` | Code shared by the apps and the API, such as phone number rules |

## Development setup

Development runs in AWS US East (`us-east-1`) and accepts both Indian (+91) and US (+1) mobile numbers. Production moves to Mumbai and India-only numbers.

You need Node.js 22, pnpm 10 and Docker.

```bash
pnpm install
pnpm db:up                                  # PostgreSQL with PostGIS on localhost:5432
cp services/api/.env.example services/api/.env
pnpm dev:api                                # API on http://localhost:3000
pnpm dev:buyer                              # Expo dev server; press w for web
```

With `SMS_PROVIDER=console` (the default), login codes are printed in the API log instead of being texted. Set `SMS_PROVIDER=sns` to send real SMS through AWS SNS; sending to US numbers needs a registered origination number (such as a toll-free number) in the AWS account.

### Tests

API tests need a PostgreSQL database named `quantify_test`:

```bash
docker compose exec postgres createdb -U quantify quantify_test
pnpm typecheck
pnpm test
```

## Phone login API

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| POST | `/auth/otp/request` | `{ "phone": "+14155552671" }` | Texts a 6-digit code, valid 5 minutes |
| POST | `/auth/otp/verify` | `{ "phone": "...", "code": "123456" }` | `{ token, user, isNewUser }`; creates the account on first login |
| GET | `/me` | Bearer token | The signed-in user |

Limits: one code per 30 seconds and five per hour for each number; a code locks after five wrong tries.
