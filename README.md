# React + Vite

## Project Health Score

The Insights overview displays category progress, expandable evidence, recommendations, calculation metadata, and previous-snapshot change using existing responsive theme tokens.

CodeHub repository access UI consumes `GET /repo/:id/permissions/me` and the backend repository/member responses as its authority. The existing Collaborators page supports fixed repository roles, temporary expiry/branch access, audit-oriented status, and both `/settings/collaborators` and `/settings/access`. It does not treat repository roles as global profile roles or trust local storage for permissions.

See `../docs/CUSTOM_REPOSITORY_ROLES.md` for the permission matrix and verification workflow.

CodeHub Chat is available at `/chat`, with repository, issue, pull-request, profile/direct-message, and mentor entry points. It provides reconnect catch-up, stable retry IDs, unread badges, presence, typing, search, replies, reactions, attachments, mute, block, and report actions. See `../docs/CODEHUB_CHAT.md` for the backend contract and verification workflow.

Guided Contribution is available at `/contribute`, `/repo/:id/contribute`, and per-session routes. Contributors can manage a skill profile, inspect transparent scores and missing skills, create an isolated session, refresh stored evidence, explicitly commit/open a PR, request a mentor, and inspect a final report. Maintainers configure guides from issue pages. See `../docs/GUIDED_CONTRIBUTION_SYSTEM.md`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
