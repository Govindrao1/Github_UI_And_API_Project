# GitHub UI and API Automation Framework — Design

## 1. Purpose

This document is the source of truth for the architecture and design of the current GitHub UI and API automation project.

The framework is built with Playwright and TypeScript and separates UI automation, API authentication, API transport, API resources, fixtures, page objects, and test validation.

Any project-level architecture or design change must be reflected here and synchronized with `README.MD`.

## 2. Current Implementation Baseline

The current implementation contains:

```text
UI Login
UI Repository CREATE
API Health
Repository GET
Repository UPDATE
Repository DELETE
UI CREATE → API Validation
UI vs API Repository Validation
GitHub App JWT authentication
Installation access-token caching
JSON Schema + AJV request/response contract validation
Shared Playwright fixtures
```

Repository CREATE is **not implemented in the current API resource layer** because the project uses an installation access token and the attempted user-context `POST /user/repos` operation returned `403 Resource not accessible by integration`.

Repository CREATE **is implemented at the UI layer** and is covered by the hybrid end-to-end scenario.

## 3. High-Level Architecture

```text
                         Playwright Tests
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
             UI Layer                    API Layer
                 │                           │
        ┌────────┼────────┐                  │
        │        │        │                  ▼
        ▼        ▼        ▼            RepositoryApi
   LoginPage  NewRepo   Repository          │
              Page       Page               ▼
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

The structure separates responsibilities so that test cases do not need to know authentication or low-level HTTP details.

## 5. UI Page Object Architecture

The UI layer follows the Page Object Model.

### 5.1 LoginPage

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

### 5.2 NewRepositoryPage

```text
Hybrid Test
    │
    ▼
NewRepositoryPage
    │
    ▼
GitHub Create Repository UI
```

`NewRepositoryPage` owns:

- Reading the selected repository owner
- Repository name entry
- Repository name availability validation
- Description entry
- Private visibility selection
- Add README selection
- Create repository click

The page object intentionally does not perform API calls.

Repository name availability is treated as a UI readiness condition. The framework waits for GitHub's visible `is available.` state rather than using a fixed delay before submitting the form.

The create action itself is intentionally kept as a simple enabled-button click. Post-create repository synchronization is handled outside the page object.

### 5.3 RepositoryPage

```text
Hybrid Test
    │
    ▼
RepositoryPage
    │
    ▼
GitHub Repository UI
```

`RepositoryPage` owns:

- Repository navigation
- Repository name extraction
- Repository owner extraction
- Repository description extraction
- Repository visibility extraction

The repository description locator is scoped to the repository `article` so that hidden responsive/mobile description elements are not selected.

Repository navigation explicitly validates the expected repository URL. The implementation handles the observed `net::ERR_ABORTED` case only when the browser has already reached the expected repository URL; unrelated navigation errors continue to fail the test.

## 6. Fixture Architecture

`fixtures/basefixture.ts` extends the Playwright base test.

Current custom fixtures:

```text
loginPage
newRepositoryPage
repositoryPage
githubApiClient
```

Architecture:

```text
Playwright base test
        │
        ├── page fixture
        │      ├── LoginPage
        │      ├── NewRepositoryPage
        │      └── RepositoryPage
        │
        └── request fixture
               ↓
         GitHubApiClient
```

This allows UI page objects and the API client to be injected directly into tests.

## 7. Hybrid UI/API Test Architecture

The repository hybrid test is located at:

```text
tests/e2e/repositories/ui_create_repository.spec.ts
```

The architecture is:

```text
1. Login through UI
        ↓
2. Create repository through UI
        ↓
3. Read actual owner from UI
        ↓
4. Poll repository GET API until HTTP 200
        ↓
5. Validate API response against JSON Schema with AJV
        ↓
6. Validate API repository details
        ↓
7. Navigate to the created repository through UI
        ↓
8. Read actual UI repository details
        ↓
