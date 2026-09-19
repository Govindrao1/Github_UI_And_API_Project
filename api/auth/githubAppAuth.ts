import fs from 'fs';
import jwt from 'jsonwebtoken';
import { APIRequestContext } from '@playwright/test';

interface InstallationTokenResponse {
    token: string;
    expires_at: string;
}

export class GitHubAppAuth {
    private readonly request: APIRequestContext;
    private readonly clientId: string;
    private readonly installationId: string;
    private readonly privateKeyPath: string;

    private installationToken?: string;
    private installationTokenExpiresAt = 0;

    constructor(request: APIRequestContext) {
        this.request = request;

        this.clientId =
            process.env.GITHUB_APP_CLIENT_ID ?? '';

        this.installationId =
            process.env.GITHUB_INSTALLATION_ID ?? '';

        this.privateKeyPath =
            process.env.GITHUB_APP_PRIVATE_KEY_PATH ?? '';

        if (!this.clientId) {
            throw new Error(
                'Missing GITHUB_APP_CLIENT_ID'
            );
        }

        if (!this.installationId) {
            throw new Error(
                'Missing GITHUB_INSTALLATION_ID'
            );
        }

        if (!this.privateKeyPath) {
            throw new Error(
                'Missing GITHUB_APP_PRIVATE_KEY_PATH'
            );
        }

        if (!fs.existsSync(this.privateKeyPath)) {
            throw new Error(
                `GitHub App private key not found: ${this.privateKeyPath}`
            );
        }
    }

    /**
     * Generates a short-lived JWT for GitHub App authentication.
     */
    private generateJwt(): string {
        const privateKey = fs.readFileSync(
            this.privateKeyPath,
            'utf8'
        );

        const now = Math.floor(Date.now() / 1000);

        return jwt.sign(
            {
                iat: now - 60,
                exp: now + 9 * 60,
                iss: this.clientId,
            },
            privateKey,
            {
                algorithm: 'RS256',
            }
        );
    }

    /**
     * Returns a valid GitHub App installation token.
     *
     * The token is cached and reused until it is close to expiry.
     * A new token is generated automatically when required.
     */
    async generateInstallationToken(): Promise<string> {
        const currentTime = Date.now();

        /*
         * Reuse the existing token if it is still valid.
         *
         * Five-minute safety buffer is used so that a token
         * close to expiry is not reused for a new API request.
         */
        const tokenIsValid =
            this.installationToken &&
            currentTime <
                this.installationTokenExpiresAt - 5 * 60 * 1000;

        if (tokenIsValid) {
            return this.installationToken;
        }

        const appJwt = this.generateJwt();

        const response = await this.request.post(
            `https://api.github.com/app/installations/${this.installationId}/access_tokens`,
            {
                headers: {
                    Accept:
                        'application/vnd.github+json',
                    Authorization:
                        `Bearer ${appJwt}`,
                    'X-GitHub-Api-Version':
                        '2026-03-10',
                },
            }
        );

        if (!response.ok()) {
            const responseBody =
                await response.text();

            throw new Error(
                `Failed to generate GitHub installation token. ` +
                `Status: ${response.status()}, ` +
                `Response: ${responseBody}`
            );
        }

        const responseBody =
            (await response.json()) as InstallationTokenResponse;

        if (
            !responseBody.token ||
            !responseBody.expires_at
        ) {
            throw new Error(
                'GitHub installation token response did not contain token or expires_at.'
            );
        }

        this.installationToken =
            responseBody.token;

        this.installationTokenExpiresAt =
            new Date(
                responseBody.expires_at
            ).getTime();

        return this.installationToken;
    }
}