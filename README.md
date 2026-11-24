# D-cubby

A free, self-hosted digital asset management app for your organization: upload, tag, search and share images, video, audio and documents. Optional AI auto-tagging works with OpenAI, Anthropic Claude, or a local model through Ollama.

D-cubby is built on the [`dam`](https://github.com/scervera/dam) Rails engine and ships as Docker images.

## Install

On a server with Docker:

```bash
curl -fsSL https://github.com/scervera/d-cubby/releases/latest/download/d-cubby.tar.gz | tar xz
cd d-cubby && ./install.sh
```

The installer asks for your address, storage, and optional email, AI and face detection,
tests each one, starts D-cubby and prints a one-time setup link. Full guide, upgrades and
backups: [DOCUMENTATION/01-INSTALL/README.md](DOCUMENTATION/01-INSTALL/README.md).

## Development

Requirements: Ruby (see `apps/api/.ruby-version`), Node 24, Docker.

```bash
bin/dev        # Postgres (Docker), Rails API, Solid Queue worker, Next.js
open http://localhost:4080
bin/dev-stop
```

See [AGENTS.md](AGENTS.md) for commands and conventions.

## License

[PolyForm Noncommercial 1.0.0](LICENSE.md). Free for noncommercial use, including by charities, educational institutions, public research organizations and government bodies.
