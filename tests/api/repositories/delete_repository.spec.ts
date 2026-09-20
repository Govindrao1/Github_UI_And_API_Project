import { test, expect } from '../../../fixtures/basefixture';
import { RepositoryApi } from '../../../api/repositories/repositoryApi';

test('Delete GitHub test repository', async ({
    githubApiClient,
}) => {
    const repositoryApi =
        new RepositoryApi(githubApiClient);

    const owner = 'Govindrao1';
    const repository = 'Github_Delete_Test';

    // Step 1: Verify the dummy repository exists.
    const getResponse =
        await repositoryApi.getRepository(
            owner,
            repository
        );

    expect(
        getResponse.status(),
        `GitHub API returned ${getResponse.status()}`
    ).toBe(200);

    const repositoryBeforeDelete =
        await getResponse.json();

    expect(repositoryBeforeDelete.name).toBe(
        repository
    );

    expect(
        repositoryBeforeDelete.full_name
    ).toBe(`${owner}/${repository}`);

    console.log(
        '✅ Dummy repository exists and is ready for deletion.'
    );

    // Step 2: Delete the repository.
    const deleteResponse =
        await repositoryApi.deleteRepository(
            owner,
            repository
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
        '✅ Dummy repository deleted successfully.'
    );

    // Step 3: Verify the repository no longer exists.
    const getAfterDeleteResponse =
        await repositoryApi.getRepository(
            owner,
            repository
        );

    console.log(
        'GET After Delete Status:',
        getAfterDeleteResponse.status()
    );

    expect(
        getAfterDeleteResponse.status()
    ).toBe(404);

    console.log(
        '✅ Repository deletion verified: repository no longer exists.'
    );
});