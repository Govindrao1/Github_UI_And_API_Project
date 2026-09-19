import fs from 'fs';
import jwt from 'jsonwebtoken';
import { APIRequestContext } from '@playwright/test';

export class GitHubAppAuth {
    private readonly request: APIRequestContext;
    private readonly clientId: string;
    private readonly installationId: string;
    private readonly privateKeyPath: string;

    constructor(request: APIRequestContext) {
        this.request = request;

        this.clientId = process.env.GITHUB_APP_CLIENT_ID ?? '';
        this.installationId = process.env.GITHUB_INSTALLATION_ID ?? '';
        this.privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH ?? '';

        if (!this.clientId) {
            throw new Error('Missing GITHUB_APP_CLIENT_ID');
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

    async generateInstallationToken(): Promise<string> {
        const appJwt = this.generateJwt();

        const response = await this.request.post(`https://api.github.com/app/installations/${this.installationId}/access_tokens`,
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${appJwt}`,
                    'X-GitHub-Api-Version': '2026-03-10',
                },
            }
        );

        if (!response.ok()) {
            const responseBody = await response.text();

            throw new Error(
                `Failed to generate GitHub installation token. ` +
                `Status: ${response.status()}, ` +
                `Response: ${responseBody}`
            );
        }

        const responseBody = await response.json();

        return responseBody.token;
    }
}