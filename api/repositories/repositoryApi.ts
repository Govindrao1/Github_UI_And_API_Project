import { APIResponse } from '@playwright/test';
import { GitHubApiClient } from '../client/githubApiClient';

export class RepositoryApi {
    private readonly githubApiClient: GitHubApiClient;

    constructor(githubApiClient: GitHubApiClient) {
        this.githubApiClient = githubApiClient;
    }

    /**
     * Get repository details.
     *
     * GitHub API:
     * GET /repos/{owner}/{repo}
     */
    async getRepository(owner: string, repository: string): Promise<APIResponse> {
        return await this.githubApiClient.get(`/repos/${owner}/${repository}`);
    }
}