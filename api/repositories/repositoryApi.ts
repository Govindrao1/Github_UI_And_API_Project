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
    async getRepository(
        owner: string,
        repository: string
    ): Promise<APIResponse> {
        return await this.githubApiClient.get(
            `/repos/${owner}/${repository}`
        );
    }

    /**
     * Update repository details.
     *
     * GitHub API:
     * PATCH /repos/{owner}/{repo}
     */
    async updateRepository(
        owner: string,
        repository: string,
        data: object
    ): Promise<APIResponse> {
        return await this.githubApiClient.patch(
            `/repos/${owner}/${repository}`,
            data
        );
    }

    /**
     * Delete repository.
     *
     * GitHub API:
     * DELETE /repos/{owner}/{repo}
     */
    async deleteRepository(
        owner: string,
        repository: string
    ): Promise<APIResponse> {
        return await this.githubApiClient.delete(
            `/repos/${owner}/${repository}`
        );
    }
}