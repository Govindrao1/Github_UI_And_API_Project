export interface RepositoryOwner {
    login: string;
    id: number;
}

export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    owner: RepositoryOwner;
    private: boolean;
    html_url: string;
    description: string | null;
    fork: boolean;
    url: string;
    visibility: 'public' | 'private' | 'internal';
    default_branch: string;
    created_at: string;
    updated_at: string;
}