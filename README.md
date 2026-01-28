## Javin AI

An open-source, no-nonsense AI search and assistant for crypto and blockchain. Javin combines a modern Next.js UI, an API service for AI completions, and a shared library of on-chain/web tools for research and automation.

### Highlights

- **Focused crypto research**: Ask questions, analyze tokens, and explore activity across chains.
- **Rich toolset**: Integrations for Nansen, Birdeye, Blockscout, Solana, Zerion, Tavily, Firecrawl, and more.
- **Auth flows**: Email and Google sign-in, password reset.
- **Open source**: Licensed under MIT.

---

## Monorepo structure

- `apps/javin`: Web app (Next.js). UI, auth, chat, verification dashboards.
- `apps/javin-api`: API app (Next.js). AI completions and chat/stream endpoints.
- `packages/shared`: Shared TypeScript library with AI tools, utilities, and types.

---

## Tech stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI**: React, Tailwind, Radix UI
- **Data**: Drizzle ORM + Postgres
- **Cache/Queue**: Upstash Redis (optional)
- **AI**: Vercel AI SDK (`ai`), `@ai-sdk/openai`
- **Build/Tooling**: Turborepo, pnpm

---

## Features (overview)

- Chat interface with history, message limits, and suggestions.
- Auth: register, login, forgot password, Google OAuth.
- Verification dashboard and health checks.
- Portfolio tables and token information components.
- Pluggable AI tools for on-chain and web data sources.

---

## Contributing

Issues and PRs are welcome! Please open an issue to discuss substantial changes. Make sure to run linting and formatters before submitting:

---

## License

MIT © 2026 Javin AI

