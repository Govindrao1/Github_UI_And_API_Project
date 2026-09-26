import { test as base, expect } from '@playwright/test';

import { LoginPage } from '../pages/loginpage';
import { NewRepositoryPage } from '../pages/newrepositorypage';
import { RepositoryPage } from '../pages/repositorypage';

import { GitHubApiClient } from '../api/client/githubApiClient';

type Fixtures = {
    loginPage: LoginPage;
    newRepositoryPage: NewRepositoryPage;
    repositoryPage: RepositoryPage;
    githubApiClient: GitHubApiClient;
};

export const test = base.extend<Fixtures>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },

    newRepositoryPage: async ({ page }, use) => {
        await use(new NewRepositoryPage(page));
    },

    repositoryPage: async ({ page }, use) => {
        await use(new RepositoryPage(page));
    },

    githubApiClient: async ({ request }, use) => {
        await use(new GitHubApiClient(request));
    },
});

export { expect };