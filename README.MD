# GitHub UI and API Automation Project

## Overview

This project is a Playwright + TypeScript automation framework for testing GitHub UI and REST API functionality.

The framework currently supports:

- GitHub UI login automation
- GitHub UI repository creation
- GitHub API health validation
- Repository GET automation
- Repository UPDATE automation
- Repository DELETE automation using a disposable test repository
- UI-created repository validation through the GitHub API
- UI versus API repository detail consistency validation
- GitHub App authentication using JWT and installation access tokens
- Installation-token caching and reuse during the test run
- JSON Schema request and response contract validation using AJV

The project is designed so that UI and API automation share the same Playwright test infrastructure while keeping page objects, fixtures, API clients, authentication, API resource classes, and test validation separated.

## Current Status

| Area | Status |
|---|---|
| UI Login | ✅ Implemented |
| UI Repository CREATE | ✅ Implemented |
| API Health | ✅ Implemented |
| Repository GET | ✅ Implemented |
| Repository UPDATE | ✅ Implemented |
| Repository DELETE | ✅ Implemented |
| UI CREATE → API Validation | ✅ Implemented |
| UI vs API Repository Validation | ✅ Implemented |
| GitHub App JWT authentication | ✅ Implemented |
| Installation token caching | ✅ Implemented |
| TypeScript validation | ✅ Passing |
| JSON Schema + AJV contract validation | ✅ Implemented for Repository GET/UPDATE responses, UI CREATE → API GET, 404 error response, valid UPDATE request payload, and invalid UPDATE request payload |
| Repository CREATE through current API layer | ⚠️ Not supported with current installation-token authentication model |

## Technology Stack

- Playwright Test 1.63.0
- TypeScript
- Node.js
- dotenv
- jsonwebtoken
- AJV
- JSON Schema
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
│   ├── loginpage.ts
│   ├── newrepositorypage.ts
│   └── repositorypage.ts
├── tests/
│   ├── UI_login.spec.ts
│   ├── api/
│   │   ├── api_health.spec.ts
│   │   └── repositories/
│   │       ├── get_repository.spec.ts
│   │       ├── get_nonexistent_repository.spec.ts
│   │       ├── update_repository.spec.ts
│   │       ├── update_invalid_request.spec.ts
│   │       └── delete_repository.spec.ts
│   └── e2e/
│       └── repositories/
│           └── ui_create_repository.spec.ts
├── utils/
│   └── schemaValidator.ts
├── schemas/
│   ├── repository.schema.json
│   ├── github-error.schema.json
│   └── update-repository-request.schema.json
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

The UI layer uses the Playwright Page Object Model.

### LoginPage

`pages/loginpage.ts` encapsulates GitHub login interactions such as:

- Navigating to the login page
- Entering username
- Entering password
- Clicking the exact `Sign in` button
- Detecting the login error alert
- Verifying that the Dashboard is visible after successful login

### NewRepositoryPage

`pages/newrepositorypage.ts` encapsulates the GitHub repository creation page.

It currently handles:

- Reading the selected repository owner from the UI
- Entering repository name
- Waiting for GitHub to confirm that the repository name is available
- Entering repository description
- Selecting private visibility
- Enabling Add README
- Clicking Create repository

Repository creation is performed through the GitHub UI. The page object does not depend on automatic post-creation navigation; the resulting repository is subsequently synchronized and validated through the API.

### RepositoryPage

`pages/repositorypage.ts` encapsulates repository-page interactions used by the hybrid UI/API validation.

It currently handles:

- Navigating to a repository using owner and repository name
- Reading repository name
- Reading repository owner
- Reading repository description from the repository article
- Reading repository visibility

The navigation method explicitly verifies the expected repository URL. It also handles the observed GitHub `ERR_ABORTED` navigation case when the browser has already reached the expected repository URL.

## Hybrid UI and API Validation

The project contains an end-to-end repository scenario:

