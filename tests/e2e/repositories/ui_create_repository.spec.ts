import { test, expect } from '../../../fixtures/basefixture';

import {
    RepositoryUIDetails,
} from '../../../pages/repositorypage';

import { RepositoryApi } from '../../../api/repositories/repositoryApi';

import repositorySchema from '../../../schemas/repository.schema.json';
import { validateSchema } from '../../../utils/schemaValidator';

test(
    'Create GitHub repository through UI and validate through API',
    async ({
        loginPage,
        newRepositoryPage,
        repositoryPage,
        githubApiClient,
    }) => {
        const repositoryName =
            `playwright-ui-create-${Date.now()}`;

        const repositoryDescription =
            `Repository created through Playwright UI automation - ${Date.now()}`;

        let owner: string;
        let uiDetails: RepositoryUIDetails;
        let apiRepositoryDetails: Record<string, any>;

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
                    repositoryDescription
                );

                console.log(
                    `✅ Repository creation submitted through UI: ${owner}/${repositoryName}`
                );
            }
        );

        await test.step(
            'Wait for repository to become available through API',
            async () => {
                await expect
                    .poll(
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
                    )
                    .toBe(200);

                const response =
                    await repositoryApi.getRepository(
                        owner,
                        repositoryName
                    );

                expect(response.status()).toBe(200);

                apiRepositoryDetails =
                    await response.json();

                console.log(
                    '\n========== GitHub API Repository Details =========='
                );

                console.log(
                    'Status Code      :',
                    response.status()
                );
                console.log(
                    'Repository Name  :',
                    apiRepositoryDetails.name
                );
                console.log(
                    'Full Name        :',
                    apiRepositoryDetails.full_name
                );
                console.log(
                    'Owner            :',
                    apiRepositoryDetails.owner.login
                );
                console.log(
                    'Description      :',
                    apiRepositoryDetails.description
                );
                console.log(
                    'Visibility       :',
                    apiRepositoryDetails.visibility
                );
                console.log(
                    'Private          :',
                    apiRepositoryDetails.private
                );
                console.log(
                    'HTML URL         :',
                    apiRepositoryDetails.html_url
                );
                console.log(
                    'Default Branch   :',
                    apiRepositoryDetails.default_branch
                );
                console.log(
                    'Repository ID    :',
                    apiRepositoryDetails.id
                );
                console.log(
                    'Created At       :',
                    apiRepositoryDetails.created_at
                );
                console.log(
                    'Updated At       :',
                    apiRepositoryDetails.updated_at
                );

                console.log(
                    '====================================================\n'
                );

                await test.step(
                    'Validate repository response schema',
                    async () => {
                        validateSchema(
                            repositorySchema,
                            apiRepositoryDetails,
                            'GitHub Repository Response'
                        );
                    }
                );

                expect(
                    apiRepositoryDetails.name
                ).toBe(repositoryName);

                expect(
                    apiRepositoryDetails.full_name
                ).toBe(
                    `${owner}/${repositoryName}`
                );

                expect(
                    apiRepositoryDetails.owner.login
                ).toBe(owner);

                expect(
                    apiRepositoryDetails.description
                ).toBe(repositoryDescription);

                expect(
                    apiRepositoryDetails.private
                ).toBe(true);

                console.log(
                    '✅ UI-created repository confirmed through API.'
                );
            }
        );

        await test.step(
            'Open created repository through UI',
            async () => {
                await repositoryPage.navigate(
                    owner,
                    repositoryName
                );

                console.log(
                    `✅ Repository page opened through UI: ${owner}/${repositoryName}`
                );
            }
        );

        await test.step(
            'Read actual repository details from UI',
            async () => {
                uiDetails =
                    await repositoryPage.getRepositoryUIDetails(
                        owner,
                        repositoryDescription
                    );

                console.log(
                    '\n========== UI Repository Details =========='
                );

                console.log(
                    'Repository Name :',
                    uiDetails.name
                );
                console.log(
                    'Owner           :',
                    uiDetails.owner
                );
                console.log(
                    'Description     :',
                    uiDetails.description
                );
                console.log(
                    'Visibility      :',
                    uiDetails.visibility
                );

                console.log(
                    '============================================\n'
                );
            }
        );

        await test.step(
            'Compare UI details with API response',
            async () => {
                const apiVisibility =
                    apiRepositoryDetails.private
                        ? 'private'
                        : 'public';

                console.log(
                    '\n========== UI vs API Validation =========='
                );

                console.log(
                    'Repository Name :',
                    `UI = ${uiDetails.name}`,
                    '|',
                    `API = ${apiRepositoryDetails.name}`
                );

                console.log(
                    'Owner           :',
                    `UI = ${uiDetails.owner}`,
                    '|',
                    `API = ${apiRepositoryDetails.owner.login}`
                );

                console.log(
                    'Description     :',
                    `UI = ${uiDetails.description}`,
                    '|',
                    `API = ${apiRepositoryDetails.description}`
                );

                console.log(
                    'Visibility      :',
                    `UI = ${uiDetails.visibility}`,
                    '|',
                    `API = ${apiVisibility}`
                );

                console.log(
                    '===========================================\n'
                );

                expect(
                    uiDetails.name
                ).toBe(
                    apiRepositoryDetails.name
                );

                expect(
                    uiDetails.owner
                ).toBe(
                    apiRepositoryDetails.owner.login
                );

                expect(
                    uiDetails.description
                ).toBe(
                    apiRepositoryDetails.description
                );

                expect(
                    uiDetails.visibility
                ).toBe(
                    apiVisibility
                );

                expect(
                    apiRepositoryDetails.full_name
                ).toBe(
                    `${uiDetails.owner}/${uiDetails.name}`
                );

                console.log(
                    '✅ UI and API repository details match successfully.'
                );
            }
        );
    }
);