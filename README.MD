# GitHub UI and API Automation Project

## Overview

This project is a Playwright + TypeScript automation framework for testing GitHub UI and REST API functionality.

The framework currently supports:

- GitHub UI login automation
- GitHub API health validation
- Repository GET automation
- Repository UPDATE automation
- Repository DELETE automation using a disposable test repository
- GitHub App authentication using JWT and installation access tokens
- Installation-token caching and reuse during the test run

The project is designed so that UI and API automation share the same Playwright test infrastructure while keeping page objects, fixtures, API clients, authentication, and API resource classes separated.

## Current Status

| Area | Status |
|---|---|
| UI Login | ✅ Implemented |
| API Health | ✅ Implemented |
| Repository GET | ✅ Implemented |
| Repository UPDATE | ✅ Implemented |
| Repository CREATE | ⚠️ Not supported with current installation-token authentication model |
| Repository DELETE | ✅ Implemented |
| GitHub App JWT authentication | ✅ Implemented |
| Installation token caching | ✅ Implemented |
| TypeScript validation | ✅ Passing |

## Technology Stack

- Playwright Test
- TypeScript
- Node.js
- dotenv
- jsonwebtoken
- GitHub REST API
- GitHub App authentication

## Project Structure

```text
GitHub/
├── api/
│   ├── auth/
│   │   └── githubAppAuth.ts
│   ├── client/
│   │   └── githubApiClient.ts
│   └── repositories/
│       └── repositoryApi.ts
├── components/
├── constants/
├── data/
├── fixtures/
│   └── basefixture.ts
├── pages/
│   └── loginpage.ts
├── tests/
│   ├── UI_login.spec.ts
│   └── api/
│       ├── api_health.spec.ts
│       └── repositories/
│           ├── get_repository.spec.ts
│           ├── update_repository.spec.ts
│           └── delete_repository.spec.ts
├── utils/
├── secrets/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── playwright.config.ts
├── README.MD
├── design.md
└── tsconfig.json
```

## UI Automation

The UI layer uses Playwright Page Object Model.

`pages/loginpage.ts` encapsulates GitHub login interactions such as:

- Navigating to the login page
- Entering username
- Entering password
- Clicking the exact `Sign in` button
- Detecting the login error alert
- Verifying that the Dashboard is visible after successful login

The UI test is located at:

```text
tests/UI_login.spec.ts
```

The test runs against Chromium, Firefox, and WebKit through the Playwright projects configured in `playwright.config.ts`.

## Playwright Configuration

The framework loads environment variables using dotenv:

```typescript
dotenv.config({ quiet: true });
```

The current base URL is provided through:

```text
GITHUB_BASE_URL
```

The Playwright configuration uses:

- HTML reporter
- `trace: 'on-first-retry'`
- Screenshots on failure
- Video retention on failure
- Chromium
- Firefox
- WebKit

The API base URL is kept separate through:

```text
GITHUB_API_BASE_URL
```

## Shared Fixtures

`fixtures/basefixture.ts` extends Playwright's base test with reusable project fixtures:

```text
loginPage
```

and

```text
githubApiClient
```

This keeps test cases focused on business actions instead of repeatedly constructing page objects and API clients.

## GitHub App Authentication

The API layer authenticates through the GitHub App installed for the test repository.

The authentication flow is:

```text
Environment configuration
        ↓
GitHub App client ID
        ↓
Generate RS256 JWT
        ↓
GitHub App installation
        ↓
Generate installation access token
        ↓
Cache token until near expiry
        ↓
Use token for GitHub API requests
```

`api/auth/githubAppAuth.ts` is responsible for:

- Reading the GitHub App client ID
- Reading the installation ID
- Reading the private-key path
- Validating required configuration
- Generating the App JWT
- Requesting the installation access token
- Caching the installation token
- Refreshing the token when it is close to expiry

The private key is stored locally under `secrets/` and is excluded from Git through `.gitignore`.

## API Client

`api/client/githubApiClient.ts` is the common HTTP layer for GitHub API requests.

It currently provides:

```text
GET
POST
PATCH
DELETE
```

Every request obtains the current installation access token through the authentication layer and sends the GitHub API headers consistently.

The current GitHub API version configured by the project is:

```text
2026-03-10
```

## Repository API

`api/repositories/repositoryApi.ts` contains repository-level API operations.

### GET Repository

Endpoint:

```text
GET /repos/{owner}/{repo}
```

Implemented through:

```text
getRepository(owner, repository)
```

The GET test validates repository identity, owner, full name, and visibility.

### UPDATE Repository

Endpoint:

```text
PATCH /repos/{owner}/{repo}
```

Implemented through:

```text
updateRepository(owner, repository, data)
```

The UPDATE test:

