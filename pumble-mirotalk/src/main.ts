import path from 'path';
import { App, JsonFileTokenStore, start } from 'pumble-sdk';
import type { Addon } from 'pumble-sdk/lib/core/services/Addon';
import type { AddonManifest } from 'pumble-sdk/lib/core/types/types';
import express from 'express';
import { BlockInteractionContext } from 'pumble-sdk/lib/core/types/contexts';
import { JOIN_ACTION, NOT_CONFIGURED_MESSAGE, OFFLINE_MESSAGE, WELCOME_MESSAGE, isMiroTalkConfigured } from './config';
import { createRoomInChannel } from './services/createRoom';
import { buildJoinUrl } from './services/mirotalk';
import { createMiroTalkWebhookHandler } from './services/mirotalkWebhook';
import { buildPersonalJoinMessage } from './services/roomMessage';
import { JsonFileRoomRegistry } from './services/roomRegistry';
import { fetchUserProfile } from './services/userProfile';

type JoinButtonPayload = {
    roomId: string;
    createdByUserId?: string;
};

const roomRegistry = new JsonFileRoomRegistry(
    process.env.PUMBLE_ROOMS_PATH || path.join(process.cwd(), 'data', 'rooms.json')
);

function parseJoinPayload(raw: string | undefined): JoinButtonPayload | undefined {
    if (!raw) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(raw) as JoinButtonPayload;
        if (!parsed?.roomId || typeof parsed.roomId !== 'string') {
            return undefined;
        }
        return parsed;
    } catch {
        return undefined;
    }
}

const addon: App = {
    welcomeMessage: WELCOME_MESSAGE,
    offlineMessage: OFFLINE_MESSAGE,
    slashCommands: [
        {
            command: '/mirotalk',
            description: 'Start a MiroTalk video call',
            usageHint: '[room-name]',
            handler: async (ctx) => {
                const roomName = ctx.payload.text?.trim() || undefined;
                await createRoomInChannel(ctx, roomRegistry, roomName);
            },
        },
    ],
    globalShortcuts: [
        {
            name: 'Start MiroTalk call',
            description: 'Create a MiroTalk video call in this channel',
            handler: async (ctx) => {
                await createRoomInChannel(ctx, roomRegistry);
            },
        },
    ],
    blockInteraction: {
        interactions: [
            {
                sourceType: 'MESSAGE',
                handlers: {
                    [JOIN_ACTION]: async (ctx: BlockInteractionContext<'MESSAGE'>) => {
                        await ctx.ack();

                        let buttonPayload: JoinButtonPayload | undefined;
                        try {
                            const rawValue = JSON.parse(ctx.payload.payload).value;
                            buttonPayload = parseJoinPayload(rawValue);
                        } catch {
                            buttonPayload = undefined;
                        }

                        if (!buttonPayload) {
                            await ctx.say('Could not read the room details. Please start a new call with /mirotalk.', 'ephemeral');
                            return;
                        }

                        if (roomRegistry.isRoomEnded(buttonPayload.roomId)) {
                            await ctx.say('This call has ended. Start a new one with /mirotalk.', 'ephemeral');
                            return;
                        }

                        if (!isMiroTalkConfigured()) {
                            await ctx.say(NOT_CONFIGURED_MESSAGE, 'ephemeral');
                            return;
                        }

                        const client = await ctx.getBotClient();
                        if (!client) {
                            await ctx.say('MiroTalk bot is not available.', 'ephemeral');
                            return;
                        }

                        try {
                            const profile = await fetchUserProfile(client, ctx.payload.userId);
                            const joinUrl = buildJoinUrl(buttonPayload.roomId, profile);
                            await ctx.say(buildPersonalJoinMessage(joinUrl, profile.name), 'ephemeral');
                        } catch (error) {
                            console.error('Failed to build join link', error);
                            await ctx.say('Failed to prepare your join link. Please try again.', 'ephemeral');
                        }
                    },
                },
            },
        ],
    },
    eventsPath: '/hook',
    redirect: { enable: true, path: '/redirect' },
    tokenStore: new JsonFileTokenStore(process.env.PUMBLE_TOKENS_PATH || 'tokens.json'),
    onServerConfiguring: (expressApp, pumbleAddon) => {
        const addonApi = pumbleAddon as Addon<AddonManifest>;

        roomRegistry.initialize().catch((error) => {
            console.error('Failed to load room registry', error);
        });

        expressApp.get('/health', (_req: unknown, res: { json: (body: unknown) => void }) => {
            res.json({ ok: true, service: 'pumble-mirotalk' });
        });

        expressApp.post(
            '/mirotalk-webhook',
            express.json(),
            createMiroTalkWebhookHandler(roomRegistry, (workspaceId) => addonApi.getBotClient(workspaceId))
        );
    },
};

start(addon);
