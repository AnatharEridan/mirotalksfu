import type { Request, Response } from 'express';
import { ApiClient } from 'pumble-sdk';
import { closeRoomAnnouncement } from './closeRoom';
import { JsonFileRoomRegistry } from './roomRegistry';

type MiroTalkWebhookBody = {
    event?: string;
    data?: {
        room_id?: string;
    };
};

export function createMiroTalkWebhookHandler(
    roomRegistry: JsonFileRoomRegistry,
    getBotClient: (workspaceId: string) => Promise<ApiClient | undefined>
) {
    const expectedSecret = process.env.MIROTALK_WEBHOOK_SECRET?.trim();

    return async (req: Request, res: Response): Promise<void> => {
        if (expectedSecret) {
            const provided = String(req.query.secret || req.headers['x-mirotalk-webhook-secret'] || '');
            if (provided !== expectedSecret) {
                res.status(401).send('Unauthorized');
                return;
            }
        }

        const body = req.body as MiroTalkWebhookBody;
        const roomId = body?.data?.room_id;

        if (body?.event === 'roomEmpty' && roomId) {
            await closeRoomAnnouncement(roomRegistry, getBotClient, roomId);
        }

        res.status(200).json({ ok: true });
    };
}
