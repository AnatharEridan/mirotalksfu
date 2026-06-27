import { randomUUID } from 'crypto';
import { getMiroTalkUrl, JOIN_AUDIO, JOIN_VIDEO, NOT_CONFIGURED_MESSAGE } from '../config';

export type JoinUserProfile = {
    name: string;
    avatarUrl?: string;
};

export function generateRoomId(customName?: string): string {
    const trimmed = customName?.trim();
    if (trimmed && isValidRoomName(trimmed)) {
        return trimmed.replace(/\s+/g, '-');
    }
    return randomUUID();
}

export function isValidRoomName(input: string): boolean {
    if (!input) {
        return false;
    }

    const room = input.trim();
    if (!room || ['false', 'undefined', 'favicon.ico'].includes(room.toLowerCase())) {
        return false;
    }

    if (room.includes('..') || room.includes('/') || room.includes('\\')) {
        return false;
    }

    return !/[<>"']/.test(room);
}

export function buildJoinUrl(roomId: string, user: JoinUserProfile): string {
    const baseUrl = getMiroTalkUrl();
    if (!baseUrl) {
        throw new Error(NOT_CONFIGURED_MESSAGE);
    }

    const url = new URL('/join', baseUrl);
    url.searchParams.set('room', roomId);
    url.searchParams.set('roomPassword', '0');
    url.searchParams.set('name', user.name);
    url.searchParams.set('avatar', user.avatarUrl || '0');
    url.searchParams.set('audio', JOIN_AUDIO ? 'true' : 'false');
    url.searchParams.set('video', JOIN_VIDEO ? 'true' : 'false');
    url.searchParams.set('screen', 'false');
    url.searchParams.set('chat', 'false');
    url.searchParams.set('hide', 'false');
    url.searchParams.set('notify', 'false');
    url.searchParams.set('duration', 'unlimited');
    url.searchParams.set('source', 'pumble');
    return url.toString();
}
