# GitHub UI and API Automation Framework — Design

## 1. Purpose

This document is the **source of truth for the architecture and design decisions** of the GitHub UI and API automation framework.

The framework is built using Playwright and TypeScript and is designed to automate GitHub through:

- UI automation
- REST API automation
- Hybrid UI + API workflows

Architecture and framework-level changes must be reflected in this document.

---

# 2. Technology Stack

| Area | Technology |
|---|---|
| Language | TypeScript |
| Automation Framework | Playwright |
| Test Runner | Playwright Test |
| API Automation | Playwright APIRequestContext |
| Runtime | Node.js |
| Environment Configuration | dotenv |
| Version Control | Git |
| Browser Coverage | Chromium, Firefox, WebKit |

---

# 3. High-Level Architecture

```text
                    GitHub Automation Framework
                              │
                ┌─────────────┴─────────────┐
                │                           │
             UI Layer                   API Layer
                │                           │
                ▼                           ▼
         Page Objects                 API Client
                │                           │
                │                    GitHub App Auth
                │                           │
                │                           ▼
                │                    JWT Generation
                │                           │
                │                           ▼
                │               Installation Access Token
                │                           │
                │                           ▼
                │                    Token Cache
                │                           │
                └─────────────┬─────────────┘
                              │
                              ▼
                       GitHub Platform
```

---

# 4. Project Structure

```text
GitHub/
│
├── api/
│   ├── auth/
│   │   └── githubAppAuth.ts
│   │
│   └── client/
│       └── githubApiClient.ts
│
├── components/
│
├── constants/
│
├── data/
│
├── fixtures/
│   └── basefixture.ts
│
├── pages/
│   └── loginpage.ts
│
├── secrets/
│   └── <GitHub App private key>.pem
│
├── tests/
│   ├── UI_login.spec.ts
│   │
│   └── api/
│       └── api_health.spec.ts
│
├── utils/
│
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

The framework is being developed incrementally. Empty or future-purpose directories are not required to contain implementation until that layer is introduced.

---

# 5. UI Automation Architecture

## 5.1 Page Object Model

UI automation follows the Page Object Model.

Current page object:

```text
pages/loginpage.ts
```

Responsibilities:

- Navigate to GitHub login
- Enter username
- Enter password
- Click Sign in
- Validate successful login
- Detect login failure

Tests should interact with page objects rather than directly implementing page locators and actions wherever practical.

---

# 6. API Automation Architecture

The API layer is divided into:

```text
API Test
    │
    ▼
API Domain Layer
    │
    ▼
GitHub API Client
    │
    ▼
GitHub App Authentication
    │
    ▼
GitHub REST API
```

The current common API client is:

```text
api/client/githubApiClient.ts
```

It provides reusable HTTP operations:

```text
GET
POST
PATCH
DELETE
```

Domain-specific API modules will be added incrementally.

Planned examples:

```text
api/
├── repositories/
├── issues/
├── pullRequests/
├── branches/
├── commits/
└── actions/
```

---

# 7. GitHub App Authentication Architecture

## 7.1 Authentication Decision

The framework uses **GitHub App authentication** instead of requiring a manually created Personal Access Token for API automation.

Authentication implementation:

```text
api/auth/githubAppAuth.ts
```

---

## 7.2 Authentication Flow

```text
GitHub App
     │
     ▼
Private Key (.pem)
     │
     ▼
Generate App JWT
     │
     ▼
GitHub App Installation
     │
     ▼
Generate Installation Access Token
     │
     ▼
Cache Installation Token
     │
     ▼
GitHub API Client
     │
     ▼
