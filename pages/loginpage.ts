import { expect, Locator, Page } from '@playwright/test';

export class LoginPage {
    private readonly page: Page;

    private readonly username: Locator;
    private readonly password: Locator;
    private readonly loginButton: Locator;
    private readonly dashboard: Locator;
    private readonly loginErrorAlert: Locator;

    constructor(page: Page) {
        this.page = page;

        this.username = page.locator('#login_field');
        this.password = page.locator('#password');

        this.loginButton = page.getByRole('button', {
            name: 'Sign in',
            exact: true
        });

        this.dashboard = page.getByRole('link', {
            name: 'Dashboard',
            exact: true
        });

        this.loginErrorAlert = page.getByRole('alert');
    }

    async navigateToLoginPage(): Promise<void> {
        await this.page.goto('/login');
    }

    async enterUsername(username: string): Promise<void> {
        await this.username.fill(username);
    }

    async enterPassword(password: string): Promise<void> {
        await this.password.fill(password);
    }

    async clickLogin(): Promise<void> {
        await this.loginButton.click();
    }

    async verifyLoginResult(): Promise<void> {
        if (await this.loginErrorAlert.isVisible()) {
            console.log(
                '❌ GitHub login failed: Incorrect username or password.'
            );

            throw new Error(
                'GitHub login failed: Incorrect username or password.'
            );
        }

        await expect(this.dashboard).toBeVisible();

        console.log(
            '✅ GitHub login successful: Dashboard is displayed.'
        );
    }

    async login(
        username: string,
        password: string
    ): Promise<void> {
        await this.enterUsername(username);
        await this.enterPassword(password);
        await this.clickLogin();
    }
}