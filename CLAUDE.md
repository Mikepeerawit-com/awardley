# awardley

## Issues

Issues live as GitHub issues in `Mikepeerawit-com/awardley`, managed with the `gh` CLI.

## Domain docs

Single-context: the glossary is `CONTEXT.md` and the decisions are `docs/adr/`, both at the repo root. Read the ADRs that touch an area before working in it.

- Name domain concepts (in issues, code, tests, commits) with the terms `CONTEXT.md` defines; don't drift to synonyms it avoids.
- If a change contradicts an ADR, say so explicitly rather than silently overriding it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