GitHub REST API
```

---

# 8. JWT Generation

The authentication component generates a short-lived JWT using the GitHub App private key.

JWT design:

- Signing algorithm: RS256
- Issuer: GitHub App Client ID
- Issued-at timestamp is set slightly in the past
- Short expiration period is used
- Private key is loaded from the protected `secrets/` directory

The JWT is used only to authenticate the GitHub App when requesting an installation access token.

The JWT itself is not used as the authorization token for normal repository API calls.

---

# 9. Installation Access Token

After generating the GitHub App JWT, the authentication component requests an installation access token for the configured GitHub App installation.

Configuration:

```env
GITHUB_APP_CLIENT_ID=...
GITHUB_INSTALLATION_ID=...
GITHUB_APP_PRIVATE_KEY_PATH=./secrets/<private-key>.pem
```

The installation access token is then supplied to the API client through:

```http
Authorization: Bearer <installation-token>
```

The token permissions are limited by the GitHub App installation permissions and selected repositories.

---

# 10. Installation Token Caching

## 10.1 Design Decision

The framework caches the GitHub App installation access token.

A new installation token is **not generated for every API request**.

This avoids unnecessary token-generation requests and allows multiple API operations to reuse the same valid installation token.

---

## 10.2 Token Cache Flow

```text
API Request
     │
     ▼
Check cached installation token
     │
     ├── Valid
     │     │
     │     ▼
     │  Reuse token
     │
     └── Missing / Near Expiry
           │
           ▼
       Generate App JWT
           │
           ▼
       Request new installation token
           │
           ▼
       Store token + expiry
           │
           ▼
       Use token
```

---

## 10.3 Expiration Handling

The GitHub installation token response contains:

```text
token
expires_at
```

The framework stores both values.

Before reusing a cached token, the framework checks its expiration time.

A safety buffer is applied so that a token close to expiration is treated as invalid and replaced with a newly generated installation token.

Current safety buffer:

```text
5 minutes
```

This prevents an API request from intentionally starting with a token that is close to expiration.

---

# 11. GitHub API Client

The API client:

```text
api/client/githubApiClient.ts
```

is responsible for:

- Holding the Playwright `APIRequestContext`
- Reading the configured GitHub API base URL
- Obtaining an installation access token through `GitHubAppAuth`
- Building common authorization headers
- Executing HTTP requests

The client should remain generic.

GitHub resource-specific behavior should be implemented in domain API classes rather than adding repository/issue/pull-request business logic directly into the common client.

---

# 12. Fixtures Architecture

Shared fixtures are located at:

```text
fixtures/basefixture.ts
```

Current custom fixtures:

```text
loginPage
githubApiClient
```

Conceptually:

```text
Playwright Test
       │
       ▼
baseFixture
       │
       ├── loginPage
       │
       └── githubApiClient
```

This keeps test setup reusable and prevents repeated construction of common framework objects.

---

# 13. Environment Configuration

Environment-specific values are stored in `.env`.

Example categories:

```text
GitHub UI
GitHub API
GitHub App Authentication
```

Important configuration values include:

```env
GITHUB_BASE_URL=https://github.com
GITHUB_API_BASE_URL=https://api.github.com

GITHUB_USERNAME=...
GITHUB_PASSWORD=...

GITHUB_APP_ID=...
GITHUB_APP_CLIENT_ID=...
GITHUB_INSTALLATION_ID=...
GITHUB_APP_PRIVATE_KEY_PATH=./secrets/<private-key>.pem
```

The actual secret values must not be committed to Git.

`.env.example` provides the safe configuration template.

---

# 14. Secret Management

The following are excluded from Git:

```text
.env
secrets/
*.pem
```

Generated dependencies and test artifacts are also excluded:

```text
node_modules/
playwright-report/
test-results/
blob-report/
```

The GitHub App private key must remain outside version control.

---

# 15. Test Architecture

Tests are organized by automation layer.

Current structure:

```text
tests/
├── UI_login.spec.ts
└── api/
    └── api_health.spec.ts
```

Future structure:

```text
tests/
├── ui/
├── api/
└── hybrid/
```

The framework will expand these directories as the corresponding automation layers are implemented.

---

# 16. API Health Check

Current API smoke test:

```text
tests/api/api_health.spec.ts
```

Purpose:

- Verify GitHub API connectivity
- Verify GitHub App authentication
- Verify installation token generation
- Verify installation token authorization
- Verify access to the configured repository

Current validation repository:

```text
Govindrao1/Github_UI_And_API_Project
```

Expected successful response:

```text
HTTP 200
```

The health test has been successfully executed after implementing installation-token caching.

---

# 17. UI and API Strategy

## UI Automation

Use UI automation for:

- User-facing workflows
- Browser behavior
- Page interaction
- UI validations
- Authentication flows
- End-to-end user journeys

## API Automation

Use API automation for:

- Backend validation
- CRUD operations
- Test data creation
- Test data cleanup
- Permission validation
- Response validation
- Large data operations

## Hybrid Automation

Use both layers when the workflow benefits from combining API and UI.

Example:

```text
API
 │
 └── Create test data
          │
          ▼
        UI
          │
          └── Validate user-facing behavior
                    │
                    ▼
                   API
                    │
                    └── Verify backend state
