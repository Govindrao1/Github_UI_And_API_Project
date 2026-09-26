import { test, expect } from '../../../fixtures/basefixture';
import { RepositoryApi } from '../../../api/repositories/repositoryApi';

import githubErrorSchema from '../../../schemas/github-error.schema.json';
import { validateSchema } from '../../../utils/schemaValidator';

test(
    'Get non-existent GitHub repository',
    async ({
        githubApiClient,
    }) => {
        const repositoryApi =
            new RepositoryApi(githubApiClient);

        const owner = 'Govindrao1';

        const repository =
            `playwright-non-existent-${Date.now()}`;

        const response =
            await repositoryApi.getRepository(
                owner,
                repository
            );

        expect(
            response.status(),
            `Expected GitHub API to return 404 for non-existent repository, but received ${response.status()}`
        ).toBe(404);

        const responseBody =
            await response.json();

        console.log(
            '\n========== GitHub API Error Response =========='
        );

        console.log(
            'Status Code       :',
            response.status()
        );

        console.log(
            'Repository        :',
            `${owner}/${repository}`
        );

        console.log(
            'Message           :',
            responseBody.message
        );

        console.log(
            'Documentation URL :',
            responseBody.documentation_url
        );

        console.log(
            'Body Status       :',
            responseBody.status
        );

        console.log(
            '===============================================\n'
        );

        await test.step(
            'Validate GitHub error response schema',
            async () => {
                validateSchema(
                    githubErrorSchema,
                    responseBody,
                    'GitHub API Error Response'
                );
            }
        );

        await test.step(
            'Validate GitHub error details',
            async () => {
                expect(
                    responseBody.message
                ).toBe('Not Found');

                expect(
                    responseBody.status === undefined
                        ? undefined
                        : String(responseBody.status)
                ).toBe('404');
            }
        );

        console.log(
            '✅ Non-existent repository returned the expected 404 error response.'
        );
    }
);