9. Compare UI and API details
```

The test compares:

```text
Repository Name
Owner
Description
Visibility
```

The API `private` boolean is normalized to the UI visibility representation:

```text
private = true  → private
private = false → public
```

The cross-interface comparison remains in the test layer because it is test validation logic rather than a page-object or API-resource responsibility.

The hybrid test validates the repository API response against the reusable repository JSON Schema before performing scenario-specific API assertions and UI/API comparison.

### 7.1 UI CREATE → API UPDATE → UI VERIFY

A second hybrid scenario validates cross-layer state synchronization after an API mutation.

The test is:

```text
tests/e2e/repositories/ui_update_repository.spec.ts
```

Its flow is:

```text
1. Login through UI
        ↓
2. Create unique disposable repository through UI
        ↓
3. Poll API GET until repository is available
        ↓
4. Validate repository response schema
        ↓
5. Build API UPDATE payload
        ↓
6. Validate UPDATE request payload schema
        ↓
7. Execute API PATCH
        ↓
8. Validate updated repository response schema
        ↓
9. Verify updated description through API GET
        ↓
10. Open repository through UI
        ↓
11. Verify updated description through UI
        ↓
12. Delete disposable repository
```

This scenario proves that an API-side state change is observable through the UI.

The test owns its disposable repository lifecycle. A unique repository name is generated for each execution, and cleanup is performed through the repository DELETE API in a `finally` block.

The updated description is verified directly in the scenario using a visible page-level locator. This is intentionally kept out of the shared `RepositoryPage` because the scenario exposed GitHub's responsive/mobile description element as a hidden duplicate; the shared page object remains unchanged.

The test therefore adds hybrid behavior without introducing a new shared page-object abstraction for a scenario-specific DOM condition.

## 8. Backend Synchronization Strategy

The UI create action and backend API availability are treated as separate events.

The framework uses the repository GET endpoint as a synchronization point:

```text
UI Create click
      ↓
Backend repository creation
      ↓
API GET returns 404 while unavailable
      ↓
API GET eventually returns 200
      ↓
Continue with validation
```

The implementation uses Playwright `expect.poll()` with a bounded timeout and explicit polling intervals.

This is preferred over:

```text
waitForTimeout(...)
```

because the test waits for the required backend condition instead of an arbitrary amount of time.

## 9. API Architecture

The API architecture has three primary layers.

### 9.1 API Resource Layer

```text
api/repositories/repositoryApi.ts
```

Responsible for repository-level operations:

```text
getRepository()
updateRepository()
deleteRepository()
```

The resource layer exposes business-oriented methods rather than raw HTTP implementation details.

### 9.2 API Client Layer

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

The API client remains reusable across different GitHub API resource classes.

### 9.3 Authentication Layer

```text
api/auth/githubAppAuth.ts
```

Responsible for GitHub App authentication and installation-token lifecycle management.

## 10. GitHub App Authentication Design

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

## 11. JWT Design

The App JWT is generated using the RSA private key and RS256.

The implementation includes:

```text
iat
exp
iss
```

The generated JWT is short-lived and is used to obtain an installation access token.

JWT generation remains inside `GitHubAppAuth` so that resource and test layers remain independent of signing details.

## 12. Installation Access Token Design

The installation access token represents the installed GitHub App and is used by `GitHubApiClient` for API requests.

The authentication class caches the token in memory:

```text
installationToken
installationTokenExpiresAt
```

The token is reused while it remains sufficiently far from expiry. A refresh is performed when the cached token is close to expiration.

This avoids unnecessary token-generation API calls during a test run.

## 13. API Client Request Flow

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

## 14. Repository GET Design

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
- Repository response conforms to the repository JSON Schema through AJV
- Repository full name
- Repository name
- Owner login
- Visibility

The same endpoint is also used as the backend synchronization point in the hybrid UI/API repository test.

## 15. Repository UPDATE Design

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

The returned repository object is validated against the shared repository JSON Schema through AJV before scenario-specific assertions are evaluated.

Restoration is performed in a `finally` block only after a successful update, preventing the test from leaving the main repository in a modified state.

## 16. Repository DELETE Design

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

The DELETE test is intentionally self-contained. It creates a unique disposable repository through the UI and then uses the API to exercise and verify the destructive operation.

The current lifecycle is:

```text
1. Login through UI
   ↓
2. Create unique disposable repository through UI
   ↓
3. Poll GET /repos/{owner}/{repo} until HTTP 200
   ↓
