# GitHub UI and API Automation Framework — Design

## 1. Purpose

This document is the source of truth for the architecture and design of the current GitHub UI and API automation project.

The framework is built with Playwright and TypeScript and separates UI automation, API authentication, API transport, API resources, fixtures, and test validation.

Any project-level architecture or design change must be reflected here and synchronized with `README.MD`.

## 2. Current Implementation Baseline

The current implementation contains:

```text
UI Login
API Health
Repository GET
Repository UPDATE
Repository DELETE
GitHub App JWT authentication
Installation access-token caching
Shared Playwright fixtures
```

Repository CREATE is not implemented with the current installation-token authentication context.

## 3. High-Level Architecture

```text
                         Playwright Tests
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
             UI Layer                    API Layer
                 │                           │
                 ▼                           ▼
           LoginPage                 RepositoryApi
                                             │
                                             ▼
                                      GitHubApiClient
                                             │
                                             ▼
                                       GitHubAppAuth
                                             │
                          ┌──────────────────┴──────────────────┐
                          │                                     │
                     JWT Generation                    Installation Token
                          │                                     │
                          └──────────────────┬──────────────────┘
                                             │
                                             ▼
                                      GitHub REST API
```

## 4. Project Structure

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

The structure separates responsibilities so that test cases do not need to know authentication or low-level HTTP details.

## 5. UI Architecture

The UI layer uses the Page Object Model.

```text
UI Test
   │
   ▼
LoginPage
   │
   ▼
Playwright Page
   │
   ▼
GitHub Web UI
```

`LoginPage` owns:

- Login-page navigation
- Username entry
- Password entry
- Exact Sign in button interaction
- Login failure detection
- Successful-login validation

The UI test should remain focused on the login business flow and should not contain locator details that belong in the page object.

## 6. Fixture Architecture

`fixtures/basefixture.ts` extends the Playwright base test.

Current custom fixtures:

```text
loginPage
githubApiClient
```

Architecture:

```text
Playwright base test
        │
        ├── page fixture
        │      ↓
        │   LoginPage
        │
        └── request fixture
               ↓
         GitHubApiClient
```

This allows both UI and API dependencies to be injected directly into tests.

## 7. API Architecture

The API architecture has three primary layers.

### 7.1 API Resource Layer

```text
api/repositories/repositoryApi.ts
```

Responsible for repository-level operations:

```text
getRepository()
updateRepository()
deleteRepository()
```

The resource layer should expose business-oriented methods rather than raw HTTP implementation details.

### 7.2 API Client Layer

```text
api/client/githubApiClient.ts
```

Responsible for:

- Building API URLs
- Obtaining authentication headers
- Sending GET requests
- Sending POST requests
- Sending PATCH requests
- Sending DELETE requests

The API client should remain reusable across different GitHub API resource classes.

### 7.3 Authentication Layer

```text
api/auth/githubAppAuth.ts
```

Responsible for GitHub App authentication and installation-token lifecycle management.

## 8. GitHub App Authentication Design

The project uses the following authentication flow:

```text
GITHUB_APP_CLIENT_ID
        │
        ▼
Generate App JWT using RS256
        │
        ▼
POST /app/installations/{installation_id}/access_tokens
        │
        ▼
Installation access token
        │
        ▼
Cache token in memory
        │
        ▼
Reuse token for API requests
```

The current authentication class validates:

- `GITHUB_APP_CLIENT_ID`
- `GITHUB_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY_PATH`

The private key is read only when generating the App JWT.

## 9. JWT Design

The App JWT is generated using the RSA private key and RS256.

The implementation includes:

```text
iat
exp
iss
```

The generated JWT is short-lived and is used to obtain an installation access token.

The implementation intentionally keeps JWT generation inside `GitHubAppAuth` so that resource and test layers remain independent of signing details.

## 10. Installation Access Token Design

The installation access token represents the installed GitHub App and is used by `GitHubApiClient` for API requests.

The authentication class caches the token in memory:

```text
installationToken
installationTokenExpiresAt
```

The token is reused while it remains sufficiently far from expiry. A refresh is performed when the cached token is close to expiration.

This avoids unnecessary token-generation API calls during a test run.

## 11. API Client Request Flow

Every API request follows this sequence:

```text
RepositoryApi method
        ↓
GitHubApiClient method
        ↓
getHeaders()
        ↓
GitHubAppAuth.generateInstallationToken()
        ↓
Cached token or new token
        ↓
GitHub REST API request
        ↓
APIResponse returned to RepositoryApi
        ↓
Test validates response
```

Tests therefore remain independent of token-generation mechanics.

## 12. Repository GET Design

Endpoint:

```text
GET /repos/{owner}/{repo}
```

Implementation:

```text
RepositoryApi.getRepository()
        ↓
GitHubApiClient.get()
        ↓
GitHub REST API
```

The GET test verifies:

- HTTP status is `200`
- Repository full name
- Repository name
- Owner login
- Visibility

## 13. Repository UPDATE Design

Endpoint:

```text
PATCH /repos/{owner}/{repo}
```

Implementation:

```text
RepositoryApi.updateRepository()
        ↓
GitHubApiClient.patch()
        ↓
GitHub REST API
```

The UPDATE test uses the following controlled pattern:

```text
Read original repository state
        ↓
Create test description
        ↓
PATCH repository
        ↓
Validate updated response
        ↓
Restore original description
```

Restoration is performed in a `finally` block only after a successful update, preventing cleanup failures from hiding the original test failure unnecessarily.

## 14. Repository DELETE Design

Endpoint:

```text
DELETE /repos/{owner}/{repo}
```

Implementation:

```text
RepositoryApi.deleteRepository()
        ↓
GitHubApiClient.delete()
        ↓
GitHub REST API
```

