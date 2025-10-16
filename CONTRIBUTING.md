# 🙌 Contributing to OpenChat

Thanks for taking the time to contribute! This guide explains how to propose changes and what we expect so we can move fast together.

## 📋 Code of Conduct
We follow the Contributor Covenant v2.1. By participating, you agree to uphold these standards.
- See: https://www.contributor-covenant.org/version/2/1/code_of_conduct/

## 🚀 Quick Start
- Fork and clone the repo
- Install dependencies: `npm install`
- Start the dev server: `npm run dev`
- Run type checks (if available): `npm run typecheck`

## 🔧 API‑first Guidelines (Important)
Please default to adding new functionality as API endpoints under `app/api` using versioned paths like `app/api/v1/...`.
- Add Swagger/OpenAPI docs using `@swagger` JSDoc directly above `export const GET/POST/...` in the route file
- Include: `tags`, `summary`, path & query params, `requestBody`, `responses`, and `security` (401/403) where applicable
- Reuse shared schemas when possible and ensure endpoints appear correctly in `/swagger`
- Prefer Server Actions only for tightly coupled, simple form POSTs; otherwise use API routes
- Avoid duplicating business logic across Server Actions and API routes
- Admin‑only routes must enforce authorization and document `security` with 401/403 in Swagger

## 🔀 Branching
- Use short, descriptive, kebab‑case branch names:
  - `feature/short-description`
  - `fix/bug-description`
  - `chore/task-description`

## 📝 Commit Messages
- Keep Conventional Commits:
  - `feat(ui): add chat list virtualization`
  - `fix(api): correct 401 handling for model sync`
  - `docs: update swagger examples`

## ✅ Pull Request Checklist
Before opening or merging a PR:
- Link a related issue (if applicable)
- Add/extend tests and keep CI passing
- Run lint and type checks locally
- Update docs, including `@swagger` blocks for any new/changed API routes
- Include screenshots or recordings for visible UI changes
- Note breaking changes and migration steps in the PR description
- Ensure CI gates pass (lint, typecheck, unit/integration, build, and e2e)
- For major features, include Playwright coverage for the core user flows

## 🧪 Testing
- Unit/integration tests: `npm test`
- End‑to‑end: Use Playwright for all major features and critical user journeys

## 🧹 Linting & Formatting
- Canonical linter: ESLint
- Lint: `npm run lint`
- Format: `npm run format`
- CI workflows will enforce linting; ensure no linter/type errors before pushing

## 📦 Dependencies & Tooling
- Package managers: npm, pnpm, or yarn are all allowed (do not switch managers mid‑PR)
- Prefer small, well‑maintained dependencies; justify new deps in the PR description and avoid overlap

## 🛠️ Local Development Tips
- Environment: copy `.env.example` to `.env` and fill required values
- If adding external integrations, guard secrets and document required env vars
- Keep changes focused and incremental; split large PRs when feasible

## 🔒 Security & Responsible Disclosure
- Create a repository security issue for vulnerabilities once thoroughly understood and reproduced
- Keep sensitive details minimal in public threads; maintainers may request private follow‑up

## 📜 Licensing
- By contributing, you agree your contributions are licensed under the project’s license

## 🧭 Release Notes & Changelog
- If your change is user‑facing, add a brief note in the PR body that can be used for release notes

---

## 🧭 Pending Maintainer Decisions
Please confirm these so we can finalize this guide:
- Server Actions policy (when allowed vs. API routes): any stricter rules or examples?
- Required Node.js version (LTS or specific version)?