4. DELETE /repos/{owner}/{repo}
   ↓
5. Verify DELETE returns HTTP 204
   ↓
6. GET /repos/{owner}/{repo} again
   ↓
7. Verify HTTP 404
```

The test is located at:

```text
tests/api/repositories/delete_repository.spec.ts
```

Creating the disposable resource inside the test removes the dependency on a pre-existing repository and makes the destructive test data lifecycle explicit. The unique repository name also prevents parallel Chromium, Firefox, and WebKit executions from targeting the same resource.

### DELETE Safety Rule

The DELETE test must never target the main project repository:

```text
Govindrao1/Github_UI_And_API_Project
```

The main project repository remains untouched. The DELETE test owns only the disposable repository that it creates for that execution.

## 17. Repository CREATE Limitation

Repository CREATE is deliberately excluded from the current `RepositoryApi` implementation.

The current project authenticates using a GitHub App installation access token. An attempt to call:

```text
POST /user/repos
```

with that token returned:

```text
403 Resource not accessible by integration
```

Therefore the current API architecture does not expose:

```text
createRepository()
```

under the current authentication model.

This design decision is intentionally documented rather than hiding the limitation behind an unsupported API abstraction.

Repository creation is covered through the UI layer instead:

```text
NewRepositoryPage
      ↓
GitHub UI repository creation
      ↓
RepositoryApi.getRepository()
      ↓
