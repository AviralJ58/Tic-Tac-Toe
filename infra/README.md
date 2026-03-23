# Infrastructure

Use Docker Compose to start local PostgreSQL + Nakama:

```bash
cd infra
docker compose up -d
```

Frontend dev:

```bash
cd frontend
npm install
npm run dev
```

Nakama module build:

```bash
cd nakama
npm install
npm run build
```
