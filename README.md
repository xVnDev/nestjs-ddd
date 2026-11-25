# nestjs-ddd

DDD-first, secure-by-default NestJS 12 production boilerplate.

![version](https://img.shields.io/badge/version-1.0.0-blue) <!-- keep in sync with package.json -->

## Prerequisites

- Node.js LTS
- Docker (optional, for local Postgres/Redis)

## Install

```bash
npm install
```

## Run

```bash
npm run start:dev
```

## Test

```bash
npm run test
npm run test:unit
npm run test:e2e
npm run test:cov
npm run typecheck
npm run lint
```

## Directory map

```
src/
├── common/        # config, logger, fixtures, crypto, middleware
└── modules/       # bounded contexts (health, ...)
```

## Security

See [SECURITY.md](./SECURITY.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

See [LICENSE](./LICENSE).

## Compliance targets

ISO/IEC 27001:2022 Annex A · OWASP ASVS 4.0 L2 · HIPAA Security Rule §164.312 · GDPR Art. 32
