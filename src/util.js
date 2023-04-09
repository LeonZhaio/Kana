import { container } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType } from 'discord.js';
import prettyms from 'pretty-ms';
import axios from 'axios';

export class Util {
    static embed(type, text, motdEnabled = true) {
        let color;
        let emoji = '';
        switch (type) {
        case 'success':
            color = '#a6e3a1';
            emoji = container.config.emojis.success;
            break;
        case 'error':
            color = '#f38ba8';
            emoji = container.config.emojis.error;
            break;
        case 'loading':
            color = '#a6adc8';
            emoji = container.config.emojis.loading;
            break;
        case 'info':
            color = '#cba6f7';
            break;
        default:
            color = '#cba6f7';
        }
        if (type && text) {
            const built = new EmbedBuilder()
                .setDescription(emoji + ' ' + text)
                .setColor(color);
            const motd = container.motd;
            if (motdEnabled && motd.enabled && motd?.text?.length > 0) {
                built.setFooter({ text: motd.text, iconURL: motd.icon || undefined });
                if (motd.thumbnail.length > 0) built.setThumbnail(motd.thumbnail || undefined);
            }
            return built;
        } else {
            return new EmbedBuilder()
                .setColor(color)
                .setFooter(container.config.footer);
        }
    }
    static createProgressBar(current, end, size) {
        if (isNaN(current) || isNaN(end)) return 'Arguments current and end have to be integers.';
        const percentage = current / end;
        const progress = Math.round(size * percentage);
        const emptyProgress = size - progress;

        const progressText = '▇'.repeat(progress);
        const emptyProgressText = '—'.repeat(emptyProgress);

        return `[${progressText}${emptyProgressText}]`;
    }

    static generateCode(digits = 6) {
        let code = '';
        for (let i = 0; i < digits; i++) {
            code += Math.floor(Math.random() * 10);
        }
        return Number(code);
    }

    static async refreshSpotifyToken() {
        let res;
        try {
            res = await axios({
                method: 'get',
                url: 'https://open.spotify.com/get_access_token?reason=transport&productType=web_player',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    'App-platform': 'WebPlayer',
                    'Content-Type': 'text/html; charset=utf-8',
                    'cookie': `sp_dc=${container.config.sp_dc}`
                },
                timeout: 1000
            });
        } catch (e) {
            container.logger.error('Failed to refresh Spotify access token.');
            return false;
        }
        if (typeof res.data !== 'object' || Array.isArray(res.data) || res.data === null || res.isAnonymous) {
            container.logger.error('Failed to refresh Spotify access token.');
            return false;
        } else {
            await container.db.set('spotify-cfg', res.data);
            return res.data;
        }
    }
}

export class Queue extends Map {
    constructor(client, iterable) {
        super(iterable);
        this.client = client;
        this.previous = null;
    }

    async handle(guild, member, channel, node, track, next) {
        track.info.requester = member;
        const existing = this.get(guild.id);
        if (!existing) {
            if (container.shoukaku.players.has(guild.id)) 
                return 'Busy';
            let player;
            try {
                player = await node.joinChannel({
                    guildId: guild.id,
                    shardId: guild.shardId,
                    channelId: member.voice.channelId
                });
            } catch (e) {
                channel.send({ embeds: [container.util.embed('error', 'Failed to establish a connection to your voice channel within 15 seconds. Please check that you have given Kana the correct permissions.')] });
                return 'Join Fail';
            }
            container.logger.debug(`New connection @ guild "${guild.id}"`);
            const dispatcher = new Dispatcher({
                client: this.client,
                guild,
                channel,
                player,
            });
            if (next) dispatcher.queue.unshift(track);
            else dispatcher.queue.push(track);
            this.set(guild.id, dispatcher);
            container.logger.debug(`New player dispatcher @ guild "${guild.id}"`);
            return dispatcher;
        }
        if (next) existing.queue.unshift(track);
        else existing.queue.push(track);
        if (!existing.current) existing.play();
        return null;
    }
}

