# DIMENFLOW — FIBOx3D Studio

FIBOx3D Studio turns AI-generated 2D interior scenes into an editable 3D workspace. Scenes are generated as structured JSON with Bria FIBO, every edit is tracked as a snapshot with a textual diff, and a scene can be converted into a 3D layout that you edit in the browser.

The full project write-up, demo video and screenshots are in [`fibox3dstudio/README.md`](fibox3dstudio/README.md).

## Repository layout

| Path | What it is |
|---|---|
| `fibox3dstudio/frontend/` | Vue + Vite web app (Babylon.js 3D viewer, editing UI) |
| `fibox3dstudio/backend/` | Node.js (Fastify) API — Supabase auth/storage, Bria FIBO, Gemini and fal.ai calls (`fiboto3d.js`) |
| `fibox3dstudio/backend/triposr_generate.py` | Optional local image-to-3D generation with TripoSR |
| `fibox3dstudio/backend/TripoSR/` | Vendored copy of [TripoSR](https://github.com/VAST-AI-Research/TripoSR) (its own LICENSE applies) |
| `fibox3dstudio/backend/supabase-schema.sql` | Database schema and storage policies |

## Run locally

Requirements: Node.js 18+, a Supabase project, and API keys for Bria, Google Gemini and fal.ai.

```bash
# backend
cd fibox3dstudio/backend
cp .env.example .env   # fill in your own keys — never commit this file
npm install
npm run dev

# frontend (new terminal)
cd fibox3dstudio/frontend
npm install
npm run dev
```

Detailed steps: [`SETUP_GUIDE.md`](fibox3dstudio/SETUP_GUIDE.md) · TripoSR: [`TRIPOSR_SETUP.md`](fibox3dstudio/backend/TRIPOSR_SETUP.md)

## License

MIT — see [LICENSE](LICENSE). The vendored TripoSR code keeps its original license.
