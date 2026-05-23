# Deploying CodeVisionAI

Two services: **API on Render** (FastAPI + tracers in a Docker image),
**web on Vercel** (Next.js).

## 1. Backend — Render

1. From the Render dashboard, create a new **Blueprint** and point it at
   this repo. Render reads `render.yaml`, builds `apps/api/Dockerfile`,
   and provisions `codevisionai-api` on the Starter plan.
2. After the first build, open the service → Environment, and set:
   - `CVAI_ALLOWED_ORIGINS` — the production Vercel URL, comma-separated.
     e.g. `https://codevisionai.vercel.app`. Wildcards are not supported
     by FastAPI's CORS middleware in credentialed mode, so list every
     deploy preview origin you want to allow.
3. Health-check path is already wired to `/api/v1/health/`; Render will
   restart the container if it stops returning 200.
4. The image installs `gcc`, `g++`, `gdb`, and `default-jdk-headless`,
   so the C/C++ and Java tracers work out of the box. No system tuning
   needed for the Starter plan.

The free 750-hour Starter plan is enough for a class-sized deploy.
Bump to Standard if cold-start latency becomes an issue.

## 2. Frontend — Vercel

1. Import the repo into Vercel. The `apps/web/vercel.json` declares the
   monorepo build command (`npm run build --workspace=web`) and output
   path (`apps/web/.next`).
2. In Project → Settings → Environment Variables, add:
   - `NEXT_PUBLIC_API_URL` = the Render URL, e.g.
     `https://codevisionai-api.onrender.com` (no trailing slash).
3. Vercel handles preview deploys per-branch; remember to add their
   `*-yourteam.vercel.app` URLs to `CVAI_ALLOWED_ORIGINS` if you want
   them to talk to the production backend.

## 3. Smoke test the live stack

```bash
# Backend alive
curl https://codevisionai-api.onrender.com/api/v1/health/

# Mock execution stream
curl -N -X POST https://codevisionai-api.onrender.com/api/v1/execute/stream \
     -H 'Content-Type: application/json' \
     -d '{"language":"mock","code":"x\ny\nz"}'
```

The browser flow: open the Vercel URL, pick a language, type code, press
Run. Server-backed languages (`c`, `cpp`, `java`) stream STEP / OUTPUT /
INPUT_REQUEST events through the SSE channel; Python runs entirely in
the browser via Pyodide and never touches the backend.

## 4. Cost / scaling notes

- The backend is **single-process**. The in-memory `InMemorySessionBus`
  + `TokenBucketLimiter` only work because there is one replica. Going
  horizontal (multiple Render replicas) requires Redis-backed swaps —
  see `apps/api/app/core/session_bus.py` and `core/rate_limit.py`.
- Each /execute request spawns a compiler + GDB / JDI subprocess. The
  Starter plan's 0.5 vCPU / 512 MB RAM caps concurrent sessions at
  roughly 4–6. Render's per-service request log will show 429s when the
  limiter kicks in.
- Render does **not** preserve `.build/` for the Java tracer across cold
  starts; the first request after a redeploy pays a ~2 s `javac` cost.
  That's intentional — bundling pre-built classes would tie the image
  to a JDK version we'd have to bump in lockstep with Render's base.
