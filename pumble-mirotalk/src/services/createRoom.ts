import { GlobalShortcutContext, SlashCommandContext } from 'pumble-sdk/lib/core/types/contexts';
import { isMiroTalkConfigured, NOT_CONFIGURED_MESSAGE } from '../config';
import { buildJoinUrl, generateRoomId } from './mirotalk';
import { buildPersonalJoinMessage, buildRoomAnnouncement } from './roomMessage';
import { fetchUserProfile } from './userProfile';

type RoomCreateContext = SlashCommandContext | GlobalShortcutContext;

export async function createRoomInChannel(ctx: RoomCreateContext, requestedRoomName?: string): Promise<void> {
    await ctx.ack();

    if (!isMiroTalkConfigured()) {
        await ctx.say(NOT_CONFIGURED_MESSAGE, 'ephemeral');
        return;
    }

    const client = await ctx.getBotClient();
    if (!client) {
        await ctx.say('MiroTalk bot is not available in this workspace.');
        return;
    }

    const roomId = generateRoomId(requestedRoomName);

    try {
        const creatorProfile = await fetchUserProfile(client, ctx.payload.userId);
        const creatorJoinUrl = buildJoinUrl(roomId, creatorProfile);

        await client.v1.messages.postMessageToChannel(
            ctx.payload.channelId,
            buildRoomAnnouncement(roomId, ctx.payload.userId)
        );

        await ctx.say(buildPersonalJoinMessage(creatorJoinUrl, creatorProfile.name), 'ephemeral');
    } catch (error) {
        console.error('Failed to create MiroTalk room', error);
        await ctx.say('Failed to start the video call. Check that the bot has the user:read scope and try again.', 'ephemeral');
    }
}
