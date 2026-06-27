import { ApiClient } from 'pumble-sdk';
import { buildRoomAnnouncement } from './roomMessage';
import { JsonFileRoomRegistry } from './roomRegistry';

export async function closeRoomAnnouncement(
    roomRegistry: JsonFileRoomRegistry,
    getBotClient: (workspaceId: string) => Promise<ApiClient | undefined>,
    roomId: string
): Promise<boolean> {
    const record = await roomRegistry.markEnded(roomId);
    if (!record) {
        return false;
    }

    const client = await getBotClient(record.workspaceId);
    if (!client) {
        console.error(`Cannot close room ${roomId}: bot client unavailable for workspace ${record.workspaceId}`);
        return false;
    }

    try {
        await client.v1.messages.editMessage(
            record.messageId,
            record.channelId,
            buildRoomAnnouncement(record.roomId, record.createdByUserId, { ended: true })
        );
        return true;
    } catch (error) {
        console.error(`Failed to update Pumble message for ended room ${roomId}`, error);
        return false;
    }
}