1. Reads the original description.
2. Updates the description.
3. Validates the response and returned repository details.
4. Restores the original description in a `finally` block when the update succeeds.

This prevents the main repository from being permanently modified by the automation test.

### DELETE Repository

Endpoint:

```text
DELETE /repos/{owner}/{repo}
```

Implemented through:

```text
deleteRepository(owner, repository)
```

The DELETE test was executed against the disposable repository:

```text
Govindrao1/Github_Delete_Test
```

The test validated the complete lifecycle:

```text
GET dummy repository       → 200
DELETE dummy repository    → 204
GET after deletion         → 404
```

The DELETE test is intentionally destructive. It must only be executed against a disposable repository that is safe to remove. The previously used dummy repository has already been deleted, so a new disposable repository must be created and granted to the GitHub App before repeating the test.

### CREATE Repository

Repository CREATE is intentionally not implemented in the current API layer.

The current project authenticates with a GitHub App **installation access token**. An earlier attempt to use:

```text
POST /user/repos
```

returned:

```text
403 Resource not accessible by integration
```

The project therefore does not expose `createRepository()` under the current authentication model.

This is a limitation of the current authentication context used by this project, not a statement that GitHub repository creation is universally unavailable to GitHub Apps.

## Current API Architecture

```text
Test
 │
 ▼
RepositoryApi
 │
 ▼
GitHubApiClient
 │
 ├── GET
 ├── POST
 ├── PATCH
 └── DELETE
 │
 ▼
GitHubAppAuth
 │
 ├── JWT generation
 ├── Installation token generation
 └── Token caching
 │
 ▼
GitHub REST API
```

## Environment Configuration

`.env` contains local runtime configuration and secrets and must never be committed.

`.env.example` documents the required variable names without containing real credentials or keys.

Typical configuration includes:

```text
GITHUB_BASE_URL
GITHUB_API_BASE_URL
GITHUB_USERNAME
GITHUB_PASSWORD
GITHUB_APP_CLIENT_ID
GITHUB_INSTALLATION_ID
GITHUB_APP_PRIVATE_KEY_PATH
```

The exact values remain local to the developer environment.

## Secret Management

Sensitive information must remain outside source-controlled code.

The project follows these rules:

- Do not hard-code passwords, tokens, or private keys.
- Keep `.env` out of Git.
- Keep GitHub App private keys under `secrets/` and exclude them from Git.
- Commit only `.env.example` with variable names and safe example structure.
- Never print secret values in test output.

## TypeScript Validation

Run:

```powershell
npx tsc --noEmit
```

The current project compiles successfully with strict TypeScript checking.

## Running Tests

### UI Login — Chromium

```powershell
npx playwright test tests/UI_login.spec.ts --project=chromium
```

### UI Login — Debug

```powershell
npx playwright test tests/UI_login.spec.ts --project=chromium --debug
```

### API Health

```powershell
npx playwright test tests/api/api_health.spec.ts --project=chromium
```

### Repository GET

```powershell
npx playwright test tests/api/repositories/get_repository.spec.ts --project=chromium
```

### Repository UPDATE

```powershell
npx playwright test tests/api/repositories/update_repository.spec.ts --project=chromium
```

### Repository DELETE

```powershell
npx playwright test tests/api/repositories/delete_repository.spec.ts --project=chromium
```

Only run the DELETE test when the configured repository is a disposable repository that may safely be deleted.

### View HTML Report

```powershell
npx playwright show-report
```

## Git Workflow

The current branch is:

```text
master
```

Remote repository:

```text
https://github.com/Govindrao1/Github_UI_And_API_Project.git
```

Recommended workflow:

```powershell
git status
git diff
git add <files>
git commit -m "<message>"
git push origin master
```

Before committing, verify that secrets and generated artifacts are not staged.

## Documentation Synchronization Rule

`design.md` is the source of truth for architecture and design changes.

`README.MD` is the project-level implementation and usage documentation.

Whenever the project architecture, API layer, authentication strategy, test structure, or major project-level behavior changes, both files must be updated so they remain synchronized with the actual implementation.

## Current Architecture Principles

- Keep UI page objects separate from API resources.
- Keep API authentication separate from HTTP transport.
- Keep API resource methods separate from test cases.
- Reuse Playwright fixtures for shared dependencies.
- Keep credentials and private keys outside source code.
- Prefer reusable API client methods over direct HTTP calls from tests.
- Use disposable resources for destructive API automation.
- Keep tests responsible for validation while API classes handle API operations.

## Roadmap

The current foundation is in place for expanding repository API coverage and adding additional GitHub UI and API scenarios without coupling tests directly to authentication or transport implementation.

Potential future work should be added only when required and should be reflected in both `README.MD` and `design.md`.

## Documentation References

- `README.MD` — project overview, setup, usage, and current implementation status
- `design.md` — detailed architecture and design source of truth
