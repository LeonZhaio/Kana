/*
    Kana, a feature-rich Discord music bot.
    Copyright (C) 2023 | thaddeus kuah <contact@tkkr.one>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { SapphireClient, LogLevel, container } from '@sapphire/framework';
import { GatewayIntentBits, WebhookClient, ActivityType } from 'discord.js';
import { Shoukaku, Connectors } from 'shoukaku';
import { createRequire } from 'module';
import { AutoPoster } from 'topgg-autoposter';
import Keyv from 'keyv';
import wweb from 'whatsapp-web.js';
const { Client, LocalAuth } = wweb;

// File imports
import { Queue, Util } from './util.js';
import config from './config.js';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');

// Sapphire plugins
import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-hmr/register';
import '@sapphire/plugin-pattern-commands/register';
import '@sapphire/plugin-subcommands/register';

const client = new SapphireClient({
    intents: [
        /* =========== Non-privileged Intents =========== */
        // GatewayIntentBits.AutoModerationConfiguration,
        // GatewayIntentBits.AutoModerationExecution,
        GatewayIntentBits.DirectMessageReactions,
        // GatewayIntentBits.DirectMessageTyping,
        // GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildEmojisAndStickers,
        // GatewayIntentBits.GuildIntegrations,
        // GatewayIntentBits.GuildInvites,
        // GatewayIntentBits.GuildMessageReactions,
        // GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildMessages,
        // GatewayIntentBits.GuildModeration,
        // GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildVoiceStates,
        // GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.Guilds,
        /* =========== Privileged Intents =========== */
        // GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers, // Used in user counts and to detect if there are users in a voice channel
        // GatewayIntentBits.MessageContent
    ],
    logger: {
        level: String(process.env.NODE_ENV).toLowerCase() === 'development' ? LogLevel.Debug : LogLevel.Info
    },
    presence: { activities: [{ name: 'starting...', type: ActivityType.Playing }], status: 'dnd' }
});

const whatsapp = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

const coll = process.env.TYPE == 'canary' ? 'kanadb2' : 'kanadb1';

client.version = version;
container.tracksPlayed = [];
container.totalTracksPlayed = 0;
container.totalCommandsInvoked = 0;
container.totalTrackDuration = 0;
container.totalUptime = 0;
container.runtimeArguments = process.argv.slice(2);
container.whatsapp = whatsapp;
container.config = config;
container.util = Util;
container.queue = new Queue(client);
container.webhook = new WebhookClient({ url: config.webhook });
container.logWebhook = new WebhookClient({ url: config.logWebhook });
container.db = new Keyv(config.databaseUrl, { collection: coll });
if (config.topggToken) container.autoposter = AutoPoster(config.topggToken, client, { interval: 900000, postOnStart: true });
container.shoukaku = new Shoukaku(new Connectors.DiscordJS(client), config.lavalink, {
    userAgent: `Kana-${version}`,
    reconnectTries: 10
});

setInterval(async () => {
    container.totalUptime += 1;
}, 1000);


process.on('unhandledRejection', (error) => {
    container.logger.error(error);
    container.logWebhook.send(`**__Unhandled rejection__**\n\`\`\`${error}\`\`\``);
});

if (!container.runtimeArguments.includes('--no-discord') && !container.runtimeArguments.includes('-nd')) client.login(config.discordToken);
if (!container.runtimeArguments.includes('--no-whatsapp') && !container.runtimeArguments.includes('-nw')) whatsapp.initialize();