import { expect, Locator, Page } from '@playwright/test';

export interface RepositoryUIDetails {
    name: string;
    owner: string;
    description: string;
    visibility: 'private' | 'public';
}

export class RepositoryPage {
    private readonly page: Page;

    private readonly repositoryName: Locator;
    private readonly privateBadge: Locator;

    constructor(page: Page) {
        this.page = page;

        this.repositoryName = page.getByRole('heading', {
            level: 1,
        });

        this.privateBadge = page.getByText('Private', {
            exact: true,
        }).first();
    }

    async navigate(
        owner: string,
        repository: string
    ): Promise<void> {
        const expectedUrl =
            `https://github.com/${owner}/${repository}`;

        try {
            await this.page.goto(
                `/${owner}/${repository}`
            );
        } catch (error) {
            const currentUrl = this.page.url();

            if (
                error instanceof Error &&
                error.message.includes('net::ERR_ABORTED') &&
                currentUrl.startsWith(expectedUrl)
            ) {
                // GitHub reached the expected repository page,
                // but the original navigation was interrupted.
                return;
            }

            throw error;
        }

        await expect(this.page).toHaveURL(
            new RegExp(
                `github\\.com/${owner}/${repository}(?:/)?(?:\\?.*)?$`
            )
        );
    }

    async getRepositoryUIDetails(
        owner: string,
        expectedDescription: string
    ): Promise<RepositoryUIDetails> {
        // Repository name
        await expect(
            this.repositoryName
        ).toBeVisible();

        const name =
            (await this.repositoryName.innerText()).trim();

        // Repository owner
        const ownerLink =
            this.page.getByRole('link', {
                name: owner,
                exact: true,
            }).first();

        await expect(
            ownerLink
        ).toBeVisible();

        const actualOwner =
            (await ownerLink.innerText()).trim();

        // Repository description
        const repositoryArticle =
            this.page.locator('article');

        const descriptionLocator =
            repositoryArticle.getByText(
                expectedDescription,
                {
                    exact: true,
                }
            ).first();

        await expect(
            descriptionLocator
        ).toBeVisible();

        const description =
            (await descriptionLocator.innerText()).trim();

        // Repository visibility
        await expect(
            this.privateBadge
        ).toBeVisible();

        return {
            name,
            owner: actualOwner,
            description,
            visibility: 'private',
        };
    }
}