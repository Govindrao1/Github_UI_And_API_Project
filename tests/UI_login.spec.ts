import { test } from '../fixtures/basefixture';

test('Login to GitHub', async ({ loginPage }) => {

    await loginPage.navigateToLoginPage();

    await loginPage.login(
        process.env.GITHUB_USERNAME!,
        process.env.GITHUB_PASSWORD!
    );

    await loginPage.verifyLoginResult();

});