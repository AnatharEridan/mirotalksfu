import appConfig from '../app.config.json';

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, '');

type AppConfig = {
    mirotalk: {
        serverUrl: string;
        joinAudio: boolean;
        joinVideo: boolean;
    };
};

const settings = (appConfig as AppConfig).mirotalk;

export const JOIN_ACTION = 'mirotalk_join';

export const NOT_CONFIGURED_MESSAGE =
    'MiroTalk server URL is not configured. Set `mirotalk.serverUrl` in `app.config.json` (see `app.config.example.json`).';

/**
 * Public MiroTalk SFU URL.
 * Primary source: app.config.json. Optional override: MIROTALK_URL env (local dev).
 */
export function getMiroTalkUrl(): string | undefined {
    const raw = process.env.MIROTALK_URL || settings.serverUrl || '';
    const url = trimTrailingSlash(raw.trim());
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return undefined;
    }
    return url;
}

export function isMiroTalkConfigured(): boolean {
    return getMiroTalkUrl() !== undefined;
}

export const JOIN_AUDIO =
    process.env.PUMBLE_JOIN_AUDIO !== undefined
        ? process.env.PUMBLE_JOIN_AUDIO !== 'false'
        : settings.joinAudio;

export const JOIN_VIDEO =
    process.env.PUMBLE_JOIN_VIDEO !== undefined
        ? process.env.PUMBLE_JOIN_VIDEO !== 'false'
        : settings.joinVideo;

export const WELCOME_MESSAGE =
    'Hi there 👋\nMiroTalk has been installed in your workspace.\n\n' +
    'Use `/mirotalk` in any channel to start a video call, or pick **Start MiroTalk call** from the shortcuts menu.\n\n' +
    'When you click **Join call**, your Pumble name and avatar are passed to the meeting automatically.';

export const OFFLINE_MESSAGE = 'MiroTalk addon is currently unreachable. Please try again later.';
