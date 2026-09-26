import { expect, Locator, Page } from '@playwright/test';

export class NewRepositoryPage {
    private readonly page: Page;

    private readonly repositoryOwner: Locator;
    private readonly repositoryName: Locator;
    private readonly description: Locator;
    private readonly repositoryNameAvailable: Locator;

    private readonly visibilityButton: Locator;
    private readonly privateVisibilityOption: Locator;

    private readonly addReadmeButton: Locator;
    private readonly createRepositoryButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.repositoryOwner = page.getByRole('button', {
            name: /Owner \(Required\)$/,
        });

        this.repositoryName = page.getByRole('textbox', {
            name: 'Repository name *',
        });

        this.description = page.getByRole('textbox', {
            name: 'Description',
        });

        this.repositoryNameAvailable = page.getByText(
            /is available\.$/,
            {
                exact: false,
            }
        );

        this.visibilityButton = page.getByRole('button', {
            name: /^(Public|Private)$/,
        });

        this.privateVisibilityOption = page.getByText(
            'Private',
            {
                exact: true,
            }
        );

        this.addReadmeButton = page.getByRole('button', {
            name: 'Add README',
            exact: true,
        });

        this.createRepositoryButton = page.getByRole('button', {
            name: 'Create repository',
            exact: true,
        });
    }

    async navigate(): Promise<void> {
        await this.page.goto('/new');
    }

    async getRepositoryOwner(): Promise<string> {
        await expect(
            this.repositoryOwner
        ).toBeVisible();

        return (
            await this.repositoryOwner.innerText()
        ).trim();
    }

    async enterRepositoryName(
        repositoryName: string
    ): Promise<void> {
        await this.repositoryName.fill(repositoryName);

        await expect(
            this.repositoryNameAvailable
        ).toBeVisible();
    }

    async enterDescription(
        description: string
    ): Promise<void> {
        await this.description.fill(description);
    }

    async selectPrivateRepository(): Promise<void> {
        await this.visibilityButton.click();

        await this.privateVisibilityOption.click();

        await expect(
            this.visibilityButton
        ).toHaveText('Private');
    }

    async selectAddReadme(): Promise<void> {
        const pressed =
            await this.addReadmeButton.getAttribute(
                'aria-pressed'
            );

        if (pressed !== 'true') {
            await this.addReadmeButton.click();
        }

        await expect(
            this.addReadmeButton
        ).toHaveAttribute(
            'aria-pressed',
            'true'
        );
    }

    async createRepository(): Promise<void> {
        await expect(
            this.createRepositoryButton
        ).toBeEnabled();

        await this.createRepositoryButton.click();
    }

    async create(
        repositoryName: string,
        description: string
    ): Promise<void> {
        await this.enterRepositoryName(
            repositoryName
        );

        await this.enterDescription(
            description
        );

        await this.selectPrivateRepository();

        await this.selectAddReadme();

        await this.createRepository();
    }
}