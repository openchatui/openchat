![GitHub stars](https://img.shields.io/github/stars/openchatui/openchat?style=social)
![GitHub forks](https://img.shields.io/github/forks/openchatui/openchat?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/openchatui/openchat?style=social)
![Repo Size](https://img.shields.io/github/repo-size/openchatui/openchat)
![GitHub last commit](https://img.shields.io/github/last-commit/openchatui/openchat?color=red)
[![Discord](https://img.shields.io/badge/Discord-OpenChat-blue?logo=discord&logoColor=white)](https://discord.gg/fVz7N5Nduj)

<h1><img src="assets/OpenChat.png" alt="OpenChat" width="32" height="32" style="vertical-align: middle; margin-bottom: 8px;" /> OpenChat</h1>

**OpenChat is an open source, self-hosted, AI User Interface** with the goal of developing the most **feature rich, free, AI User Interface.**

![Text generation demo](/assets/text-gen.gif)

### Get Started

#### Local
1) Clone and install dependencies
    ```bash
    git clone https://github.com/openchatui/openchat.git
    cd openchat
    npm install
    ```

2) Create your environment file
    ```bash
    cp .env.example .env
    ```

3) Initialize database and run
    #### Dev mode (hot reload):
    ```bash
    npm run db:push
    npm run dev
    ```
    #### Production-like run:
    ```bash
    npm run serve   # runs migrations, builds, and starts Next.js
    ```

Now open [http://localhost:3000](http://localhost:3000).

> [!NOTE]
> - DB selection is controlled by `DB` (`sqlite` or `postgres`).
> - For PostgreSQL set `DB=postgres` and `DATABASE_URL` (or `POSTGRES_URL` / `POSTGRES_DIRECT_URL`) in `.env`.

#### Docker (single container)
Pull and run the official image (port 3000 inside the container):
```bash
docker pull ghcr.io/openchatui/openchatui:latest
docker run --name openchat \
  -p 3000:3000 \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -v "$(pwd)/data/prisma:/prisma" \
  --restart unless-stopped \
  ghcr.io/openchatui/openchatui:latest
```

> [!TIP]
> - Change the host port by editing the `-p` flag (e.g., `-p 3001:3001` together with `-e PORT=3001`).
> - If you prefer PostgreSQL, add `-e DB=postgres -e DATABASE_URL=postgresql://user:pass@host:5432/dbname`.
> - The container will generate a `NEXTAUTH_SECRET` if not provided; set it for persistence across restarts.

#### Docker Compose
A ready-to-use `docker-compose.yml` is included. It maps port `3000` and persists SQLite data to `./prisma`.

Minimal compose file:
```yaml
services:
  openchat:
    image: ghcr.io/openchatui/openchatui:latest
    ports:
      - "3000:3000"
    volumes:
      - ./prisma:/prisma
    restart: unless-stopped
```

Start in the background:
```bash
docker compose up -d
```

Stop and remove the container:
```bash
docker compose down
```

> [!TIP]
> - Change the external port by editing `ports` and the internal app port by `environment: PORT` and `NEXTAUTH_URL`.
> - Persist data: by default `./prisma:/prisma` stores the SQLite database on the host.
> - Switch to PostgreSQL: set `DB=postgres` and provide `DATABASE_URL` in `environment`. You can add a separate Postgres service if needed.

# Features

- 🤖 Multi‑provider AI: OpenAI, OpenRouter, Ollama (via AI SDK)
- 🖼️ Image generation (OpenAI)
- 🎬 Video generation (Sora 2)
- 🎙️ Voice chat and TTS (e.g., ElevenLabs)
- 🌐 Browserless/headless web tools (automation via Browserbase)
- 📁 Drive and Docs: Google Drive/Google Docs integration or local documents
- 💬 Rich chat management: folders, tags, pinning, sharing
- 📝 Markdown with math (KaTeX) and code highlighting (Shiki)
- 📄 File and PDF reading
- 📘 Built‑in REST API docs (Swagger UI)
- 🔐 Authentication with sessions and roles
- 🗄️ SQLite or PostgreSQL via Prisma
- 🐳 Docker and Docker Compose support

### Wishlist

- Documents: Tika, Docling, OCR (for drive)
- Image Gen: Midjourney, Auto1111, ComfyUI, Gemini, other providers
- Vision models and UI
- TTS/Voice: Deepgram
- AWS Bedrock, Azure OpenAI, Google Cloud integrations
- Code: Jupyeter, Pyodide
- Web: Playwright/Puppeteer, Google PSE, serpapi, firecrawl, bing, searchapi, etc.

<br>

![Browser demo](/assets/browser.gif)

![Image generation demo](/assets/image-gen.gif)

![Video generation demo](/assets/video-gen.gif)