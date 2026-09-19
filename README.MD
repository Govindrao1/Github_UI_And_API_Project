# GitHub UI and API Automation Framework

A Playwright + TypeScript automation framework for testing GitHub UI and REST APIs.

The framework currently supports GitHub UI login automation and GitHub API automation using **GitHub App authentication with programmatically generated installation access tokens**.

---

## Current Status

### Completed

- Playwright + TypeScript project setup
- Playwright configuration for Chromium, Firefox, and WebKit
- GitHub UI login automation
- Page Object Model for GitHub login
- Shared Playwright fixtures
- GitHub API client
- GitHub App authentication
- JWT generation using the GitHub App private key
- Installation access token generation
- Installation token caching and reuse
- API health/authentication test
- Environment-based configuration
- Secret/private-key protection through `.gitignore`
- Local Git repository initialized
- Initial framework commit created
- GitHub App authentication changes committed

### Current Git commits

```text
5669401  Cache GitHub App installation token
02bf496  Initial Playwright GitHub automation framework
```

The commits currently exist in the **local Git repository**. They have not been pushed to a remote repository yet.

---

## Technology Stack

- **Language:** TypeScript
- **Automation Framework:** Playwright
- **Runtime:** Node.js
- **Test Runner:** Playwright Test
- **API Automation:** Playwright APIRequestContext
- **Authentication:** GitHub App + JWT + Installation Access Token
- **Environment Configuration:** dotenv
- **Version Control:** Git
- **IDE:** Visual Studio Code

---

## Project Structure

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
└── tsconfig.json
```

> `secrets/`, `.env`, `node_modules/`, Playwright reports, and test results are excluded from Git.

---

# UI Automation

## GitHub Login

The current UI automation covers GitHub login using the Page Object Model.

### Page Object

```text
pages/loginpage.ts
```

The `LoginPage` handles:

- Navigation to GitHub login
- Username entry
- Password entry
- Login button interaction
- Login success verification
- Login failure detection

The login page uses semantic Playwright locators where appropriate.

Example:

```typescript
page.getByRole('button', {
    name: 'Sign in',
    exact: true
});
```

The `exact: true` option prevents the locator from also matching GitHub's passkey sign-in button.

---

# API Automation

## GitHub API Client

The common API client is:

```text
api/client/githubApiClient.ts
```

It provides reusable methods for:

```text
GET
POST
PATCH
DELETE
```

The client uses the GitHub REST API base URL configured through:

```env
GITHUB_API_BASE_URL=https://api.github.com
```

---

# GitHub App Authentication

The framework does **not** use a manually created Personal Access Token for API authentication.

Instead, API authentication follows this flow:

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
GitHub Installation
     │
     ▼
Generate Installation Access Token
     │
     ▼
Cache Installation Token
     │
     ▼
GitHub REST API
```

Authentication implementation:

```text
api/auth/githubAppAuth.ts
```

---

## JWT Generation

The framework generates a short-lived JWT using the GitHub App private key.

The JWT uses:

- RS256 signing algorithm
- GitHub App Client ID as issuer
- Issued-at timestamp
- Short expiration time

The private key is loaded from the path configured in `.env`.

---

## Installation Access Token

The generated GitHub App JWT is used to request an installation access token.

The installation ID is configured through:

```env
GITHUB_INSTALLATION_ID=...
```

The installation token is then used for GitHub REST API requests.

The token is associated with the GitHub App installation and its configured repository/permission scope.

---

# Installation Token Caching

The framework caches the GitHub App installation access token instead of generating a new token for every API request.

Current flow:

```text
API Request
     │
     ▼
Is cached installation token valid?
     │
     ├── Yes ──► Reuse token
     │
     └── No
          │
          ▼
      Generate App JWT
          │
          ▼
      Generate installation token
          │
          ▼
      Cache token + expiry
          │
          ▼
      Use token
```

A safety buffer is used before token expiry so that a token close to expiration is not reused for a new API request.

This reduces unnecessary authentication calls and keeps API requests efficient.

---

# API Health Check

The current API smoke test is:

```text
tests/api/api_health.spec.ts
```

It validates that:

1. The GitHub App authentication flow works.
2. An installation access token can be generated.
3. The installation token can authenticate against GitHub.
4. The configured repository is accessible.
5. GitHub returns HTTP `200`.

The current repository used for the health check is:

```text
Govindrao1/Github_UI_And_API_Project
```

