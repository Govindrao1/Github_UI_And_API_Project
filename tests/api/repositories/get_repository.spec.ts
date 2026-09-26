import { test, expect } from '../../../fixtures/basefixture';
import { RepositoryApi } from '../../../api/repositories/repositoryApi';

import repositorySchema from '../../../schemas/repository.schema.json';
import { validateSchema } from '../../../utils/schemaValidator';

test('Get GitHub repository details', async ({
    githubApiClient,
}) => {
    const repositoryApi =
        new RepositoryApi(githubApiClient);

    const response =
        await repositoryApi.getRepository(
            'Govindrao1',
            'Github_UI_And_API_Project'
        );

    expect(
        response.status(),
        `GitHub API returned ${response.status()}`
    ).toBe(200);

    const responseBody =
        await response.json();

    await test.step(
        'Validate repository response schema',
        async () => {
            validateSchema(
                repositorySchema,
                responseBody,
                'GitHub Repository Response'
            );
        }
    );

    await test.step(
        'Validate repository business fields',
        async () => {
            expect(
                responseBody.full_name
            ).toBe(
                'Govindrao1/Github_UI_And_API_Project'
            );

            expect(
                responseBody.name
            ).toBe(
                'Github_UI_And_API_Project'
            );

            expect(
                responseBody.owner.login
            ).toBe(
                'Govindrao1'
            );

            expect(
                responseBody.visibility
            ).toBe('public');
        }
    );

    console.log(
        '✅ Repository details retrieved and schema validated successfully.'
    );
});