The DELETE test uses a disposable repository and follows this lifecycle:

```text
1. GET repository
   ↓
2. Verify repository exists
   ↓
3. DELETE repository
   ↓
4. Verify status 204
   ↓
5. GET repository again
   ↓
6. Verify status 404
```

The disposable repository used for the completed validation was:

```text
Govindrao1/Github_Delete_Test
```

It was deleted successfully and must not be assumed to exist for future test runs.

### DELETE Safety Rule

The DELETE test must never target the main project repository:

```text
Govindrao1/Github_UI_And_API_Project
```

A new disposable repository must be created and explicitly granted to the GitHub App installation before repeating destructive DELETE validation.

## 15. Repository CREATE Limitation

Repository CREATE is deliberately excluded from the current `RepositoryApi` implementation.

The current project authenticates using a GitHub App installation access token. An attempt to call:

```text
POST /user/repos
```

with that token returned:

```text
403 Resource not accessible by integration
```

Therefore the current architecture does not expose:

```text
createRepository()
```

under the current authentication model.

This design decision is intentionally documented rather than hiding the limitation behind a test or an unsupported API abstraction.

A future implementation of repository creation would require a suitable user-context authentication model or another explicitly supported GitHub authentication mechanism. Such a change would require an architecture review before implementation.

## 16. Current API Capability Matrix

| Operation | Endpoint | Current Status |
|---|---|---|
| GET | `GET /repos/{owner}/{repo}` | ✅ Implemented |
| UPDATE | `PATCH /repos/{owner}/{repo}` | ✅ Implemented |
| CREATE | `POST /user/repos` | ⚠️ Not implemented with current authentication context |
| DELETE | `DELETE /repos/{owner}/{repo}` | ✅ Implemented |

## 17. Environment Design

The project uses environment variables for runtime configuration.

Current configuration is loaded through:

```typescript
dotenv.config({ quiet: true });
```

Important values include:

```text
GITHUB_BASE_URL
GITHUB_API_BASE_URL
GITHUB_USERNAME
GITHUB_PASSWORD
GITHUB_APP_CLIENT_ID
GITHUB_INSTALLATION_ID
GITHUB_APP_PRIVATE_KEY_PATH
```

The application code reads these values at runtime rather than embedding credentials in source code.

## 18. Secret Management

Sensitive values are intentionally excluded from source control.

Rules:

```text
.env                     → local only
secrets/*                → local only
.env.example             → safe configuration template
.gitignore               → excludes sensitive files
```

No test or utility should print secret values.

## 19. Playwright Configuration Design

`playwright.config.ts` currently defines:

- `testDir: './tests'`
- HTML reporter
- `GITHUB_BASE_URL` as the UI base URL
- `trace: 'on-first-retry'`
- screenshots on failure
- video retained on failure
- Chromium project
- Firefox project
- WebKit project

The API client uses its own `GITHUB_API_BASE_URL` value when constructing API endpoints.

The Playwright request fixture is used through `basefixture.ts`; it is not overridden through the Playwright configuration's `use` object.

## 20. TypeScript Design

The project uses strict TypeScript configuration.

Current compiler goals include:

```text
target: ES2022
module: commonjs
moduleResolution: node
strict: true
esModuleInterop: true
resolveJsonModule: true
noEmit: true
```

Node and Playwright types are included so that environment and framework types are recognized during compilation.

Validation command:

```powershell
npx tsc --noEmit
```

## 21. Test Design Principles

Tests are responsible for:

- Calling resource methods
- Validating HTTP status codes
- Validating important response fields
- Logging useful test diagnostics

API resource classes are responsible for:

- Defining API operations
- Passing resource-specific endpoints to the client

The API client is responsible for:

- Transport
- Common headers
- Authentication integration

Authentication is responsible for:

- JWT generation
- Installation-token generation
- Token caching and refresh

This separation keeps the framework maintainable as API coverage grows.

## 22. Destructive Test Strategy

Destructive APIs require a disposable resource.

The DELETE strategy is:

```text
Create disposable repository
        ↓
Grant GitHub App installation access
        ↓
Run DELETE validation
        ↓
Repository removed
```

The main automation repository must never be used as the DELETE target.

## 23. Git Strategy

The project uses:

```text
Branch: master
Remote: origin
```

The repository is maintained through normal Git operations:

```powershell
git status
git diff
git add
git commit
git push
```

Before pushing, verify that sensitive files are not staged.

## 24. Documentation Synchronization

`design.md` is the architectural source of truth.

`README.MD` is the project-level implementation and usage documentation.

Whenever there is a project-level change such as:

- New API resource
- New authentication mechanism
- Change in fixture architecture
- Change in test organization
- Change in security strategy
- Change in major Playwright configuration

both `design.md` and `README.MD` must be updated in the same development cycle.

## 25. Current Baseline

The completed repository API baseline is:

```text
            Repository API
                  │
       ┌──────────┼──────────┐
       │          │          │
       ▼          ▼          ▼
      GET       UPDATE     DELETE
       │          │          │
       ▼          ▼          ▼
      200        200        204
                             │
                             ▼
                            GET
                             │
                             ▼
                            404
```

The current implementation has successfully validated:

```text
TypeScript compilation       ✅
Repository GET               ✅
Repository UPDATE            ✅
Repository DELETE            ✅
```

Repository CREATE remains intentionally unsupported under the current installation-token authentication approach.

## 26. Next Change Rule

Before introducing the next project-level feature, verify the current working tree and review the impact on:

```text
API layer
Authentication layer
Fixtures
Tests
README.MD
design.md
```

No architectural change should be introduced without keeping the implementation and documentation synchronized.
