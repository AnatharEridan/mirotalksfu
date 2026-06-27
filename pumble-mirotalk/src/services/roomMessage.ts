import { V1 } from 'pumble-sdk';
import { JOIN_ACTION } from '../config';

export function buildRoomJoinPath(roomId: string): string {
    return `/join?room=${encodeURIComponent(roomId)}`;
}

export function buildRoomAnnouncement(roomId: string, createdByUserId: string): V1.SendMessagePayload {
    const payload = JSON.stringify({ roomId, createdByUserId });

    return {
        text: `MiroTalk video call — room ${roomId}`,
        blocks: [
            {
                type: 'rich_text',
                elements: [
                    {
                        type: 'rich_text_section',
                        elements: [
                            { type: 'text', text: 'A MiroTalk video call is ready.\nRoom: ' },
                            { type: 'text', text: roomId, style: { code: true } },
                        ],
                    },
                ],
            },
            {
                type: 'rich_text',
                elements: [
                    {
                        type: 'rich_text_section',
                        elements: [
                            {
                                type: 'text',
                                text: 'Click ',
                            },
                            {
                                type: 'text',
                                text: 'Join call',
                                style: { bold: true },
                            },
                            {
                                type: 'text',
                                text: ' to get a personal link with your Pumble name and avatar.',
                            },
                        ],
                    },
                ],
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        onAction: JOIN_ACTION,
                        value: payload,
                        text: { type: 'plain_text', text: 'Join call' },
                        style: 'primary',
                    },
                ],
            },
        ],
    };
}

export function buildPersonalJoinMessage(joinUrl: string, userName: string): V1.SendMessagePayload {
    return {
        text: `${userName}, join the MiroTalk call: ${joinUrl}`,
        blocks: [
            {
                type: 'rich_text',
                elements: [
                    {
                        type: 'rich_text_section',
                        elements: [{ type: 'text', text: `${userName}, your join link (name & avatar from Pumble):` }],
                    },
                ],
            },
            {
                type: 'rich_text',
                elements: [
                    {
                        type: 'rich_text_section',
                        elements: [{ type: 'link', url: joinUrl, text: 'Join MiroTalk call' }],
                    },
                ],
            },
        ],
    };
}
