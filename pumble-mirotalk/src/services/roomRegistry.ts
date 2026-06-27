import path from 'path';
import fs from 'fs';

export type RoomPostRecord = {
    roomId: string;
    workspaceId: string;
    channelId: string;
    messageId: string;
    createdByUserId: string;
    ended: boolean;
    createdAt: string;
};

type RoomRegistryData = Record<string, RoomPostRecord>;

export class JsonFileRoomRegistry {
    public constructor(private path: string) {}

    private data: RoomRegistryData = {};

    public async initialize(): Promise<void> {
        try {
            this.data = JSON.parse((await fs.promises.readFile(this.path, 'utf8')).toString());
        } catch {
            this.data = {};
        }
    }

    public async saveRoom(record: Omit<RoomPostRecord, 'ended' | 'createdAt'>): Promise<void> {
        this.data[record.roomId] = {
            ...record,
            ended: false,
            createdAt: new Date().toISOString(),
        };
        await this.persist();
    }

    public getRoom(roomId: string): RoomPostRecord | undefined {
        return this.data[roomId];
    }

    public isRoomEnded(roomId: string): boolean {
        return this.data[roomId]?.ended === true;
    }

    public async markEnded(roomId: string): Promise<RoomPostRecord | undefined> {
        const record = this.data[roomId];
        if (!record || record.ended) {
            return record;
        }
        record.ended = true;
        await this.persist();
        return record;
    }

    private async persist(): Promise<void> {
        await fs.promises.mkdir(path.dirname(this.path), { recursive: true });
        await fs.promises.writeFile(this.path, JSON.stringify(this.data, null, 2));
    }
}
