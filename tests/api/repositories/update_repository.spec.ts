import { test, expect } from '../../../fixtures/basefixture';
import { RepositoryApi } from '../../../api/repositories/repositoryApi';

import repositorySchema from '../../../schemas/repository.schema.json';
import updateRepositoryRequestSchema from '../../../schemas/update-repository-request.schema.json';

import { validateSchema } from '../../../utils/schemaValidator';
import { GitHubRepository } from '../../../models/repository';

test('Update GitHub repository description', async ({
    githubApiClient,
}) => {
    const repositoryApi =
        new RepositoryApi(githubApiClient);

    const owner = 'Govindrao1';
    const repository =
        'Github_UI_And_API_Project';

    const getResponse =
        await repositoryApi.getRepository(
            owner,
            repository
        );

    expect(
        getResponse.status(),
        `GitHub API returned ${getResponse.status()}`
    ).toBe(200);

    const repositoryBeforeUpdate =
        await getResponse.json() as GitHubRepository;

    const originalDescription =
        repositoryBeforeUpdate.description;

    const updatedDescription =
        `Updated by Playwright API automation - ${Date.now()}`;

    const updatePayload = {
        description: updatedDescription,
    };

    let updateSucceeded = false;

    try {
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
                repository,
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

        updateSucceeded = true;

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

        console.log(
            'Updated Repository Details:'
        );

        console.log(
            'Repository Name:',
            updatedRepository.name
        );

        console.log(
            'Full Name:',
            updatedRepository.full_name
        );

        console.log(
            'Owner:',
            updatedRepository.owner.login
        );

        console.log(
            'Visibility:',
            updatedRepository.visibility
        );

        console.log(
            'Updated Description:',
            updatedRepository.description
        );

        expect(
            updatedRepository.name
        ).toBe(repository);

        expect(
            updatedRepository.full_name
        ).toBe(
            `${owner}/${repository}`
        );

        expect(
            updatedRepository.owner.login
        ).toBe(owner);

        expect(
            updatedRepository.description
        ).toBe(updatedDescription);
    } finally {
        if (updateSucceeded) {
            const restoreResponse =
                await repositoryApi.updateRepository(
                    owner,
                    repository,
                    {
                        description:
                            originalDescription,
                    }
                );

            console.log(
                'Restore Status:',
                restoreResponse.status()
            );

            if (!restoreResponse.ok()) {
                console.log(
                    'Restore Response:',
                    await restoreResponse.text()
                );
            }

            expect(
                restoreResponse.status(),
                `Repository restore returned ${restoreResponse.status()}`
            ).toBe(200);

            console.log(
                '✅ Original repository description restored.'
            );
        }
    }
});