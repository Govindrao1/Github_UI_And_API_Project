import { test, expect } from '../../../fixtures/basefixture';

import { RepositoryApi } from '../../../api/repositories/repositoryApi';

test(
    'Create and delete GitHub repository through UI and API',
    async ({
        loginPage,
        newRepositoryPage,
        githubApiClient,
    }) => {
        const repositoryName =
            `playwright-api-delete-${Date.now()}`;

        const repositoryDescription =
            `Disposable repository for DELETE API automation - ${Date.now()}`;

        let owner: string;

        const repositoryApi =
            new RepositoryApi(githubApiClient);

        await test.step(
            'Login through GitHub UI',
            async () => {
                await loginPage.navigateToLoginPage();

                await loginPage.login(
                    process.env.GITHUB_USERNAME!,
                    process.env.GITHUB_PASSWORD!
                );

                await loginPage.verifyLoginResult();
            }
        );

        await test.step(
            'Create disposable repository through UI',
            async () => {
                await newRepositoryPage.navigate();

                owner =
                    await newRepositoryPage.getRepositoryOwner();

                console.log(
                    `Repository Owner: ${owner}`
                );

                await newRepositoryPage.create(
                    repositoryName,
                    repositoryDescription
                );

                console.log(
                    `✅ Disposable repository creation submitted: ${owner}/${repositoryName}`
                );
            }
        );

        await test.step(
            'Verify repository is available through API',
            async () => {
                await expect.poll(
                    async () => {
                        const response =
                            await repositoryApi.getRepository(
                                owner,
                                repositoryName
                            );

                        return response.status();
                    },
                    {
                        timeout: 30_000,
                        intervals: [
                            1000,
                            2000,
                            3000,
                            5000,
                        ],
                        message:
                            `Repository ${owner}/${repositoryName} was not available through API.`,
                    }
                ).toBe(200);

                const getResponse =
                    await repositoryApi.getRepository(
                        owner,
                        repositoryName
                    );

                expect(
                    getResponse.status(),
                    `GitHub API returned ${getResponse.status()}`
                ).toBe(200);

                const repositoryDetails =
                    await getResponse.json();

                expect(
                    repositoryDetails.name
                ).toBe(repositoryName);

                expect(
                    repositoryDetails.full_name
                ).toBe(
                    `${owner}/${repositoryName}`
                );

                console.log(
                    '✅ Disposable repository exists and is ready for deletion.'
                );
            }
        );

        await test.step(
            'Delete repository through API',
            async () => {
                const deleteResponse =
                    await repositoryApi.deleteRepository(
                        owner,
                        repositoryName
                    );

                console.log(
                    'Delete Status:',
                    deleteResponse.status()
                );

                if (!deleteResponse.ok()) {
                    console.log(
                        'Delete Response:',
                        await deleteResponse.text()
                    );
                }

                expect(
                    deleteResponse.status(),
                    `GitHub API returned ${deleteResponse.status()}`
                ).toBe(204);

                console.log(
                    `✅ Repository deleted successfully: ${owner}/${repositoryName}`
                );
            }
        );

        await test.step(
            'Verify repository no longer exists',
            async () => {
                const getAfterDeleteResponse =
                    await repositoryApi.getRepository(
                        owner,
                        repositoryName
                    );

                console.log(
                    'GET After Delete Status:',
                    getAfterDeleteResponse.status()
                );

                expect(
                    getAfterDeleteResponse.status(),
                    `Expected repository ${owner}/${repositoryName} to return 404 after deletion`
                ).toBe(404);

                console.log(
                    '✅ Repository deletion verified: repository no longer exists.'
                );
            }
        );
    }
);