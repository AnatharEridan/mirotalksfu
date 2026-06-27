import { V1 } from 'pumble-sdk';
import { JOIN_ACTION } from '../config';

export function buildRoomJoinPath(roomId: string): string {
    return `/join?room=${encodeURIComponent(roomId)}`;
}

type RoomAnnouncementOptions = {
    ended?: boolean;
};

export function buildRoomAnnouncement(
    roomId: string,
    createdByUserId: string,
    options: RoomAnnouncementOptions = {}
): V1.SendMessagePayload {
    const ended = options.ended === true;
    const payload = JSON.stringify({ roomId, createdByUserId });

    const blocks: V1.MainBlock[] = [
        {
            type: 'rich_text',
            elements: [
                {
                    type: 'rich_text_section',
                    elements: [
                        {
                            type: 'text',
                            text: ended
                                ? 'This MiroTalk call has ended.\nRoom: '
                                : 'A MiroTalk video call is ready.\nRoom: ',
                        },
                        { type: 'text', text: roomId, style: { code: true } },
                    ],
                },
            ],
        },
    ];

    if (ended) {
        blocks.push({
            type: 'rich_text',
            elements: [
                {
                    type: 'rich_text_section',
                    elements: [
                        {
                            type: 'text',
                            text: 'Everyone has left the call. Start a new one with ',
                        },
                        { type: 'text', text: '/mirotalk', style: { code: true } },
                        { type: 'text', text: '.' },
                    ],
                },
            ],
        });
        blocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Call ended' },
                    style: 'secondary',
                    disabled: true,
                } as V1.BlockButton,
            ],
        });
    } else {
        blocks.push({
            type: 'rich_text',
            elements: [
                {
                    type: 'rich_text_section',
                    elements: [
                        { type: 'text', text: 'Click ' },
                        { type: 'text', text: 'Join call', style: { bold: true } },
                        {
                            type: 'text',
                            text: ' to get a personal link with your Pumble name and avatar.',
                        },
                    ],
                },
            ],
        });
        blocks.push({
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
        });
    }

    return {
        text: ended ? `MiroTalk call ended — room ${roomId}` : `MiroTalk video call — room ${roomId}`,
        blocks,
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
