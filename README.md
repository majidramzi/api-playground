# API Playground

**A lightweight, browser-based REST API client - a simple alternative to the basic API testing features of Postman.**

API Playground lets you build HTTP requests, inspect responses, and organize requests into collections without a backend, an account, or a subscription. Everything runs entirely in your browser: requests are sent directly from your machine with the native Fetch API, and all saved data stays in your browser's local storage.

## Live Demo

**[https://majidramzi.github.io/api-playground/](https://majidramzi.github.io/api-playground/)**

> The demo is hosted for free with GitHub Pages. No login required.

## Screenshots

> Screenshots will be added here after the first public deployment. Until then, the live demo above is the best way to explore the UI.

| Request builder | Response viewer |
| --- | --- |
| _Screenshot: method selector, URL bar, Params/Headers/Body/Authorization tabs_ | _Screenshot: status, timing, size, Pretty/Raw/Preview/Headers views_ |

| History & collections | Dark theme |
| --- | --- |
| _Screenshot: sidebar with auto-recorded history and saved collections_ | _Screenshot: the full client in dark mode_ |

## Features

- **Request builder** with method selector (GET, POST, PUT, PATCH, DELETE), URL bar, and tabs for **Params**, **Headers**, **Body**, and **Authorization**
- **Query parameters** and **headers** editors with enable/disable toggles
- **Request bodies** as JSON (with validation and one-click beautify) or plain text, with automatic `Content-Type`
- **Authentication**: none, Bearer token, Basic authentication, or a fully custom authorization header
- **Response viewer** with HTTP status code and status text, response time, response size, response headers, and body
- Multiple response views: **Pretty JSON** (with syntax highlighting), **Raw text**, **Headers**, and **Preview** (sanitized HTML preview, JSON tree, images)
- **Copy** and **download** any response body
- **Request history**: recent requests are recorded automatically (capped, with secrets redacted)
- **Collections**: save, rename, edit, duplicate, and delete requests; organize them into named collections
- **Export / import** collections as JSON files
- **Light and dark themes**
- **Responsive layout** that works on desktop and mobile
- **Request timeout** (configurable, powered by `AbortController`) and one-click **request cancellation**
- Helpful error messages for network errors, invalid URLs, timeouts, CORS failures, and invalid JSON
- Keyboard shortcut: **Ctrl/Cmd + Enter** sends the request

## Supported HTTP Methods

| Method | Body | Typical use |
| --- | --- | --- |
| `GET` | No | Retrieve a resource |
| `POST` | Yes (JSON / text) | Create a resource |
| `PUT` | Yes (JSON / text) | Replace a resource |
| `PATCH` | Yes (JSON / text) | Partially update a resource |
| `DELETE` | No | Delete a resource |

> Note: browsers do not allow sending a request body with `GET`; the app shows a warning if you configure one.

## Authentication Options

| Type | What is sent | Example header |
| --- | --- | --- |
| No authentication | Nothing | - |
| Bearer token | Your token with the `Bearer` scheme | `Authorization: Bearer <token>` |
| Basic authentication | Base64 of `username:password` (UTF-8 safe) | `Authorization: Basic <base64>` |
| Custom authorization header | A header name and value of your choice | `X-API-Key: <value>` |

User-supplied headers always win: you can override `Content-Type` or `Authorization` manually at any time.

**Credentials are stored only in your browser.** See [Privacy and Security](#privacy-and-security).

## Browser and CORS Limitations

API Playground runs 100% in the browser, which imposes some important limits. Please read this before reporting "broken" requests:

- **CORS is enforced by the browser.** Every request is subject to Cross-Origin Resource Sharing rules. A cross-origin API must explicitly allow this page's origin by responding with an appropriate `Access-Control-Allow-Origin` header (and, for non-simple requests, by handling the `OPTIONS` preflight).
- **Not every external API can be called directly.** If the target API does not permit cross-origin browser requests, the browser will block the response. This is a browser security feature, not a bug in API Playground.
- **There is no proxy.** API Playground never routes your traffic through a server or a third-party proxy. Requests go directly from your browser to the URL you enter - what you send is exactly what goes on the wire.
- **Some headers are controlled by the browser** (for example `Host`, `Content-Length`, `Cookie`, `Origin`, and `Referer`) and cannot be overridden.
- **Redirects are followed by the browser** and are not always visible to JavaScript.
- **Mixed content**: an HTTPS page cannot call plain-HTTP endpoints (the browser blocks it).
- **Pre-flights**: custom headers or non-simple bodies trigger an `OPTIONS` preflight that the API must allow.

Tips when a request fails with "Network or CORS error":

1. Check the browser devtools console - the exact CORS message is logged there by the browser.
2. Verify the API supports CORS for your origin, or use a terminal tool (curl, httpie, Bruno...) for APIs that intentionally block browsers.
3. For local development against `localhost`, make sure your dev server sends permissive CORS headers.

## Technology Stack

| Layer | Technology |
| --- | --- |
| UI framework | [React 19](https://react.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite](https://vite.dev/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| JSON/text editor | [CodeMirror 6](https://codemirror.net/) (via `@uiw/react-codemirror`) |
| HTTP | Native browser [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) + `AbortController` |
| Storage | `localStorage` (history, collections, settings) |
| Testing | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) + [jsdom](https://github.com/jsdom/jsdom) |
| Deployment | GitHub Pages via GitHub Actions |

## Installation

Requirements: **Node.js 20+** (Node 22 recommended) and npm.

```bash
git clone https://github.com/majidramzi/api-playground.git
cd api-playground
npm ci
```

## Development

Start the Vite dev server with hot module replacement:

```bash
npm run dev
```

Then open the printed local URL (the app is served under the `/api-playground/` base path).

## Testing

Run the full unit test suite (URL validation, query parameter construction, header construction, auth header generation, JSON body validation, response formatting, history persistence, timeout/cancellation behavior, HTML sanitization, and UI components):

```bash
npm test
```

For watch mode during development:

```bash
npm run test:watch
```

Type checking only:

```bash
npm run typecheck
```

## Build

Create an optimized production build in `dist/` (type checks run automatically first):

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment

The app is designed for **free GitHub Pages hosting** with zero backend:

- `vite.config.ts` sets `base: '/api-playground/'` so assets resolve under `https://majidramzi.github.io/api-playground/`.
- The GitHub Actions workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main`:
  1. `npm ci` - automated dependency installation
  2. `npm run typecheck` - TypeScript checks
  3. `npm test` - unit tests
  4. `npm run build` - production build
  5. Upload `dist/` and deploy it to GitHub Pages

To enable it on your own fork: repository **Settings → Pages → Source → GitHub Actions**, then push to `main` (or trigger the workflow manually via *Actions → Build and Deploy to GitHub Pages → Run workflow*).

## Privacy and Security

API Playground is built around a simple rule: **your data stays with you**.

- **No backend, no accounts, no telemetry.** The app is a static site. There is no server component that could receive your data.
- **Saved requests, collections and history live in `localStorage`** in your browser and are never transmitted to any external service. Clearing your browser site data deletes them permanently.
- **Secrets never go into automatic history.** History entries are stored with tokens, passwords, and sensitive header values redacted before being written.
- **Warning before storing authentication data.** When you save a request that contains a token, password, or sensitive header, the app warns you explicitly and requires confirmation - secrets on a shared computer are readable by anyone using that browser profile.
- **Response content is never executed.** Returned JavaScript is not run. HTML previews are sanitized with an allowlist-based sanitizer (scripts, event handlers, iframes, and dangerous URL schemes are stripped) and rendered inside a sandboxed iframe with scripting disabled.
- **No secrets in logs.** The app does not write request headers or auth material to the console.
- **Direct connections only.** No proxy, no request routing through third-party services - requests travel straight from your browser to the API you call.

## Project Structure

```
api-playground/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI: install, typecheck, test, build, deploy to Pages
├── src/
│   ├── components/             # UI building blocks
│   │   ├── App.tsx             #   app shell, state, and wiring
│   │   ├── RequestBuilder.tsx  #   method + URL bar, Params/Headers/Body/Auth tabs
│   │   ├── BodyPanel.tsx       #   JSON/text body editor with validation
│   │   ├── AuthPanel.tsx       #   authentication configuration
│   │   ├── ResponseViewer.tsx  #   status bar, Pretty/Raw/Preview/Headers views
│   │   ├── KeyValueEditor.tsx  #   reusable params/headers row editor
│   │   ├── CodeEditor.tsx      #   CodeMirror wrapper (lazy-loaded)
│   │   ├── Sidebar.tsx         #   history + collections
│   │   ├── SaveRequestModal.tsx#   save dialog with sensitive-data warning
│   │   └── ...                 #   Modal, PromptModal, Toast
│   ├── lib/                    # pure, unit-tested logic
│   │   ├── url.ts              #   URL validation, query parameter construction
│   │   ├── headers.ts          #   header construction and merging
│   │   ├── auth.ts             #   authorization header generation
│   │   ├── body.ts             #   JSON body validation, pretty printing
│   │   ├── http.ts             #   fetch execution, timeouts, cancellation, errors
│   │   ├── format.ts           #   bytes/duration/status formatting
│   │   ├── highlight.ts        #   JSON tokenizer for syntax highlighting
│   │   ├── sanitize.ts         #   allowlist HTML sanitizer for previews
│   │   ├── security.ts         #   secret detection and history redaction
│   │   ├── storage.ts          #   localStorage persistence
│   │   └── collectionFile.ts   #   collection export/import (JSON)
│   ├── hooks/                  # shared React hooks
│   ├── test/                   # test setup and polyfills
│   ├── types.ts                # shared TypeScript types
│   ├── index.css               # Tailwind entry + theme tokens
│   └── main.tsx                # React entry point
├── index.html
├── vite.config.ts              # base path '/api-playground/' + Vitest config
├── tsconfig.json
└── package.json
```

## Contribution Guidelines

Contributions are welcome!

1. Fork the repository and create a feature branch from `main`.
2. Install dependencies with `npm ci`.
3. Make your changes with clear, focused commits.
4. Add or update unit tests for any behavior changes - the suite must pass (`npm test`).
5. Ensure `npm run typecheck` and `npm run build` succeed.
6. Open a pull request describing the change and its motivation.

Guidelines:

- Keep the app **backend-free**: no server code, no accounts, no paid services.
- Keep the privacy guarantees intact: never transmit saved requests or credentials anywhere.
- Match the existing code style (TypeScript strict mode, functional components, Tailwind utility classes).
- For larger changes, open an issue first to discuss the design.

## License

This project is licensed under the [MIT License](LICENSE).

---

Built with React, TypeScript, and Vite. Served statically from GitHub Pages. Your tokens, your browser, your rules.
