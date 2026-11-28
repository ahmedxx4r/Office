# Dawwar (دوّار) — AI Workforce Platform

> شغلك داير، وفريقك حاضر. Dawwar is a NEXLOVA product: a virtual AI company in a 3D office. The Arabic landing page is the site entry (`client/index.html`); the office app lives at `/office` (`client/office.html`). The Vercel project is `dawwar` and the product branding is Dawwar everywhere.

A full-screen, isometric 3D office simulation for managing a team of AI employees. The main interaction is the office floor itself: select an employee in the scene to open their profile, chat with them, assign work, inspect their output, or invite them to a meeting.

## Product experience

- Large isometric 3D office with workstations, meeting room, lounge, recreation zone, plants, windows and office props.
- Low-poly human employee avatars with live status labels and movement between work areas.
- Pan, orbit, zoom, reset camera, and click-to-select employees.
- Direct employee chat, task assignment and meeting invitations for the six-person NEXLOVA team (Marketing, Data, Finance, Content, Development, HR & Operations).
- Marketing specialist Omar can publish and schedule Facebook/Instagram posts through Buffer (see `docs/publishing-api.md`).
- Task lifecycle: Queued → In Progress → Completed (or Failed, with retry).
- Server-side integrations: Microsoft Graph email/calendar endpoints and Twilio voice notification (need provider credentials).
- Planned / not yet wired end to end: the server emits live state over Socket.IO and has Web Push support, but the current frontend does not yet subscribe to Socket.IO or register the push service worker.

## Architecture

This repository is an npm-workspaces monorepo:

- `client/`: React + Vite + Three.js frontend. Deploys to Vercel as a static web app.
- `server/`: Express + Socket.IO API and BullMQ worker. Runs as a persistent Node service (Render Blueprint included).
- PostgreSQL: durable shared state store.
- Redis: BullMQ task queue.
- `server/src/agents.js`: the six employees and their system prompts (see `docs/agent-prompts.md`).
- `DEPLOYMENT.md`: GitHub + Vercel + API deployment guide.

The API/worker is intentionally not deployed as a Vercel static function. A BullMQ worker and Socket.IO server need a persistent runtime. Vercel hosts the frontend and automatically deploys it from GitHub; Render hosts the persistent API/worker; managed PostgreSQL and Redis provide storage/queue services.

## Local development (Windows PowerShell)

```powershell
npm install
Copy-Item server/.env.example server/.env
# Start Docker Desktop first, then:
docker compose up -d postgres redis
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:4000`.

If Docker is not installed, use managed PostgreSQL/Redis and put their connection strings in `server/.env`. For a UI-only preview, the API must still be running because employee/task state is served by the API.

## Production setup

Follow [DEPLOYMENT.md](./DEPLOYMENT.md). Never commit `.env`, API keys, owner passwords, database URLs, Redis URLs, or Vercel tokens.

## Commands

```bash
npm install       # install workspace dependencies
npm run dev       # run API + frontend locally
npm run build     # build the Vite frontend
npm test          # run server tests
npm start         # start persistent API/worker (production)
```

## Environment variables

See `server/.env.example` and `client/.env.example`. Only `VITE_API_URL` and `VITE_SOCKET_URL` are public browser configuration. All credentials belong in the server host's secret environment variables.

## Current limitations

- Employee models are procedural low-poly characters, not motion-captured or rigged human models.
- Movement is status-driven waypoint interpolation; advanced collision-aware navigation is a future enhancement.
- PostgreSQL currently stores the workspace state as a JSONB snapshot. It is persistent, but not yet normalized into relational task/agent/message tables.
- Push/email/calendar/voice integrations require the corresponding provider credentials and permissions.
- Verify production build, database migrations/backups, API availability and browser behavior in the target hosting accounts before treating this as production-ready.


## Owner-only access
Set `OWNER_PASSWORD` as a server-side environment variable before sharing the site. The app then requires sign-in and protects API and realtime connections. Never commit the password to GitHub.
