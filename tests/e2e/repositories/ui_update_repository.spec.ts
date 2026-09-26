import { test, expect } from '../../../fixtures/basefixture';

import { RepositoryApi } from '../../../api/repositories/repositoryApi';

import repositorySchema from '../../../schemas/repository.schema.json';
import updateRepositoryRequestSchema from '../../../schemas/update-repository-request.schema.json';

import { validateSchema } from '../../../utils/schemaValidator';
import { GitHubRepository } from '../../../models/repository';

test(
    'Create repository through UI, update through API, and verify through UI',
    async ({
        page,
        loginPage,
        newRepositoryPage,
        repositoryPage,
        githubApiClient,
    }) => {
        const repositoryName =
            `playwright-ui-api-update-${Date.now()}`;

        const originalDescription =
            `Repository created through UI for API update validation - ${Date.now()}`;

        const updatedDescription =
            `Description updated through Playwright API automation - ${Date.now()}`;

        let owner = '';
        let repositoryCreationSubmitted = false;

        const repositoryApi =
            new RepositoryApi(githubApiClient);

        try {
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
                'Create repository through UI',
                async () => {
                    await newRepositoryPage.navigate();

                    owner =
                        await newRepositoryPage.getRepositoryOwner();

                    console.log(
                        `Repository Owner: ${owner}`
                    );

                    await newRepositoryPage.create(
                        repositoryName,
                        originalDescription
                    );

                    repositoryCreationSubmitted = true;

                    console.log(
                        `✅ Repository creation submitted through UI: ${owner}/${repositoryName}`
                    );
                }
            );

            await test.step(
                'Verify repository creation through API',
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

                    const response =
                        await repositoryApi.getRepository(
                            owner,
                            repositoryName
                        );

                    expect(
                        response.status(),
                        `GitHub API returned ${response.status()}`
                    ).toBe(200);

                    const repositoryDetails =
                        await response.json() as GitHubRepository;

                    await test.step(
                        'Validate created repository response schema',
                        async () => {
                            validateSchema(
                                repositorySchema,
                                repositoryDetails,
                                'GitHub Repository Response'
                            );
                        }
                    );

                    expect(
                        repositoryDetails.name
                    ).toBe(repositoryName);

                    expect(
                        repositoryDetails.full_name
                    ).toBe(
                        `${owner}/${repositoryName}`
                    );

                    expect(
                        repositoryDetails.owner.login
                    ).toBe(owner);

                    expect(
                        repositoryDetails.description
                    ).toBe(originalDescription);

                    expect(
                        repositoryDetails.private
                    ).toBe(true);

                    console.log(
                        '✅ Repository creation confirmed through API.'
                    );
                }
            );

            await test.step(
                'Update repository description through API',
                async () => {
                    const updatePayload = {
                        description: updatedDescription,
                    };

                    await test.step(
                        'Validate update request payload schema',
                        async () => {
                            validateSchema(
                                updateRepositoryRequestSchema,
                                updatePayload,
                                'GitHub Repository Update Request'
                            );
                        }
                    );

                    const updateResponse =
                        await repositoryApi.updateRepository(
                            owner,
                            repositoryName,
                            updatePayload
                        );

                    console.log(
                        'Update Status:',
                        updateResponse.status()
                    );

                    if (!updateResponse.ok()) {
                        console.log(
                            'Update Response:',
                            await updateResponse.text()
                        );
                    }

                    expect(
                        updateResponse.status(),
                        `GitHub API returned ${updateResponse.status()}`
                    ).toBe(200);

                    const updatedRepository =
                        await updateResponse.json() as GitHubRepository;

                    await test.step(
                        'Validate updated repository response schema',
                        async () => {
                            validateSchema(
                                repositorySchema,
                                updatedRepository,
                                'GitHub Repository Update Response'
                            );
                        }
                    );

                    expect(
                        updatedRepository.name
                    ).toBe(repositoryName);

                    expect(
                        updatedRepository.full_name
                    ).toBe(
                        `${owner}/${repositoryName}`
                    );

                    expect(
                        updatedRepository.owner.login
                    ).toBe(owner);

                    expect(
                        updatedRepository.description
                    ).toBe(updatedDescription);

                    console.log(
                        '✅ Repository description updated successfully through API.'
                    );
                }
            );

            await test.step(
                'Verify updated repository through API',
                async () => {
                    await expect.poll(
                        async () => {
                            const response =
                                await repositoryApi.getRepository(
                                    owner,
                                    repositoryName
                                );

                            if (response.status() !== 200) {
                                return null;
                            }

                            const responseBody =
                                await response.json();

                            return responseBody.description;
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
                                `Repository ${owner}/${repositoryName} did not contain the updated description through API.`,
                        }
                    ).toBe(updatedDescription);

                    console.log(
                        '✅ Updated repository description confirmed through API GET.'
                    );
                }
            );

            await test.step(
                'Open updated repository through UI',
                async () => {
                    await repositoryPage.navigate(
                        owner,
                        repositoryName
                    );

                    console.log(
                        `✅ Updated repository page opened through UI: ${owner}/${repositoryName}`
                    );
                }
            );

            await test.step(
                'Verify updated description through UI',
                async () => {
                    const updatedDescriptionLocator =
                        page
                            .locator('p:visible')
                            .filter({
                                hasText: updatedDescription,
                            })
                            .first();

                    await expect(
                        updatedDescriptionLocator
                    ).toBeVisible();

                    const actualUpdatedDescription =
                        (
                            await updatedDescriptionLocator.innerText()
                        ).trim();

                    expect(
                        actualUpdatedDescription
                    ).toBe(updatedDescription);

                    console.log(
                        '✅ API-updated repository description verified successfully through UI.'
                    );
                }
            );
        } finally {
            if (repositoryCreationSubmitted) {
                await test.step(
                    'Clean up disposable repository',
                    async () => {
                        const deleteResponse =
                            await repositoryApi.deleteRepository(
                                owner,
                                repositoryName
                            );

                        console.log(
                            'Cleanup Delete Status:',
                            deleteResponse.status()
                        );

                        if (
                            deleteResponse.status() ===
                            204
                        ) {
                            console.log(
                                `✅ Disposable repository cleaned up: ${owner}/${repositoryName}`
                            );

                            return;
                        }

                        if (
                            deleteResponse.status() ===
                            404
                        ) {
                            console.log(
                                `ℹ️ Disposable repository was already unavailable: ${owner}/${repositoryName}`
                            );

                            return;
                        }

                        console.log(
                            'Cleanup Delete Response:',
                            await deleteResponse.text()
                        );

                        throw new Error(
                            `Failed to clean up disposable repository ${owner}/${repositoryName}. ` +
                            `GitHub API returned ${deleteResponse.status()}.`
                        );
                    }
                );
            }
        }
    }
);