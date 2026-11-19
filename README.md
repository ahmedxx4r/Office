# Virtual AI Office

A 3D isometric virtual office for supervising a modular AI workforce. The office is the main interface: select an employee in the scene, inspect their activity, chat, or assign work. A General Manager agent coordinates specialist agents.

## Stack
- Frontend: React, Vite, Three.js
- API/realtime: Node.js, Express, Socket.IO
- Agent orchestration: modular agent registry and task lifecycle
- Persistence/queue: PostgreSQL and Redis/BullMQ adapters
- Frontend hosting: Vercel
- Persistent API/worker hosting: Render (Blueprint: `render.yaml`)

## Local development
```powershell
npm install
Copy-Item server/.env.example server/.env
docker compose up -d postgres redis
npm run dev
```
Open http://localhost:5173.

## Checks
```bash
npm test
npm run build
```

## Deployment
Read [DEPLOYMENT.md](./DEPLOYMENT.md) before configuring production. Vercel serves the frontend; the persistent Express/Socket.IO API and queue worker run as a long-lived service. Do not put the worker process or Redis queue consumer in a Vercel serverless function.

## Security
- Never commit `.env` files or secrets.
- Set production credentials in hosting-provider environment settings.
- Use a strong owner password and unique auth secret.
- Configure API CORS to the exact Vercel origin.