export class Dispatcher {
    constructor({ client, guild, channel, player }) {
        this.client = client;
        this.guild = guild;
        this.channel = channel;
        this.player = player;
        this.queue = [];
        this.repeat = 'off';
        this.current = null;
        this.stopped = false;
        this.previous = [];
        this.previousUsed = false;
        let _notifiedOnce = false;
        let _errorHandler = data => {
            if ((data instanceof Error || data instanceof Object) && data.code !== 4014) container.logger.error(data);
            this.queue.length = 0;
            this.destroy();
        };

        this.player
            .on('start', async () => {
                if (this.repeat === 'one') {
                    if (_notifiedOnce) return;
                    else _notifiedOnce = true;
                } else if (this.repeat === 'all' || this.repeat === 'off') {
                    _notifiedOnce = false;
                }
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('previous')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('⏮️'),
                        new ButtonBuilder()
                            .setCustomId('playback')
                            .setLabel('Pause / Resume')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('⏯️'),
                        new ButtonBuilder()
                            .setCustomId('skip')
                            .setLabel('Skip')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('⏭️'),
                        new ButtonBuilder()
                            .setCustomId('stop')
                            .setLabel('Stop')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('⏹️')
                    );
                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('shuffle')
                            .setLabel('Shuffle')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🔀'),
                        new ButtonBuilder()
                            .setCustomId('repeat')
                            .setLabel('Repeat')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🔁'),
                        new ButtonBuilder()
                            .setCustomId('queue')
                            .setLabel('Queue')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('📃'),
                        new ButtonBuilder()
                            .setCustomId('lyrics')
                            .setLabel('Lyrics')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('📝'),
                    );
                if (this.nowPlayingMessage) {
                    const msgs = await this.channel.messages.fetch({ limit: 1, force: true });
                    if (msgs.first().id === this.nowPlayingMessage.id) {
                        await this.nowPlayingMessage
                            .edit({ embeds: [ Util.embed('info', `${container.config.emojis.playing} [**${this.current.info.title}** - **${this.current.info.author}**](${this.current.info.uri}) \`${Dispatcher.humanizeTime(this.current.info.length)}\` (${this.current.info.requester.toString()})`, false) ] })
                            .catch(() => null);
                        return;
                    } else {
                        await this.nowPlayingMessage.delete().catch(() => null);
                    }
                }
                this.nowPlayingMessage = await this.channel
                    .send({ embeds: [ Util.embed('info', `${container.config.emojis.playing} [**${this.current.info.title}** - **${this.current.info.author}**](${this.current.info.uri}) \`${Dispatcher.humanizeTime(this.current.info.length)}\` (${this.current.info.requester.toString()})`, false) ], components: [row, row2] })
                    .catch(() => null);
            })
            .on('end', async () => {
                container.totalTracksPlayed++;
                container.tracksPlayed.push({ url: this.current.info.identifier, source: this.current.info.sourceName, title: this.current.info.title, author: this.current.info.author });
                if (this.current.info.isStream == false) container.totalTrackDuration += this.current.info.length;
                if (this.repeat === 'one') this.queue.unshift(this.current);
                if (this.repeat === 'all' && !this.current.skipped) this.queue.push(this.current);
                if (this.nowPlayingMessage && this.repeat !== 'one') {
                    if (this.previousUsed == false) this.previous.unshift(this.current);
                    this.previousUsed = false;
                    const msgs = await this.channel.messages.fetch({ limit: 1, force: true });
                    if (msgs.first().id === this.nowPlayingMessage.id) return this.play();
                    else {
                        await this.nowPlayingMessage.delete().catch(() => null);
                        this.nowPlayingMessage = null;
                    }
                }
                this.play();
            })
            .on('stuck', () => {
                const stuckTrack = this.current;
                if (this.repeat === 'one') this.queue.unshift(this.current);
                if (this.repeat === 'all') this.queue.push(this.current);
                if (this.nowPlayingMessage) {
                    this.nowPlayingMessage.edit({ embeds: [Util.embed('error', `Stuck while playing track **${stuckTrack.info.title}** - **${stuckTrack.info.author}**`)] }).catch(() => null);
                    this.nowPlayingMessage = null;
                }
                this.play();
            })
            .on('error', _errorHandler);
    }

    static humanizeTime(ms) {
        return prettyms(ms, { colonNotation: true, secondsDecimalDigits: 0 });
    }

    get exists() {
        return container.queue.has(this.guild.id);
    }

    play() {
        if (this.guild.members.me?.voice?.channel?.type === ChannelType.GuildStageVoice) this.guild.members.me?.voice?.setSuppressed(false).catch(() => null);
        this.queue.previous = this.current;
        if (!this.exists || !this.queue.length) return this.destroy();
        this.current = this.queue.shift();
        this.player
            .setVolume((container.config.defaultVolume || 75) / 100)
            .playTrack({ track: this.current.track });
    }

    async destroy(reason) {
        this.queue.length = 0;
        this.player.connection.disconnect();
        if (this.nowPlayingMessage) {
            await this.nowPlayingMessage?.delete().catch(() => null);
            this.nowPlayingMessage = null;
        }
        container.queue.delete(this.guild.id);
        container.logger.debug(`Destroyed the player & connection @ guild "${this.guild.id}"\nReason: ${reason || 'No reason provided'}`);
        if (this.stopped) return;
        /*
        this.channel
            .send('No more tracks in queue.')
            .catch(() => null);
        */
    }
}