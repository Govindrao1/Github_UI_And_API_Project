import { test, expect } from '../../../fixtures/basefixture';
import { RepositoryApi } from '../../../api/repositories/repositoryApi';

test('Update GitHub repository description', async ({
    githubApiClient,
}) => {
    const repositoryApi = new RepositoryApi(githubApiClient);

    const owner = 'Govindrao1';
    const repository = 'Github_UI_And_API_Project';

    const getResponse = await repositoryApi.getRepository(
        owner,
        repository
    );

    expect(
        getResponse.status(),
        `GitHub API returned ${getResponse.status()}`
    ).toBe(200);

    const repositoryBeforeUpdate = await getResponse.json();

    const originalDescription =
        repositoryBeforeUpdate.description;

    const updatedDescription =
        `Updated by Playwright API automation - ${Date.now()}`;

    let updateSucceeded = false;

    try {
        const updateResponse =
            await repositoryApi.updateRepository(
                owner,
                repository,
                {
                    description: updatedDescription,
                }
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
            await updateResponse.json();

        console.log('Updated Repository Details:');
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

        expect(updatedRepository.name).toBe(
            repository
        );

        expect(updatedRepository.full_name).toBe(
            `${owner}/${repository}`
        );

        expect(updatedRepository.owner.login).toBe(
            owner
        );

        expect(updatedRepository.description).toBe(
            updatedDescription
        );
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