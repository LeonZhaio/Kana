import { Command } from '@sapphire/framework';
import { ApplicationCommandType } from 'discord-api-types/v10';
import tags from 'common-tags';

export class PlayCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'play',
            description: 'Plays music from one of multiple supported sources. Requires either the query or playlist argument.',
            aliases: ['p', 'pl'],
            preconditions: ['voice', 'sameVoice']
        });
    }

    get whatsappDescription() { 
        return tags.stripIndents`Plays music from one of multiple supported sources.
                    Supported sources: YouTube Music, YouTube, SoundCloud (Defaults to YouTube Music)
                    Supports URLs from many sources as well.
                    Specify search sources using arguments or query prefixes:
                    --youtube, -yt, yt:<query>: Search via YouTube
                    --youtubemusic, -ytm, ytm:<query>: Search via YouTube Music
                    --soundcloud, -sc, sc:<query>: Search via SoundCloud
                    --spotify, -sp, sp:<query>: Search via Spotify
                    --applemusic, -am, am:<query>: Search via Apple Music
                    --deezer, -dz, dz:<query>: Search via Deezer
                    --yandexmusic, -ym, ym:<query>: Search via Yandex Music
                    Additional arguments:
                    --playnext, -next, -n: Add the track to the top of the queue. If not specified, adds to the end.`;
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) => 
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(false)
                .addStringOption((option) => 
                    option
                        .setName('query')
                        .setDescription('What would you like to search? Supports URLs from many sources and search queries from 3 sources.')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('source')
                        .setDescription('Where would you like to search for music from? (Defaults to YouTube Music)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'YouTube Music / ytm', value: 'ytmsearch' },
                            { name: 'YouTube / yt', value: 'ytsearch' },
                            { name: 'SoundCloud / sc', value: 'scsearch' },
                            { name: 'Spotify / sp', value: 'spsearch' },
                            { name: 'Apple Music / am', value: 'amsearch' },
                            { name: 'Deezer / dz', value: 'dzsearch' },
                            { name: 'Yandex Music / ym', value: 'ymsearch' }
                        )
                )
                .addBooleanOption((option) => 
                    option
                        .setName('next')
                        .setDescription('Whether to add the track to the top of the queue. If not specified or false, adds to the end.')
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName('kana-playlist')
                        .setDescription('Loads a Kana playlist, accepts playlist names or IDs and overrides \'query\'. Check out /playlist.')
                        .setRequired(false)
                )
        );
        registry.registerContextMenuCommand((builder) => 
            builder
                .setName(this.name)
                .setType(ApplicationCommandType.Message)
                .setDMPermission(false)
        );
    }

    async chatInputRun(interaction) {
        const kana_playlist = interaction.options.getString('kana-playlist');
        const query = interaction.options.getString('query');
        const source = interaction.options.getString('source') || this.container.config.defaultSearchProvider;
        const next = interaction.options.getBoolean('next') || false;
        const node = this.container.shoukaku.getNode();
        if (!interaction.member.voice.channel.joinable) return interaction.reply({ embeds: [this.container.util.embed('error', `I don't have permission to join <#${interaction.member.voice.channel.id}>.`)], ephemeral: true });
        if (!interaction.member.voice.channel.speakable) return interaction.reply({ embeds: [this.container.util.embed('error', `I don't have permission to play audio in <#${interaction.member.voice.channel.id}>.`)], ephemeral: true });
        if (kana_playlist) {
            const playlists = await this.container.db.get('playlists');
            const publicPlaylists = Object.values(playlists).filter(playlist => playlist.info.private === false);
            const userPlaylists = Object.values(playlists).filter(playlist => playlist.info.owner === interaction.user.id);
            const selectedPlaylist = userPlaylists.find(playlist => playlist.info.name.toLowerCase() === kana_playlist.toLowerCase() || playlist.info.id === kana_playlist)  || publicPlaylists.find(playlist => playlist.info.name.toLowerCase() === kana_playlist.toLowerCase() || playlist.info.id === kana_playlist);
            if (!selectedPlaylist) return interaction.reply({ embeds: [this.container.util.embed('error', 'That playlist doesn\'t exist.')], ephemeral: true });
            for (const track of selectedPlaylist.tracks) await this.container.queue.handle(interaction.guild, interaction.member, interaction.channel, node, track);
            return interaction.reply({ embeds: [this.container.util.embed('success', `Queued **${selectedPlaylist.tracks.length} tracks** from **${selectedPlaylist.info.name}**.`)] });
        }
        if (PlayCommand.checkURL(query)) {
            let result = await node.rest.resolve(query); 
            if (!result?.tracks.length) result = await node.rest.resolve(query); // Retry
            if (!result?.tracks.length) return interaction.reply({ embeds: [this.container.util.embed('error', `No results for \`${query}\`.`)], ephemeral: true });
            const track = result.tracks.shift();
            const playlist = result.loadType === 'PLAYLIST_LOADED';
            const dispatcher = await this.container.queue.handle(interaction.guild, interaction.member, interaction.channel, node, track, playlist ? false : next);
            if (dispatcher === 'Busy') return interaction.reply({ embeds: [this.container.util.embed('error', 'The dispatcher is currently busy, please try again later.')], ephemeral: true });
            if (playlist) {
                for (const track of result.tracks) await this.container.queue.handle(interaction.guild, interaction.member, interaction.channel, node, track);
            }
            await interaction.reply({ embeds: [this.container.util.embed('success', playlist ? `Queued **${result.tracks.length + 1} tracks** from **${result.playlistInfo.name}**.` : (next ? `Added [**${track.info.title}** - **${track.info.author}**](${track.info.uri}) to the top of the queue.` : `Queued [**${track.info.title}** - **${track.info.author}**](${track.info.uri}).`))] }).catch(() => null);
            if (!dispatcher?.current) dispatcher?.play();
            return;
        }
        let search = await node.rest.resolve(`${source}:${query}`);
        if (!search?.tracks.length) search = await node.rest.resolve(`${source}:${query}`);
        if (!search?.tracks.length) return interaction.reply({ embeds: [this.container.util.embed('error', `No results for \`${query}\`.`)], ephemeral: true });
        const track = search.tracks.shift();
        const dispatcher = await this.container.queue.handle(interaction.guild, interaction.member, interaction.channel, node, track, next);
        if (dispatcher === 'Busy') return interaction.reply({ embeds: [this.container.util.embed('error', 'The dispatcher is currently busy, please try again later.')], ephemeral: true });
        await interaction.reply({ embeds: [this.container.util.embed('success', next ? `Added [**${track.info.title}** - **${track.info.author}**](${track.info.uri}) to the top of the queue.` : `Queued [**${track.info.title}** - **${track.info.author}**](${track.info.uri}).`)] }).catch(() => null);
        if (!dispatcher?.current) dispatcher?.play();
    }
    
    async contextMenuRun(interaction) {
        const node = this.container.shoukaku.getNode();
        const attachments = [];
        const attachmentsArray = Array.from(interaction.targetMessage.attachments.values());
        let tracksLoaded = 0;
        if (attachmentsArray.length > 0) {
            for (let i = 0; i < attachmentsArray.length; i++) {
                if (!attachmentsArray[i].contentType.includes('audio/')) break;
                else attachments.push(attachmentsArray[i].url);
            }
        }
        for (let i = 0; i < attachments.length; i++) {
            const result = await node.rest.resolve(attachments[i]);
            if (!result?.tracks.length) continue;
            const track = result.tracks.shift();
            const dispatcher = await this.container.queue.handle(interaction.guild, interaction.member, interaction.channel, node, track);
            if (dispatcher === 'Busy') return interaction.reply({ embeds: [this.container.util.embed('error', 'The dispatcher is currently busy, please try again later.')], ephemeral: true });
            tracksLoaded++;
            if (!dispatcher?.current) dispatcher?.play();
        }
        let query = interaction.targetMessage.content;
        if (!interaction.member.voice.channel.joinable) return interaction.reply({ embeds: [this.container.util.embed('error', `I don't have permission to join <#${interaction.member.voice.channel.id}>.`)], ephemeral: true });
        if (!interaction.member.voice.channel.speakable) return interaction.reply({ embeds: [this.container.util.embed('error', `I don't have permission to play audio in <#${interaction.member.voice.channel.id}>.`)], ephemeral: true });
        const urls = PlayCommand.extractURL(query);
        if (urls?.length > 0) {
            for (let i = 0; i < urls.length; i++) {
                let result = await node.rest.resolve(urls[i]);
                if (!result?.tracks.length) result = await node.rest.resolve(urls[i]);
                const track = result.tracks.shift();
                tracksLoaded++;
                const playlist = result.loadType === 'PLAYLIST_LOADED';
                const dispatcher = await this.container.queue.handle(interaction.guild, interaction.member, interaction.channel, node, track, playlist ? false : (query.includes('--playnext') || query.includes('-pn')));
                if (dispatcher === 'Busy') return interaction.reply({ embeds: [this.container.util.embed('error', 'The dispatcher is currently busy, please try again later.')], ephemeral: true });
                tracksLoaded += result.tracks.length;
                if (playlist) {
                    for (const track of result.tracks) await this.container.queue.handle(interaction.guild, interaction.member, interaction.channel, node, track);
                }
                if (!dispatcher?.current) dispatcher?.play();
            }
            await interaction.reply({ embeds: [this.container.util.embed('success', `Queued **${tracksLoaded} track(s)**.`)] }).catch(() => null);
            return;
        } else if (!attachments.length) {
            await interaction.reply({ embeds: [this.container.util.embed('error', 'No links or attachments found.')], ephemeral: true });
            return;
        } else {
            await interaction.reply({ embeds: [this.container.util.embed('success', `Queued **${tracksLoaded} track(s)**.`)] }).catch(() => null);
        }
    }

    async autocompleteRun(interaction) {
        let node = this.node;
        if (!node) {
            node = await this.container.shoukaku.getNode();
            this.node = node;
        }
        let query = interaction.options.getString('query');
        let qSource;
        if (query.includes('yt:')) {
            query = query.replace('yt:', '');
            qSource = 'ytsearch';
        } else if (query.includes('ytm:')) {
            query = query.replace('ytm:', '');
            qSource = 'ytmsearch';
        } else if (query.includes('sc:')) {
            query = query.replace('sc:', '');
            qSource = 'scsearch';
        } else if (query.includes('sp:')) {
            query = query.replace('sp:', '');
            qSource = 'spsearch';
        } else if (query.includes('am:')) {
            query = query.replace('am:', '');
            qSource = 'amsearch:';
        } else if (query.includes('dz:')) {
            query = query.replace('dz:', '');
            qSource = 'dzsearch';
        } else if (query.includes('ym:')) {
            query = query.replace('ym:', '');
            qSource = 'ymsearch:';
        } else qSource = undefined;
        if (!query) return;
        const source = qSource || interaction.options.getString('source') || this.container.config.defaultSearchProvider;
        const search = await node.rest.resolve(`${source}:${query}`);
        if (search.loadType !== 'SEARCH_RESULT') return interaction.respond([{ name: PlayCommand.truncate(query, 97), value: query }]);
        return interaction.respond(search.tracks.map((track) => ({ name: PlayCommand.truncate(`${track.info.title} - ${track.info.author}`, 97), value: track.info.uri }))).catch(() => null);
    }

    async whatsappRun({ args, msg, discordUser, voiceChannels, voice, sameVoice }) {
        if (!discordUser) return await msg.reply('You are not linked to a Discord account. Use ```/link``` to link your WhatsApp account to your Discord account.');
        if (voice === false) return await msg.reply('You are not in a voice channel.');
        if (sameVoice === false) return await msg.reply('You are not in the same voice channel as the bot.');
        let query = args.join(' ');
        const next = (query.includes('--playnext') || args.includes('-next') || args.includes('-n')) || false;
        if (next === true) query.replace('--playnext', '').replace('-next', '').replace('-n', '');
        let qSource;
        if (query.includes('yt:') || query.includes('--youtube') || query.includes('-yt')) {
            query = query.replace('yt:', '').replace('--youtube', '').replace('-yt', '');
            qSource = 'ytsearch';
        } else if (query.includes('ytm:') || query.includes('--youtubemusic') || query.includes('-ytm')) {
            query = query.replace('ytm:', '').replace('--youtubemusic', '').replace('-ytm', '');
            qSource = 'ytmsearch';
        } else if (query.includes('sc:') || query.includes('--soundcloud') || query.includes('-sc')) {
            query = query.replace('sc:', '').replace('--soundcloud', '').replace('-sc', '');
            qSource = 'scsearch';
        } else if (query.includes('sp:') || query.includes('--spotify') || query.includes('-sp')) {
            query = query.replace('sp:', '').replace('--spotify', '').replace('-sp', '');
            qSource = 'spsearch';
        } else if (query.includes('am:') || query.includes('--applemusic') || query.includes('-am')) {
            query = query.replace('am:', '').replace('--applemusic', '').replace('-am', '');
            qSource = 'amsearch';
        } else if (query.includes('dz:') || query.includes('--deezer') || query.includes('-dz')) {
            query = query.replace('dz:', '').replace('--deezer', '').replaec('-dz', '');
            qSource = 'dzsearch';
        } else if (query.includes('ym:') || query.includes('--yandexmusic') || query.includes('-ym')) {
            query = query.replace('ym:', '').replace('--yandexmusic', '').replace('-ym', '');
            qSource = 'ymsearch';
        } else qSource = this.container.config.defaultSearchProvider;
        query = query.trim();
        if (!query) return msg.reply('Please provide a query.');
        const node = this.container.shoukaku.getNode();
        if (!voiceChannels.length) return msg.reply('You are not in a voice channel.');
        if (voiceChannels.length > 1) return msg.reply(`You are in multiple voice channels. Using ${voiceChannels[0].name}.`);
        const voiceChannel = voiceChannels[0];
        if (!voiceChannel.joinable) return msg.reply(`I don't have permission to join ${voiceChannel.name}.`);
        if (!voiceChannel.speakable) return msg.reply(`I don't have permission to play audio in ${voiceChannel.name}.`);
        const member = voiceChannel.members.find((member) => member.id === discordUser.id);
        if (PlayCommand.checkURL(query)) {
            let result = await node.rest.resolve(query); 
            if (!result?.tracks.length) result = await node.rest.resolve(query); // Retry
            if (!result?.tracks.length) return msg.reply(`No results for _${query}_.`);
            const track = result.tracks.shift();
            const playlist = result.loadType === 'PLAYLIST_LOADED';
            const dispatcher = await this.container.queue.handle(voiceChannel.guild, member, voiceChannel, node, track, playlist ? false : next);
            if (dispatcher === 'Busy') return msg.reply('The dispatcher is busy, please try again later.');
            if (playlist) {
                for (const track of result.tracks) await this.container.queue.handle(voiceChannel.guild, member, voiceChannel, node, track);
            }
            await msg.reply(playlist ? `Queued *${result.tracks.length + 1} tracks* from *${result.playlistInfo.name}*.` : (next ? `Added *${track.info.title}* - *${track.info.author}* to the top of the queue.` : `Queued *${track.info.title}* - *${track.info.author}*.`)).catch(() => null);
            if (!dispatcher?.current) dispatcher?.play();
            return;
        }
        let search = await node.rest.resolve(`${qSource}:${query}`);
        if (!search?.tracks.length) search = await node.rest.resolve(`${qSource}:${query}`);
        if (!search?.tracks.length) return msg.reply(`No results for _${query}_.`);
        const track = search.tracks.shift();
        const dispatcher = await this.container.queue.handle(voiceChannel.guild, member, voiceChannel, node, track, next);
        if (dispatcher === 'Busy') return msg.reply('The dispatcher is busy, please try again later.');
        await msg.reply(next ? `Added *${track.info.title}* - *${track.info.author}* to the top of the queue.` : `Queued *${track.info.title}* - *${track.info.author}*.`).catch(() => null);
        if (!dispatcher?.current) dispatcher?.play();
    }

    static checkURL(string) {
        try {
            new URL(string);
            return true;
        } catch (error) {
            return false;
        }
    }

    static extractURL(str, lower = false) {
        const regexp = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\\+.~#?!&//=]*)/gi;
        if (str) {
            let urls = str.match(regexp);
            if (urls) {
                return lower ? urls.map((item) => item.toLowerCase()) : urls;
            } else {
                return undefined;
            }
        } else {
            return undefined;
        }
    }

    static truncate(str, n) {
        return (str.length > n) ? str.slice(0, n-1) + '...' : str;
    }
}
