import { test, expect } from '../../fixtures/basefixture';

test('GitHub API health check', async ({ githubApiClient }) => {
    const response = await githubApiClient.get(
        '/repos/Govindrao1/Github_UI_And_API_Project'
    );

    expect(
        response.status(),
        `GitHub API returned ${response.status()}`
    ).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.full_name).toBe(
        'Govindrao1/Github_UI_And_API_Project'
    );

    console.log('✅ GitHub API authentication is working.');
    console.log('Repository:', responseBody.full_name);
});