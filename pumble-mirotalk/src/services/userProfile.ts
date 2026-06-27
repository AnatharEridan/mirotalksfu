import { ApiClient, V1 } from 'pumble-sdk';
import { JoinUserProfile } from './mirotalk';

const PUMBLE_FILES_ORIGIN = 'https://files.pumble.com';

export function resolveAvatarUrl(avatar?: V1.Avatar): string | undefined {
    const raw = avatar?.scaledPath || avatar?.fullPath;
    if (!raw || typeof raw !== 'string') {
        return undefined;
    }

    const trimmed = raw.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }

    if (trimmed.startsWith('/')) {
        return `${PUMBLE_FILES_ORIGIN}${trimmed}`;
    }

    return `${PUMBLE_FILES_ORIGIN}/${trimmed}`;
}

export function profileFromWorkspaceUser(user: V1.WorkspaceUser): JoinUserProfile {
    const name = user.name?.trim() || user.email?.split('@')[0] || 'User';

    return {
        name,
        avatarUrl: resolveAvatarUrl(user.avatar),
    };
}

export async function fetchUserProfile(client: ApiClient, userId: string): Promise<JoinUserProfile> {
    const user = await client.v1.users.userInfo(userId);
    return profileFromWorkspaceUser(user);
}
