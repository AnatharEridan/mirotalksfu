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
    private data: RoomRegistryData = {};
    private readonly ready: Promise<void>;

    public constructor(private readonly filePath: string) {
        this.ready = this.loadFromDisk();
    }

    private async loadFromDisk(): Promise<void> {
        try {
            this.data = JSON.parse((await fs.promises.readFile(this.filePath, 'utf8')).toString());
        } catch {
            this.data = {};
        }
    }

    public async initialize(): Promise<void> {
        await this.ready;
    }

    private async ensureReady(): Promise<void> {
        await this.ready;
    }

    public async saveRoom(record: Omit<RoomPostRecord, 'ended' | 'createdAt'>): Promise<void> {
        await this.ensureReady();
        this.data[record.roomId] = {
            ...record,
            ended: false,
            createdAt: new Date().toISOString(),
        };
        await this.persist();
    }

    public async getRoom(roomId: string): Promise<RoomPostRecord | undefined> {
        await this.ensureReady();
        return this.data[roomId];
    }

    public async isRoomEnded(roomId: string): Promise<boolean> {
        await this.ensureReady();
        return this.data[roomId]?.ended === true;
    }

    public async markEnded(roomId: string): Promise<RoomPostRecord | undefined> {
        await this.ensureReady();
        const record = this.data[roomId];
        if (!record || record.ended) {
            return record;
        }
        record.ended = true;
        await this.persist();
        return record;
    }

    private async persist(): Promise<void> {
        await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.promises.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
    }
}
