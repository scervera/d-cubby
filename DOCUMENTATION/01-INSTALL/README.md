# Installing D-cubby

D-cubby is a free, self-hosted digital asset library for your organization. It runs as a
few Docker containers on one server.

## What you need

- A Linux server (or a Mac/PC with Docker Desktop for testing) with **2 CPU cores, 4 GB RAM**
  and enough disk for your files. Intel/AMD (amd64) and ARM (arm64) both work.
- **Docker** with the Compose plugin: https://docs.docker.com/engine/install/
- For access from the internet: a **domain name** (e.g. `dam.example.org`) with a DNS record
  pointing at the server, and ports **80 and 443** open. D-cubby gets an HTTPS certificate
  automatically. On a private network you can use the server's IP address over plain HTTP.

## Install

```bash
curl -fsSL https://github.com/scervera/d-cubby/releases/latest/download/d-cubby.tar.gz | tar xz
cd d-cubby && ./install.sh
```

This always fetches the newest release. To install a specific version, use its own file,
e.g. `.../releases/download/v0.1.0/d-cubby-0.1.0.tar.gz` (folder `d-cubby-0.1.0`); each
release also lists a `.sha256` checksum for every download.

The installer asks a few questions and tests each answer live before saving:

| Step | What it asks |
|------|--------------|
| Address | Domain name (HTTPS) or IP address (HTTP) |
| Upload size | Largest file people may upload |
| File storage | This server's disk (a Docker volume or a folder you choose), or S3-compatible storage (AWS S3, Cloudflare R2, Backblaze B2, Wasabi, your own MinIO/Garage) |
| Watched folders | Optional folders on this server (local disks, USB drives, mounted NAS shares) to import files from |
| Email | Optional SMTP server for invitations and password resets |
| AI auto-tagging | Optional: Anthropic Claude, OpenAI, or a local model (Ollama, LM Studio, vLLM) |
| Face detection | Optional: AWS Rekognition |

It writes everything to `.env` (readable only by you), starts D-cubby and prints:

```
D-cubby is running at https://dam.example.org
  Finish setup in your browser: https://dam.example.org/setup
  Setup token:                  1a2b3c4d-…
```

Open the setup page, enter the token, and create your organization and owner account.

## Everyday commands

Run these in the install folder:

| Task | Command |
|------|---------|
| Change settings | `./install.sh --reconfigure` |
| Test storage, email, AI and faces | `./install.sh --check --test-email you@example.org` |
| Status / logs | `docker compose ps` · `docker compose logs -f` |
| Stop / start | `docker compose stop` · `docker compose up -d` |

Settings that live in `.env` (address, storage, email, AI, secrets) can only be changed
with `./install.sh --reconfigure`; Settings → System status in the app shows them and
can test them. Your organization's name, logo, language, users and recycle-bin period are
changed in the app.

## Upgrading

```bash
./install.sh --reconfigure --version 0.2.0    # or set APP_VERSION in .env
```

or, keeping your settings: `docker compose pull && docker compose up -d`. Database
changes are applied automatically when the new version starts. Back up first (below).

## Backups

Back up two things: the database and the files.

```bash
# Database
docker compose exec -T postgres pg_dump -U d_cubby -Fc d_cubby > d-cubby-$(date +%F).dump

# Files (local storage in the Docker volume; skip if you use S3 — back up the bucket instead)
docker run --rm -v d-cubby_storage:/data -v "$PWD":/backup alpine \
  tar czf /backup/d-cubby-files-$(date +%F).tar.gz -C /data .
```

If you chose a folder for files, back up that folder. Keep a copy of `.env` too, somewhere
safe: it holds the keys that sign people in.

Restore onto a fresh install (same `.env`):

```bash
docker compose up -d postgres
docker compose exec -T postgres pg_restore -U d_cubby -d d_cubby --clean --if-exists < d-cubby-2026-01-31.dump
docker run --rm -v d-cubby_storage:/data -v "$PWD":/backup alpine \
  tar xzf /backup/d-cubby-files-2026-01-31.tar.gz -C /data
docker compose up -d
```

## Automating the install

`./install.sh --non-interactive` reads the same names as `.env` from the environment
(see `.env.example`), plus `APP_DOMAIN` (HTTPS) or `APP_HOST` (plain HTTP):

```bash
APP_DOMAIN=dam.example.org STORAGE_PROVIDER=local \
DAM_AI_PROVIDER=anthropic DAM_AI_API_KEY=sk-ant-… \
./install.sh --non-interactive
```

## Troubleshooting

- **The site doesn't load over HTTPS:** check that the domain's DNS points at the server
  and that ports 80 and 443 are open; `docker compose logs caddy` shows certificate errors.
- **Uploads fail with a folder you chose for files:** the app runs as user id 1000 —
  `sudo chown -R 1000:1000 /your/folder`.
- **A local AI model can't be reached:** use the server's network address, not
  `localhost` (inside a container that means the container itself).
- **Lost the setup token:** it's `SETUP_TOKEN` in `.env`. It stops working once the
  first account exists.
