# React + Vite

## Authentication integration

The interface includes protected `/chat`, `/login`, `/signup`, and `/forgot-password` routes. The accompanying FastAPI app now provides local sign-up, sign-in, sign-out, expiring sessions, and server-side chat protection with a SQLite user store. No credentials are embedded in the client.

By default the frontend calls the API host configured by `VITE_API_BASE_URL`. Set `VITE_AUTH_API_BASE_URL` only when authentication lives on a different host. The local FastAPI backend implements these JSON endpoints; adapt `src/auth/authApi.js` if you use a managed auth provider instead:

- `POST /api/auth/login` with `{ email, password }`
- `POST /api/auth/signup` with `{ name, email, password }`
- `POST /api/auth/forgot-password` with `{ email }`
- `POST /api/auth/logout`

Login and sign-up return a `user` object and `access_token`. Returned sessions are persisted locally, and the chat client sends the bearer token with each chat request. The local account database is created at `data/processed/pulsefit_auth.db` (ignored by Git). Password-reset email delivery needs an email provider before it can send messages; the endpoint currently returns the same neutral success response for every address.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