```text
Login through UI
        ↓
Create repository through UI
        ↓
Read repository owner from UI
        ↓
Wait for repository to become available through API
        ↓
Validate API response against JSON Schema with AJV
        ↓
Validate API repository details
        ↓
Open the created repository through UI
        ↓
Read UI repository details
        ↓
Compare UI details with API details
```

The hybrid test is located at:

```text
tests/e2e/repositories/ui_create_repository.spec.ts
```

The test validates the following repository properties across both interfaces:

```text
Repository Name
Owner
Description
Visibility
```

The API visibility value is normalized from the `private` boolean before comparison with the UI value.

The API GET is used as the synchronization point after the UI create action. The test polls until the repository becomes available instead of using a fixed sleep.

After the repository becomes available, the API response is validated against `schemas/repository.schema.json` using the reusable `utils/schemaValidator.ts` AJV utility. The same repository schema is reused for applicable repository-object responses instead of duplicating response contracts.

## API Response Schema Validation

The framework uses JSON Schema and AJV to validate the structure and data types of repository API responses.

The current schema is:

```text
schemas/repository.schema.json
```

The reusable validator is:

```text
utils/schemaValidator.ts
```

Current response-schema validation coverage:

```text
Repository GET response                    → AJV ✅
Repository UPDATE response                 → AJV ✅
UI CREATE → API GET repository response    → AJV ✅
```

Schema validation is separate from business assertions. AJV validates the response contract, while the test validates scenario-specific values such as repository name, owner, description, and visibility.

The repository schema intentionally allows additional response properties so that newly introduced GitHub response fields do not cause unnecessary test failures.

DELETE responses are not validated with the repository schema because a successful DELETE returns no repository object to validate.

## API Request-Payload Schema Validation

The framework also validates applicable API request payloads with JSON Schema and AJV before sending them to GitHub.

The current UPDATE request contract is stored at:

```text
schemas/update-repository-request.schema.json
```

The UPDATE test validates the exact payload that will be sent to the API before calling the PATCH operation:

```text
Build update payload
        ↓
AJV request-schema validation
        ↓
PATCH /repos/{owner}/{repo}
        ↓
AJV response-schema validation
        ↓
Business assertions
```

This keeps request-contract failures separate from response-contract failures. The UPDATE request schema currently requires a string `description` and rejects unexpected request properties.

The negative UPDATE request test is located at:

```text
tests/api/repositories/update_invalid_request.spec.ts
```

It deliberately supplies an invalid request payload and verifies that AJV rejects the payload before the PATCH operation is invoked:

```text
Invalid update payload
        ↓
AJV request-schema validation
        ↓
Validation fails
        ↓
PATCH is not executed
```

This keeps negative contract validation isolated and avoids making a destructive or invalid external API call merely to prove that the request contract is enforced.

## Negative API Response Validation

The framework also validates expected error responses using JSON Schema and AJV.

### Non-existent Repository

The test:

```text
tests/api/repositories/get_nonexistent_repository.spec.ts
```

executes a GET request for a deliberately non-existent repository and validates:

```text
GET /repos/{owner}/{non-existent-repository}
        ↓
HTTP 404
        ↓
Read JSON error response
        ↓
AJV validation
        ↓
github-error.schema.json
        ↓
Error business assertions
```

The error response contract is stored at:

```text
schemas/github-error.schema.json
```

The test validates the expected `404` HTTP status, then validates the returned JSON structure with AJV and checks the expected error details.

This negative scenario is non-destructive and does not modify any repository.

## Playwright Configuration

The framework loads environment variables using dotenv:

```typescript
dotenv.config({ quiet: true });
```

