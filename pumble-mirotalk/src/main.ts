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
import { createJoinLaunchHandler, createJoinPendingHandler } from './services/joinLaunch';
import { setPendingJoin } from './services/pendingJoinStore';
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
            description: 'Начать видеозвонок MiroTalk',
            handler: async (ctx) => {
                const roomName = ctx.payload.text?.trim() || undefined;
                await createRoomInChannel(ctx, roomRegistry, roomName);
            },
        },
    ],
    globalShortcuts: [
        {
            name: 'Начать звонок MiroTalk',
            description: 'Создать видеозвонок MiroTalk в этом канале',
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
                        let buttonPayload: JoinButtonPayload | undefined;
                        try {
                            const rawValue = JSON.parse(ctx.payload.payload).value;
                            buttonPayload = parseJoinPayload(rawValue);
                        } catch {
                            buttonPayload = undefined;
                        }

                        if (!buttonPayload) {
                            await ctx.ack();
                            await ctx.say('Не удалось открыть звонок. Начните новый с помощью /mirotalk.', 'ephemeral');
                            return;
                        }

                        if (roomRegistry.isRoomEnded(buttonPayload.roomId)) {
                            await ctx.ack();
                            await ctx.say('Этот звонок уже завершён. Начните новый с помощью /mirotalk.', 'ephemeral');
                            return;
                        }

                        if (!isMiroTalkConfigured()) {
                            await ctx.ack();
                            await ctx.say(NOT_CONFIGURED_MESSAGE, 'ephemeral');
                            return;
                        }

                        const client = await ctx.getBotClient();
                        if (!client) {
                            await ctx.ack();
                            await ctx.say('Бот MiroTalk недоступен.', 'ephemeral');
                            return;
                        }

                        try {
                            const profile = await fetchUserProfile(client, ctx.payload.userId);
                            const joinUrl = buildJoinUrl(buttonPayload.roomId, profile);
                            setPendingJoin(buttonPayload.roomId, ctx.payload.userId, joinUrl);
                            await ctx.ack();
                        } catch (error) {
                            console.error('Failed to build join link', error);
                            await ctx.ack();
                            await ctx.say('Не удалось подготовить вход в звонок. Попробуйте ещё раз.', 'ephemeral');
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

        expressApp.get('/pumble-join/launch', createJoinLaunchHandler());
        expressApp.get('/pumble-join/pending', createJoinPendingHandler());

        expressApp.post(
            '/mirotalk-webhook',
            express.json(),
            createMiroTalkWebhookHandler(roomRegistry, (workspaceId) => addonApi.getBotClient(workspaceId))
        );
    },
};

start(addon);
