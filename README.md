# D-cubby

A free, self-hosted digital asset management app for your organization: upload, tag, search and share images, video, audio and documents. Optional AI auto-tagging works with OpenAI, Anthropic Claude, or a local model through Ollama.

D-cubby is built on the [`dam`](https://github.com/scervera/dam) Rails engine and ships as Docker images.

> **Status:** under active development. Installation instructions will be added with the first release.

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