The current UI base URL is provided through:

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
newRepositoryPage
repositoryPage
githubApiClient
```

This keeps test cases focused on business actions instead of repeatedly constructing page objects and API clients.

## GitHub App Authentication

The API layer authenticates through the GitHub App installed for the project repository.

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

The GET test validates the response against the repository JSON Schema with AJV and then validates repository identity, owner, full name, and visibility.

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
3. Validates the returned repository object against the repository JSON Schema with AJV.
4. Validates the response and returned repository details.
5. Restores the original description in a `finally` block when the update succeeds.

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

The DELETE test is self-contained and creates a unique disposable repository through the GitHub UI before exercising the destructive API operation. This avoids depending on a pre-existing repository that may already have been deleted by an earlier test run.

The complete lifecycle is:

```text
Login through UI
        ↓
Create unique disposable repository through UI
        ↓
Poll API GET until repository is available → 200
        ↓
DELETE repository through API → 204
        ↓
GET repository after deletion → 404
```

The test is located at:

```text
tests/api/repositories/delete_repository.spec.ts
```

The DELETE operation remains intentionally destructive and must never target the main project repository. The repository name is generated uniquely for each test execution so parallel browser projects do not depend on shared disposable test data.

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

Repository creation is nevertheless covered at the UI layer by the hybrid end-to-end test, which creates the repository through GitHub UI and then validates the resulting repository through the API.

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

## UI/API Separation

The framework intentionally keeps UI and API responsibilities separate:

```text
UI Test
 │
 ├── LoginPage
 ├── NewRepositoryPage
 └── RepositoryPage

API Test / Hybrid Test
 │
 └── RepositoryApi
       │
       └── GitHubApiClient
              │
              └── GitHubAppAuth
```

The hybrid test is responsible for cross-interface validation, while page objects and API classes remain responsible for their own layers.

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

The UI/API hybrid test reads the actual repository owner from the GitHub creation page rather than requiring a separate repository-owner environment variable.

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

### Invalid UPDATE Request — Request Schema

```powershell
npx playwright test tests/api/repositories/update_invalid_request.spec.ts --project=chromium
```

### Non-existent Repository — 404 Error Schema

```powershell
npx playwright test tests/api/repositories/get_nonexistent_repository.spec.ts --project=chromium
```

### Repository DELETE

```powershell
npx playwright test tests/api/repositories/delete_repository.spec.ts --project=chromium
```

The DELETE test creates its own unique disposable repository during the test and must never target the main project repository.

### UI CREATE + API Validation

```powershell
npx playwright test tests/e2e/repositories/ui_create_repository.spec.ts --project=chromium
```

### Full Project Regression

```powershell
npx playwright test
```

### Run with Visible Browser

```powershell
npx playwright test --headed
```

### View HTML Report

```powershell
npx playwright show-report
```

To use a different report port:

```powershell
npx playwright show-report --port=9334
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

Whenever the project architecture, API layer, authentication strategy, UI page-object layer, fixture architecture, test structure, or major project-level behavior changes, both files must be updated so they remain synchronized with the actual implementation.

## Current Architecture Principles

- Keep UI page objects separate from API resources.
- Keep API authentication separate from HTTP transport.
- Keep API resource methods separate from test cases.
- Reuse Playwright fixtures for shared dependencies.
- Keep credentials and private keys outside source code.
- Prefer reusable API client methods over direct HTTP calls from tests.
- Use disposable resources for destructive API automation.
- Keep tests responsible for validation while API classes handle API operations.
- Use the API as a synchronization point when a UI operation produces an asynchronously available backend resource.
- Prefer condition-based polling over fixed sleeps for backend synchronization.
- Keep UI/API comparison logic in the hybrid test rather than mixing it into page objects or API resource classes.

## Roadmap

The current foundation is in place for expanding repository API coverage and adding additional GitHub UI and API scenarios without coupling tests directly to authentication or transport implementation.

Potential future work should be added only when required, for example:

- Additional negative request-schema validation scenarios and richer AJV failure diagnostics
- Additional repository UI/API scenarios
- Additional GitHub API resources

Any future project-level change should be reflected in both `README.MD` and `design.md`.

## Documentation References

- `README.MD` — project overview, setup, usage, and current implementation status
- `design.md` — detailed architecture and design source of truth