Cross-interface validation
```

A future API-based repository-creation implementation would require a suitable user-context authentication model or another explicitly supported GitHub authentication mechanism. Such a change requires an architecture review before implementation.

## 18. Current API Capability Matrix

| Operation | Endpoint | Current Status |
|---|---|---|
| GET | `GET /repos/{owner}/{repo}` | ✅ Implemented |
| UPDATE | `PATCH /repos/{owner}/{repo}` | ✅ Implemented |
| CREATE | `POST /user/repos` | ⚠️ Not implemented with current authentication context |
| DELETE | `DELETE /repos/{owner}/{repo}` | ✅ Implemented |

## 19. Environment Design

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

The hybrid UI/API repository scenario reads the actual selected owner from the UI. A separate repository-owner environment variable is not required by the current implementation.

## 20. Secret Management

Sensitive values are intentionally excluded from source control.

Rules:

```text
.env                     → local only
secrets/*                → local only
.env.example             → safe configuration template
.gitignore               → excludes sensitive files
```

No test or utility should print secret values.

## 21. Negative API Response Validation

The framework validates expected API error responses separately from successful repository-object responses.

### 21.1 Non-existent Repository Scenario

The negative repository GET test is:

```text
tests/api/repositories/get_nonexistent_repository.spec.ts
```

The scenario is intentionally non-destructive:

```text
GET /repos/{owner}/{non-existent-repository}
        ↓
HTTP 404
        ↓
Read JSON error response
        ↓
Validate github-error.schema.json with AJV
        ↓
Validate expected error details
```

The error response schema is stored at:

```text
schemas/github-error.schema.json
```

The schema validates the common error contract while allowing additional fields returned by GitHub. The HTTP status code remains a separate assertion because it is part of the transport-level response, while the JSON schema validates the response body.

### 21.2 Negative Contract vs Business Validation

```text
HTTP Response
     │
     ├── HTTP assertion
     │      → expected status 404
     │
     ├── AJV / JSON Schema
     │      → error response structure and field types
     │
     └── Test assertions
            → message is "Not Found"
            → body status represents 404
```

This keeps transport validation, response-contract validation, and scenario-specific assertions separate.

## 21. Playwright Configuration Design

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

## 22. TypeScript Design

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

## 23. Test Design Principles

Tests are responsible for:

- Calling resource methods
- Validating HTTP status codes
- Validating important response fields
- Performing cross-interface comparison when required
- Logging useful test diagnostics

UI page objects are responsible for:

- Locators
- UI navigation
- UI actions
- UI-specific extraction and assertions needed by the page abstraction

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

This separation keeps the framework maintainable as UI and API coverage grows.

## 24. Destructive Test Strategy

Destructive APIs require a disposable resource whose lifecycle is controlled by the test.

The current DELETE strategy is:

```text
UI Login
        ↓
Create unique disposable repository through UI
        ↓
Verify repository availability through API
        ↓
Run DELETE validation through API
        ↓
Verify repository returns 404
```

This strategy avoids depending on a fixed, pre-existing disposable repository and makes the test data ownership explicit. The main automation repository must never be used as the DELETE target.

## 25. Validation and Execution Baseline

The current full-project regression command is:

```powershell
npx playwright test
```

The project supports Chromium, Firefox, and WebKit execution. For visual debugging, tests can be run in headed mode:

```powershell
npx playwright test --headed
```

The current full-project regression checkpoint has passed all 24 tests across the configured browser projects. This count is a current execution baseline and will change as coverage evolves.

## 26. Git Strategy

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

## 27. Documentation Synchronization

`design.md` is the architectural source of truth.

`README.MD` is the project-level implementation and usage documentation.

Whenever there is a project-level change such as:

- New API resource
- New authentication mechanism
- New UI page object
- Change in fixture architecture
- Change in test organization
- Change in security strategy
- Change in major Playwright configuration
- New hybrid UI/API validation flow

both `design.md` and `README.MD` must be updated in the same development cycle.

## 28. Current Validation Baseline

The completed validation baseline is:

```text
                    GitHub Automation
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
          UI Layer                    API Layer
             │                           │
      ┌──────┼──────┐              ┌────┼────┐
      │      │      │              │    │    │
      ▼      ▼      ▼              ▼    ▼    ▼
    Login  Create  Repo            GET UPDATE DELETE
             │      Page            │    │      │
             │        │             200  200    204
             │        │
             └────┬───┘
                  │
                  ▼
          UI → API Synchronization
                  │
                  ▼
          API Detail Validation
                  │
                  ▼
          UI Detail Validation
                  │
                  ▼
            UI ↔ API Compare
                  │
                  ▼
                 ✅
```

The current implementation has successfully validated:

```text
TypeScript compilation          ✅
UI Login                        ✅
UI Repository CREATE            ✅
Repository GET                  ✅
Repository UPDATE               ✅
Repository DELETE               ✅
AJV Repository GET validation              ✅
AJV Repository UPDATE validation           ✅
AJV UI CREATE → API GET validation         ✅
AJV Repository UPDATE request validation   ✅
AJV Invalid UPDATE request validation      ✅
AJV 404 error response validation         ✅
DELETE disposable-resource lifecycle      ✅
UI CREATE → API Validation                 ✅
UI vs API Detail Comparison     ✅
UI CREATE → API UPDATE → UI VERIFY          ✅
```

Repository CREATE through the current API layer remains intentionally unsupported.

## 29. Current Regression Baseline

The latest full-project regression baseline is:

```text
27 tests passed
```

This baseline includes the repository UI/API CREATE and UPDATE hybrid scenarios, API contract validation, negative request validation, and disposable-resource DELETE lifecycle.

## 30. Next Change Rule

Before introducing the next project-level feature, verify the current working tree and review the impact on:

```text
UI page-object layer
API layer
Authentication layer
Fixtures
Tests
README.MD
design.md
```

No architectural change should be introduced without keeping the implementation and documentation synchronized.

## 30. API Response Schema Validation Design

The framework uses JSON Schema with AJV as a reusable API response-contract validation layer.

### 30.1 Schema Location

The current repository response contract is stored at:

```text
schemas/repository.schema.json
```

The schema defines required repository fields and their expected JSON data types, including the nested owner object. The schema allows additional response properties so that new GitHub fields do not create unnecessary failures in existing automation.

### 30.2 Reusable Validator

The validation utility is:

```text
utils/schemaValidator.ts
```

Its responsibility is to:

```text
Receive schema
      ↓
Compile schema with AJV
      ↓
Validate API response JSON
      ↓
PASS → continue test
FAIL → throw detailed validation error
```

The utility is intentionally kept outside the API client and repository resource layers. It is a test-support capability used after an API response has been received.

### 30.3 Current Repository Response Schema Coverage

```text
Repository GET response
        ↓
repository.schema.json
        ↓
AJV validation ✅

Repository UPDATE response
        ↓
repository.schema.json
        ↓
AJV validation ✅

UI CREATE → API GET response
        ↓
repository.schema.json
        ↓
AJV validation ✅
```

The DELETE response is not passed through the repository schema because a successful DELETE does not return a repository object. Error responses use the dedicated GitHub error schema described separately below.

### 30.4 Contract Validation vs Business Validation

The framework keeps these responsibilities separate:

```text
API Response
     │
     ├── AJV / JSON Schema
     │      → structure, required fields, data types, enum constraints
     │
     └── Test Assertions
            → expected repository name
            → expected owner
            → expected description
            → expected visibility
```

This allows the same response contract to be reused across multiple tests while keeping scenario-specific expectations inside the tests.

### 30.5 Failure Behavior

When validation fails, `schemaValidator.ts` throws an error containing the schema-validation messages returned by AJV. A successful validation logs the schema name and a concise pass message.

### 30.6 Extension Strategy

Future schema work should extend the contract layer only when a new API response requires it. Examples include:

```text
Additional repository response schemas
Negative schema-validation tests
Richer AJV diagnostics
Shared schema-loading conventions
```

The existing repository schema should be reused whenever the response contract is the same.

## 31. API Request-Payload Schema Validation Design

The framework validates applicable API request payloads with JSON Schema and AJV before the request is sent.

### 31.1 UPDATE Request Schema

The current UPDATE request contract is stored at:

```text
schemas/update-repository-request.schema.json
```

The schema currently requires:

```text
description → string
```

Unexpected request properties are rejected by the schema.

### 31.2 UPDATE Validation Flow

The UPDATE test follows this sequence:

```text
Read original repository state
        ↓
Build update payload
        ↓
AJV request-schema validation
        ↓
PATCH /repos/{owner}/{repo}
        ↓
HTTP 200
        ↓
AJV response-schema validation
        ↓
Business assertions
        ↓
Restore original description
```

The same `updatePayload` object that is schema-validated is passed to `RepositoryApi.updateRepository()`. This ensures the test validates the exact request body that it sends.

### 31.3 Contract Validation Responsibilities

Request validation protects the outbound contract:

```text
Request schema
    → required fields
    → JSON data types
    → allowed properties
```

Response validation protects the inbound contract:

```text
Response schema
    → required fields
    → JSON data types
    → enum constraints
```

Business assertions remain in the test layer and verify scenario-specific values.

### 31.4 Current Contract Validation Coverage

```text
UPDATE request payload              → AJV ✅
GET repository response             → AJV ✅
UPDATE repository response          → AJV ✅
UI CREATE → API GET response        → AJV ✅
404 error response                  → AJV ✅
```

The framework should reuse an existing schema when the request or response contract is the same rather than duplicating schemas.

### 31.5 Negative UPDATE Request Validation

The negative UPDATE request test is located at:

```text
tests/api/repositories/update_invalid_request.spec.ts
```

The test intentionally builds an invalid payload, for example a numeric `description`, and validates it against the existing UPDATE request schema:

```text
Invalid update payload
        ↓
AJV request-schema validation
        ↓
Expected validation failure
        ↓
No PATCH request is invoked
```

This test validates the framework's request-contract guard without making an invalid external API call. It also confirms that request validation remains a prerequisite to the API operation.

## 32. Negative API Error Response Schema Design

The framework validates expected GitHub API error responses with a dedicated JSON Schema and the same reusable AJV validator.

### 32.1 Error Schema

The current error response contract is stored at:

```text
schemas/github-error.schema.json
```

The schema defines the required `message` field and supports documented error response properties such as `documentation_url` and `status`. Additional properties are allowed so that the contract remains tolerant of other GitHub error fields.

### 32.2 Non-existent Repository Flow

The negative test is located at:

```text
tests/api/repositories/get_nonexistent_repository.spec.ts
```

The flow is:

```text
GET deliberately non-existent repository
        ↓
HTTP 404
        ↓
Read JSON error response
        ↓
AJV validation using github-error.schema.json
        ↓
Validate expected error details
```

This test is non-destructive because it does not create, update, or delete a repository.