Current successful result:

```text
✅ GitHub API authentication is working.
Repository: Govindrao1/Github_UI_And_API_Project

1 passed
```

---

# Environment Configuration

The project uses `.env` for local configuration.

Example:

```env
# GitHub UI

GITHUB_BASE_URL=https://github.com

GITHUB_USERNAME=YOUR_GITHUB_USERNAME
GITHUB_PASSWORD=YOUR_GITHUB_PASSWORD


# GitHub API

GITHUB_API_BASE_URL=https://api.github.com


# GitHub App Authentication

GITHUB_APP_ID=YOUR_APP_ID
GITHUB_APP_CLIENT_ID=YOUR_CLIENT_ID
GITHUB_INSTALLATION_ID=YOUR_INSTALLATION_ID
GITHUB_APP_PRIVATE_KEY_PATH=./secrets/YOUR_PRIVATE_KEY_FILE.pem
```

The actual `.env` file must never be committed.

The project provides:

```text
.env.example
```

as the safe configuration template.

---

# Secret Management

Sensitive files are excluded from Git.

Current `.gitignore` protection includes:

```gitignore
.env
secrets/
*.pem
node_modules/
playwright-report/
test-results/
blob-report/
```

The GitHub App private key must remain inside the local `secrets/` directory and must never be committed to the repository.

---

# Playwright Configuration

The framework currently runs against:

```text
Chromium
Firefox
WebKit
```

Configured in:

```text
playwright.config.ts
```

The configuration includes:

- Test directory
- HTML reporter
- Base URL
- Trace on first retry
- Screenshot on failure
- Video on failure

---

# Fixtures

Shared Playwright fixtures are located at:

```text
fixtures/basefixture.ts
```

Current custom fixtures:

```text
loginPage
githubApiClient
```

This allows tests to directly consume the required page objects and API client.

Example:

```typescript
test('GitHub API health check', async ({
    githubApiClient
}) => {
    // API test
});
```

---

# Running Tests

## UI Login Test

Chromium:

```powershell
npx playwright test tests/UI_login.spec.ts --project=chromium
```

Headed mode:

```powershell
npx playwright test tests/UI_login.spec.ts --project=chromium --headed
```

Debug mode:

```powershell
npx playwright test tests/UI_login.spec.ts --project=chromium --debug
```

---

## API Health Test

```powershell
npx playwright test tests/api/api_health.spec.ts --project=chromium
```

---

## Run All Tests

```powershell
npx playwright test
```

---

## Open HTML Report

```powershell
npx playwright show-report
```

---

# Git Workflow

The project is currently initialized as a local Git repository.

Current branch:

```text
master
```

Current commits:

```text
5669401  Cache GitHub App installation token
02bf496  Initial Playwright GitHub automation framework
```

The working tree was clean after the latest commit.

The repository has **not yet been pushed to a remote GitHub repository**.

---

# Development Roadmap

The next stages will be implemented incrementally.

```text
GitHub App Authentication                 ✅
        │
        ▼
API Client                                ✅
        │
        ▼
API Health Check                          ✅
        │
        ▼
Repository API                            ← Next
        │
        ├── Get Repository
        ├── Create Repository
        ├── Update Repository
        └── Delete Repository
        │
        ▼
Issues API
        │
        ▼
Pull Requests API
        │
        ▼
Branches API
        │
        ▼
Commits API
        │
        ▼
Actions API
        │
        ▼
Hybrid UI + API Workflows
        │
        ▼
CI/CD
```

---

# Automation Strategy

The framework will use the appropriate automation layer for each scenario.

### UI Automation

Used for:

- User-facing workflows
- Browser behavior
- UI validations
- Authentication flows
- Visual/user interaction scenarios

### API Automation

Used for:

- Backend behavior
- CRUD operations
- Data setup and cleanup
- Permission validation
- API response validation
- Larger test-data operations

### Hybrid Automation

Used when an API and UI workflow are more efficient together.

Typical pattern:

```text
API
 │
 ├── Create test data
 │
 ▼
UI
 │
 ├── Validate user-facing behavior
 │
 ▼
API
 │
 └── Verify backend state
```

---

# Current Project Baseline

At this stage the framework has a working foundation for both UI and API automation.

The most important completed milestone is:

```text
GitHub App authentication
        +
Installation token caching
        +
Reusable API client
        +
API health validation
```

The next implementation milestone is the **Repository API layer**.
