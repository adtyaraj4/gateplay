# Contributing to GatePlay

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/gateplay.git`
3. Install dependencies: `npm install`
4. Copy `.env.example` → `.env` and fill in values
5. Run the schema: paste `schema.sql` into your Supabase SQL Editor
6. Start the dev server: `npm run dev`

## Pull Request Guidelines

- Open an issue first for significant changes
- Keep PRs focused — one feature or fix per PR
- Write clear commit messages (e.g. `feat: add watch-later list`)
- Ensure the server starts cleanly with `npm run dev`

## Code Style

- Use `const`/`let`, avoid `var`
- Async/await over raw Promise chains
- Add JSDoc comments for non-obvious functions
- Keep route handlers thin — logic belongs in helpers

## Reporting Bugs

Please include:
- Node.js version (`node -v`)
- Steps to reproduce
- Expected vs actual behaviour
- Relevant error messages or stack traces
