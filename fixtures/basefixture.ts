import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/loginpage';
import { GitHubApiClient } from '../api/client/githubApiClient';

type Fixtures = {
    loginPage: LoginPage;
    githubApiClient: GitHubApiClient;
};

export const test = base.extend<Fixtures>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },

    githubApiClient: async ({ request }, use) => {
        await use(new GitHubApiClient(request));
    },
});

export { expect };