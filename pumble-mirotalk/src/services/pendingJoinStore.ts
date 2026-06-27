type PendingJoin = {
    joinUrl: string;
    userId: string;
    expiresAt: number;
};

const TTL_MS = 30 * 1000;
const pendingByRoom = new Map<string, PendingJoin>();

export function setPendingJoin(roomId: string, userId: string, joinUrl: string): void {
    pendingByRoom.set(roomId, {
        joinUrl,
        userId,
        expiresAt: Date.now() + TTL_MS,
    });
}

export function takePendingJoin(roomId: string): string | undefined {
    const entry = pendingByRoom.get(roomId);
    if (!entry) {
        return undefined;
    }

    pendingByRoom.delete(roomId);

    if (entry.expiresAt < Date.now()) {
        return undefined;
    }

    return entry.joinUrl;
}