```

---

# 18. Repository API Design — Next Implementation

The next API domain to implement is the Repository API.

Planned structure:

```text
api/
├── auth/
│   └── githubAppAuth.ts
│
├── client/
│   └── githubApiClient.ts
│
└── repositories/
    └── repositoryApi.ts
```

Initial operation:

```text
GET repository
```

Planned repository operations:

```text
GET repository
Create repository
Update repository
Delete repository
```

Tests will be added under:

```text
tests/api/repositories/
```

The repository API layer will reuse the existing:

```text
GitHubAppAuth
       ↓
GitHubApiClient
```

and will not implement authentication independently.

---

# 19. Future API Domains

After Repository API implementation, planned domains include:

```text
Issues
Pull Requests
Branches
Commits
Actions
Releases
Webhooks
Users
```

These will be introduced incrementally based on project requirements.

---

# 20. Git Strategy

The project uses Git for version control.

Current local commits include:

```text
5669401  Cache GitHub App installation token
02bf496  Initial Playwright GitHub automation framework
```

The README has also been updated and committed after documenting the current framework state.

The local repository has not yet been pushed to a remote repository.

Architecture changes should be committed separately from feature changes when practical so that framework evolution remains traceable.

---

# 21. Current Architecture Baseline

The framework currently has the following completed architecture:

```text
                    Playwright Test
                          │
             ┌────────────┴────────────┐
             │                         │
          UI Tests                  API Tests
             │                         │
             ▼                         ▼
        LoginPage              GitHubApiClient
                                       │
                                       ▼
                                GitHubAppAuth
                                       │
                           ┌───────────┴───────────┐
                           │                       │
                     Generate JWT          Cached Token
                           │                       │
                           ▼                       │
                  Installation Token ◄────────────┘
                           │
                           ▼
                     GitHub REST API
```

This is the current source-of-truth architecture.

---

# 22. Current Development Status

```text
Playwright + TypeScript setup          ✅
UI Login automation                    ✅
Page Object Model                      ✅
Shared fixtures                        ✅
GitHub API client                      ✅
GitHub App authentication              ✅
JWT generation                         ✅
Installation token generation          ✅
Installation token caching             ✅
API health check                       ✅
Environment configuration              ✅
Secret protection                      ✅
Git initialization                     ✅
Initial Git commit                     ✅
README documentation                   ✅
Architecture documentation             ✅

Repository API                         ⏳ Next
Issues API                             ⏳
Pull Requests API                      ⏳
Branches API                           ⏳
Commits API                            ⏳
Actions API                            ⏳
Hybrid workflows                       ⏳
CI/CD                                  ⏳
```

---

# 23. Architecture Principles

The framework should follow these principles:

1. **Separation of concerns**  
   Authentication, API transport, domain APIs, page objects, fixtures, and tests should remain separated.

2. **Reusable authentication**  
   Authentication should be implemented once and reused by all API domains.

3. **Reusable API client**  
   Common HTTP behavior belongs in `githubApiClient.ts`.

4. **Domain-specific API classes**  
   Repository, issue, pull-request, and other domain operations should not be placed directly in the common API client.

5. **Secure configuration**  
   Credentials and private keys must remain outside source control.

6. **Incremental implementation**  
   Build and validate one API domain at a time.

7. **Test-layer separation**  
   UI, API, and hybrid tests should remain distinguishable.

8. **Documentation synchronization**  
   Architecture changes must be reflected in `design.md`, and project status/documentation changes must be reflected in `README.MD`.

9. **Stable checkpoints**  
   Significant architecture changes should be validated and committed before moving to the next layer.

10. **No unnecessary duplication**  
    Authentication and common infrastructure should not be reimplemented inside individual API tests or domain modules.
