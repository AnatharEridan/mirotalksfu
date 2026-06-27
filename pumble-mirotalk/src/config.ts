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
    'Видеозвонки MiroTalk не настроены. Обратитесь к администратору рабочего пространства.';

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
    'Привет! 👋\nMiroTalk установлен в вашем рабочем пространстве.\n\n' +
    'Используйте `/mirotalk` в любом канале, чтобы начать видеозвонок, или выберите **MiroTalk** в меню быстрых действий.\n\n' +
    'При нажатии **Присоединиться** ваше имя и аватар из Pumble передаются в звонок автоматически.';

export const OFFLINE_MESSAGE = 'Приложение MiroTalk сейчас недоступно. Попробуйте позже.';

/** Public base URL of this addon (for join redirect links). */
export function getAddonPublicUrl(): string {
    const raw = process.env.PUMBLE_ADDON_PUBLIC_URL?.trim() || '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return trimTrailingSlash(raw);
    }
    return '';
}
