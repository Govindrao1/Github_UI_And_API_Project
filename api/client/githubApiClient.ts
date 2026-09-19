import { APIRequestContext } from '@playwright/test';
import { GitHubAppAuth } from '../auth/githubAppAuth';

export class GitHubApiClient {
    private readonly request: APIRequestContext;
    private readonly baseURL: string;
    private readonly auth: GitHubAppAuth;

    constructor(request: APIRequestContext) {
        this.request = request;

        this.baseURL = process.env.GITHUB_API_BASE_URL ?? '';

        if (!this.baseURL) {
            throw new Error(
                'Missing GITHUB_API_BASE_URL'
            );
        }

        this.auth = new GitHubAppAuth(request);
    }

    private async getHeaders(): Promise<Record<string, string>> {
        const token =
            await this.auth.generateInstallationToken();

        return {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2026-03-10',
        };
    }

    async get(endpoint: string) {
        return await this.request.get(
            `${this.baseURL}${endpoint}`,
            {
                headers: await this.getHeaders(),
            }
        );
    }

    async post(endpoint: string, data?: object) {
        return await this.request.post(
            `${this.baseURL}${endpoint}`,
            {
                headers: await this.getHeaders(),
                data,
            }
        );
    }

    async patch(endpoint: string, data?: object) {
        return await this.request.patch(
            `${this.baseURL}${endpoint}`,
            {
                headers: await this.getHeaders(),
                data,
            }
        );
    }

    async delete(endpoint: string) {
        return await this.request.delete(
            `${this.baseURL}${endpoint}`,
            {
                headers: await this.getHeaders(),
            }
        );
    }
}