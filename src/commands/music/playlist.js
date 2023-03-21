import { Subcommand } from '@sapphire/plugin-subcommands';
import { EmbedBuilder } from 'discord.js';
import ShortUniqueId from 'short-unique-id';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import _ from 'lodash';
import prettyms from 'pretty-ms';
const generate = new ShortUniqueId({ length: 12 });

export class PlaylistCommand extends Subcommand {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'playlist',
            description: 'Manage your playlists on Kana!',
            subcommands: [
                {
                    name: 'create',
                    chatInputRun: 'playlistCreate'
                },
                {
                    name: 'delete',
                    chatInputRun: 'playlistDelete'
                },
                {
                    name: 'edit',
                    chatInputRun: 'playlistEdit'
                },
                {
                    name: 'info',
                    chatInputRun: 'playlistInfo'
                },
                {
                    name: 'list',
                    chatInputRun: 'playlistList'
                },
                {
                    name: 'add',
                    chatInputRun: 'playlistAdd'
                },
                {
                    name: 'add-current',
                    chatInputRun: 'playlistAddCurrent'
                },
                {
                    name: 'remove-track',
                    chatInputRun: 'playlistRemoveTrack'
                },
                {
                    name: 'load',
                    chatInputRun: 'playlistLoad'
                }
            ]
        });
    }
    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(false)
                .addSubcommand((command) =>
                    command
                        .setName('create')
                        .setDescription('Create a new playlist')
                        .addStringOption((option) => 
                            option
                                .setName('name')
                                .setDescription('The name of the created playlist.')
                                .setRequired(true)
                        )
                        .addStringOption((option) => 
                            option
                                .setName('description')
                                .setDescription('The description of the created playlist.')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('icon-url')
                                .setDescription('The icon URL of the created playlist.')
                                .setRequired(false)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName('delete')
                        .setDescription('Delete a playlist that you own on Kana.')
                        .addStringOption((option) => 
                            option
                                .setName('id')
                                .setDescription('The ID of the playlist you want to delete. Get this using /playlist-info.')
                                .setRequired(true)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName('edit')
                        .setDescription('Edits a Kana playlist.')
                        .addStringOption((option) => 
                            option
                                .setName('id')
                                .setDescription('The ID of the playlist you want to edit. Get this using /playlist-info.')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('option')
                                .setDescription('The field you would like to edit.')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Name (String)', value: 'name' },
                                    { name: 'Description (String) - defaults to null', value: 'description' },
                                    { name: 'Icon (URL) - defaults to null', value: 'iconURL' },
                                    { name: 'Private (true/false/yes/no) - defaults to true', value: 'private' }
                                )
                        )
                        .addStringOption((option) =>
                            option
                                .setName('value')
                                .setDescription('The value you would like to set the field to. Leave empty for defaults / null.')
                                .setRequired(true)
                        )
                )
                .addSubcommand((command) => 
                    command
                        .setName('info')
                        .setDescription('Returns information about the specified playlist.')
                        .addStringOption((option) => 
                            option
                                .setName('id')
                                .setDescription('The name / ID of the playlist you would like to get information about.')
                                .setRequired(true)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName('list')
                        .setDescription('Lists the playlists that you own on Kana.')
                )
                .addSubcommand((command) =>
                    command
                        .setName('add')
                        .setDescription('Adds a track to a Kana playlist. Accepts search queries.')
                        .addStringOption((option) =>
                            option
                                .setName('id')
                                .setDescription('The name / ID of the playlist you would like to add the track to.')
                                .setRequired(true)
                        )
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
                )
                .addSubcommand((command) =>
                    command
                        .setName('add-current')
                        .setDescription('Add the currently playing track to a playlist you\'ve created on Kana.')
                        .addStringOption((option) => 
                            option
                                .setName('id')
                                .setDescription('The name / ID of the playlist you would like to add the track to.')
                                .setRequired(true)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName('remove-track')
                        .setDescription('Remove a track from a Kana playlist.')
                        .addStringOption((option) => 
                            option
                                .setName('id')
                                .setDescription('The name / ID of the playlist you would like to remove the track from.')
                                .setRequired(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('index')
                                .setDescription('The index of the track to be removed. Get this using /playlist-info.')
                                .setRequired(true)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName('load')
                        .setDescription('The equivalent of /play\'ing a Kana playlist.')
                        .addStringOption((option) => 
                            option
                                .setName('id')
                                .setDescription('The name / ID of the playlist you would like to load (allows public)')
                                .setRequired(true))
                );
        });
    }

    async playlistCreate(interaction) {
        let playlists = await this.container.db.get('playlists');
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        let iconURL = interaction.options.getString('icon-url');
        if (name.length > 100) return interaction.reply({ embeds: [this.container.util.embed('error', 'The playlist name can\'t be longer than 100 characters.')], ephemeral: true });
        if (
            iconURL && ((
                !iconURL.endsWith('.png') &&
                !iconURL.endsWith('.jpg') &&
                !iconURL.endsWith('.jpeg') &&
                !iconURL.endsWith('.gif')
            ) || !PlaylistCommand.isValidUrl(iconURL))
        ) {
            return interaction.reply({ embeds: [this.container.util.embed('error', 'Invalid icon URL. Accepts links with extension `.png`, `.jpg`, `.jpeg`, `.gif`.')], ephemeral: true });
        }
        let newId = generate();
        while (Object.values(playlists).find(playlist => playlist.info.id === newId)) newId = generate();
        if (Object.values(playlists).find(playlist => playlist.info.name.toLowerCase() === name.toLowerCase() && playlist.info.owner === interaction.user.id)) return interaction.reply({ embeds: [this.container.util.embed('error', 'A playlist with that name already exists.')], ephemeral: true });
        const newPlaylist = {
            info: {
                id: newId,
                name: name,
                description: description,
                iconURL: iconURL || '',
                owner: interaction.user.id,
                private: true
            },
            tracks: []
        };
        playlists[newId] = newPlaylist;
        await this.container.db.set('playlists', playlists);
        return interaction.reply({ embeds: [this.container.util.embed('success', `Created playlist **${newPlaylist.info.name}** (\`${newId}\`).`)], ephemeral: true });
    }

    async playlistDelete(interaction) {
        let playlists = await this.container.db.get('playlists');
        const id = interaction.options.getString('id');
        if (id.length !== 12) return interaction.reply({ embeds: [this.container.util.embed('error', 'Invalid playlist ID.')], ephemeral: true });
        const playlist = Object.values(playlists).find(playlist => playlist.info.id === id);
        if (!playlist) return interaction.reply({ embeds: [this.container.util.embed('error', 'That playlist doesn\'t exist.')], ephemeral: true });
        if (playlist.info.owner !== interaction.user.id) return interaction.reply({ embeds: [this.container.util.embed('error', 'You don\'t own that playlist.')], ephemeral: true });
        delete playlists[playlist.info.id];
        await this.container.db.set('playlists', playlists);
        return interaction.reply({ embeds: [this.container.util.embed('success', `Deleted playlist **${playlist.info.name}** (\`${playlist.info.id}\`).`)], ephemeral: true });
    }

    async playlistEdit(interaction) {
        let playlists = await this.container.db.get('playlists');
        const field = interaction.options.getString('option');
        let value = interaction.options.getString('value');
        const id = interaction.options.getString('id');
        const userPlaylists = Object.values(playlists).filter(playlist => playlist.info.owner === interaction.user.id);
        const playlist = Object.values(userPlaylists).find(playlist => playlist.info.name.toLowerCase() === id.toLowerCase() || playlist.info.id === id);
        if (!playlist) return interaction.reply({ embeds: [this.container.util.embed('error', 'That playlist doesn\'t exist.')], ephemeral: true });
        if (playlist.info.owner !== interaction.user.id) return interaction.reply({ embeds: [this.container.util.embed('error', 'You don\'t own that playlist.')], ephemeral: true });
        // Checking inputs
        switch(field) {
        case 'name':
            if (value.length > 128) return interaction.reply({ embeds: [this.container.util.embed('error', 'The playlist name can\'t be longer than 128 characters.')], ephemeral: true });
            break;
        case 'description':
            if (value.length > 1024) return interaction.reply({ embeds: [this.container.util.embed('error', 'The playlist description can\'t be longer than 1024 characters.')], ephemeral: true });
            break;
        case 'icon':
            if (
                value && ((
                    !value.endsWith('.png') &&
                    !value.endsWith('.jpg') &&
                    !value.endsWith('.jpeg') &&
                    !value.endsWith('.gif')
                ) || !PlaylistCommand.isValidUrl(value))
            ) {
                return interaction.reply({ embeds: [this.container.util.embed('error', 'Invalid icon URL. Accepts links with extension `.png`, `.jpg`, `.jpeg`, `.gif`.')], ephemeral: true });
            }
            break;
        case 'private':
            if (
                value.toLowerCase() !== 'true' && 
                value.toLowerCase() !== 'false' &&
                value.toLowerCase() !== 'yes' &&
                value.toLowerCase() !== 'no'
            ) {
                return interaction.reply({ embeds: [this.container.util.embed('error', 'Invalid value. Accepts `true`, `false`, `yes`, `no`.')], ephemeral: true });
            }
            if (value.toLowerCase() == 'true') value = true;
            else if (value.toLowerCase() == 'false') value = false;
            else if (value.toLowerCase() == 'yes') value = true;
            else if (value.toLowerCase() == 'no') value = false;
            break;
        default:
            return interaction.reply({ embeds: [this.container.util.embed('error', 'Invalid field.')], ephemeral: true });
        }
        playlists[playlist.info.id].info[field] = value;
        await this.container.db.set('playlists', playlists);
        return interaction.reply({ embeds: [this.container.util.embed('success', `Successfully changed **${field}** to **${value}**.`)], ephemeral: true });
    }

    async playlistInfo(interaction) {
        let playlists = await this.container.db.get('playlists');
        const id = interaction.options.getString('id');
        const publicPlaylists = Object.values(playlists).filter(playlist => playlist.info.private === false);
        const userPlaylists = Object.values(playlists).filter(playlist => playlist.info.owner === interaction.user.id);
        const playlist = userPlaylists.find(playlist => playlist.info.name.toLowerCase() === id.toLowerCase() || playlist.info.id === id)  || publicPlaylists.find(playlist => playlist.info.name.toLowerCase() === id.toLowerCase() || playlist.info.id === id);
        if (!playlist) return interaction.reply({ embeds: [this.container.util.embed('error', 'Failed to find a playlist using that search term.')], ephemeral: true });
        const tracks = playlist.tracks;
        const chunked = _.chunk(tracks, this.container.config.tracksPerPage || 15);
        const pm = new PaginatedMessage();
        let motd = this.container.motd;
        if (!Object(motd) || !motd.enabled || motd?.text?.length <= 0) motd = { enabled: false };
        let totalDuration = 0;
        for (const track of tracks) totalDuration += track.info.length;
        if (tracks.find(track => track.isStream == true)) totalDuration = '∞';
        if (chunked.length == 0) {
            pm.addPageEmbed((embed) => {
                embed
                    .setAuthor({ name: `${playlist.info.name}`, iconURL: playlist.info.iconURL || undefined })
                    .setDescription(`**ID:** \`${playlist.info.id}\`\n**Description:** ${playlist.info.description}\n**Owner:** <@${playlist.info.owner}>\n**Private:** ${playlist.info.private ? 'Yes' : 'No'}\n**Total duration:** ${prettyms(totalDuration, { colonNotation: true, secondsDecimalDigits: 0, millisecondsDecimalDigits: 0 })}\n\n**__Tracks:__**\n*No tracks in playlist.*`)
                    .setColor('#cba6f7')
                    .setFooter(this.container.config.footer);
                if (motd.enabled && motd.image) embed.setImage(motd.image);
                if (motd.enabled && motd.text?.length > 0) embed.setFooter({ text: motd.text, iconURL: motd.icon || undefined });
                return embed;
            });
        }
        for (let x = 0; x < chunked.length; x++) {
            let descriptionLines = [];
            for (let i = 0; i < chunked[x].length; i++) {
                const track = chunked[x][i];
                descriptionLines.push(`**${(i + 1) + (x * (this.container.config.tracksPerPage || 15))}:** [${track.info.title} - ${track.info.author}](${track.info.uri})`);
            }
            pm.addPageEmbed((embed) => {
                embed
                    .setAuthor({ name: `${playlist.info.name}`, iconURL: playlist.info.iconURL || undefined })
                    .setDescription(`**ID:** \`${playlist.info.id}\`\n**Description:** ${playlist.info.description}\n**Owner:** <@${playlist.info.owner}>\n**Private:** ${playlist.info.private ? 'Yes' : 'No'}\n**Total duration:** ${prettyms(totalDuration, { colonNotation: true, secondsDecimalDigits: 0, millisecondsDecimalDigits: 0 })}\n\n**__Tracks:__**\n` + descriptionLines.join('\n'))
                    .setColor('#cba6f7')
                    .setFooter(this.container.config.footer);
                if (motd.enabled && motd.image) embed.setImage(motd.image);
                if (motd.enabled && motd.text?.length > 0) embed.setFooter({ text: motd.text, iconURL: motd.icon || undefined });
                return embed;
            });
        }
        pm.run(interaction);
    }

    async playlistList(interaction) {
        const playlists = await this.container.db.get('playlists');
        const userPlaylists = Object.values(playlists).filter(playlist => playlist.info.owner === interaction.user.id);
        const embed = new EmbedBuilder()
            .setColor('#cba6f7')
            .setAuthor({ name: `${interaction.user.tag}'s playlists`, iconURL: interaction.user.displayAvatarURL() })
            .setDescription(userPlaylists.map(playlist => `**${userPlaylists.indexOf(playlist) + 1}.** \`${playlist.info.id}\` **${playlist.info.name}** (**${playlist.tracks.length}** tracks)`).join('\n') || 'You don\'t have any playlists.')
            .setFooter(this.container.config.footer);
        const motd = this.container.motd;
        if (motd.enabled && motd?.text?.length > 0) {
            embed.setFooter({ text: motd.text, iconURL: motd.icon || undefined });
            if (motd.thumbnail.length > 0) embed.setThumbnail(motd.thumbnail || undefined);
        }
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async playlistAdd(interaction) {
        const playlists = await this.container.db.get('playlists');
        const query = interaction.options.getString('query');
        const source = interaction.options.getString('source') || 'ytmsearch';
        const id = interaction.options.getString('id');
        const userPlaylists = Object.values(playlists).filter(playlist => playlist.info.owner === interaction.user.id);
        const playlist = Object.values(userPlaylists).find(playlist => playlist.info.name.toLowerCase() === id.toLowerCase() || playlist.info.id === id);
        if (!playlist) return interaction.reply({ embeds: [this.container.util.embed('error', 'That playlist doesn\'t exist.')], ephemeral: true });
        if (playlist.info.owner !== interaction.user.id) return interaction.reply({ embeds: [this.container.util.embed('error', 'You don\'t own that playlist.')], ephemeral: true });
        const node = this.container.shoukaku.getNode();
        if (PlaylistCommand.isValidUrl(query)) {
            let result = await node.rest.resolve(query); 
            if (!result?.tracks.length) result = await node.rest.resolve(query); // Retry
            if (!result?.tracks.length) return interaction.reply({ embeds: [this.container.util.embed('error', `No results for \`${query}\`.`)], ephemeral: true });
            const track = result.tracks.shift();
            const playlistBool = result.loadType === 'PLAYLIST_LOADED';
            playlists[playlist.info.id].tracks.push(track);
            if (playlistBool) for (const track of result.tracks) playlists[playlist.info.id].tracks.push(track);
            await interaction.reply({ embeds: [this.container.util.embed('success', playlistBool ? `Added **${result.tracks.length + 1} tracks** from **${result.playlistInfo.name}** (external) to **${playlist.info.name}**.` : `Added [**${track.info.title}** - **${track.info.author}**](${track.info.uri}) to **${playlist.info.name}**.`)] }).catch(() => null);
            await this.container.db.set('playlists', playlists);
            return;
        }
        let search = await node.rest.resolve(`${source}:${query}`);
        if (!search?.tracks.length) search = await node.rest.resolve(`${source}:${query}`);
        if (!search?.tracks.length) return interaction.reply({ embeds: [this.container.util.embed('error', `No results for \`${query}\`.`)], ephemeral: true });
        const track = search.tracks.shift();
        playlists[playlist.info.id].tracks.push(track);
        await interaction.reply({ embeds: [this.container.util.embed('success', `Added [**${track.info.title}** - **${track.info.author}**](${track.info.uri}) to **${playlist.info.name}**.`)] }).catch(() => null);
        await this.container.db.set('playlists', playlists);
    }

    async playlistAddCurrent(interaction) {
        const id = interaction.options.getString('id');
        const playlists = await this.container.db.get('playlists');
        const userPlaylists = Object.values(playlists).filter(playlist => playlist.info.owner === interaction.user.id);
        const selectedPlaylist = userPlaylists.find(playlist => playlist.info.name.toLowerCase() === id.toLowerCase() || playlist.info.id === id);
        if (!selectedPlaylist) return interaction.reply({ embeds: [this.container.util.embed('error', 'That playlist doesn\'t exist.')], ephemeral: true });
        const dispatcher = this.container.queue.get(interaction.guildId);
        if (!dispatcher.current) return interaction.reply({ embeds: [this.container.util.embed('error', 'There\'s nothing playing right now.')], ephemeral: true });
        let clean = _.cloneDeep(dispatcher.current);
        clean.info.requester = undefined;
        playlists[selectedPlaylist.info.id].tracks.push(clean);
        await this.container.db.set('playlists', playlists);
        return interaction.reply({ embeds: [this.container.util.embed('success', `Added **${dispatcher.current.info.title}** - **${dispatcher.current.info.author}** to **${selectedPlaylist.info.name}**.`)] });
    }

    async playlistRemoveTrack(interaction) {
        let playlists = await this.container.db.get('playlists');
        const id = interaction.options.getString('id');
        const index = interaction.options.getInteger('index');
        const playlist = Object.values(playlists).find(playlist => (playlist.info.id === id || playlist.info.name.toLowerCase() === id.toLowerCase()) && (playlist.info.private === false || playlist.info.owner === interaction.user.id));
        if (!playlist) return interaction.reply({ embeds: [this.container.util.embed('error', 'That playlist doesn\'t exist.')], ephemeral: true });
        if (playlist.info.owner !== interaction.user.id) return interaction.reply({ embeds: [this.container.util.embed('error', 'You don\'t own that playlist.')], ephemeral: true });
        if (index > playlist.tracks.length || index < 1) return interaction.reply({ embeds: [this.container.util.embed('error', 'Invalid track index.')], ephemeral: true });
        const track = playlist.tracks[index - 1];
        playlist.tracks.splice(index - 1, 1);
        await this.container.db.set('playlists', playlists);
        return interaction.reply({ embeds: [this.container.util.embed('success', `Removed **${track.info.title}** - **${track.info.author}** from **${playlist.info.name}**.`)], ephemeral: true });
    }

    async playlistLoad(interaction) {
        const node = this.container.shoukaku.getNode();
        const id = interaction.options.getString('id');
        const playlists = await this.container.db.get('playlists');
        const publicPlaylists = Object.values(playlists).filter(playlist => playlist.info.private === false);
        const userPlaylists = Object.values(playlists).filter(playlist => playlist.info.owner === interaction.user.id);
        const selectedPlaylist = userPlaylists.find(playlist => playlist.info.name.toLowerCase() === id.toLowerCase() || playlist.info.id === id)  || publicPlaylists.find(playlist => playlist.info.name.toLowerCase() === id.toLowerCase() || playlist.info.id === id);
        if (!selectedPlaylist) return interaction.reply({ embeds: [this.container.util.embed('error', 'That playlist doesn\'t exist.')], ephemeral: true });
        if (interaction.guild.members.me.voice.channelId !== null && this.container.queue.get(interaction.guildId)?.current && interaction.member.voice.channel.id === interaction.guild.members.me.voice.channel.id) return interaction.reply({ embeds: [this.container.util.embed('error', `Join <#${interaction.guild.members.me.voice.channel.id}> before executing this command.`)], ephemeral: true });
        if (!interaction.member.voice.channel.joinable) return interaction.reply({ embeds: [this.container.util.embed('error', `I don't have permission to join <#${interaction.member.voice.channel.id}>.`)], ephemeral: true });
        if (!interaction.member.voice.channel.speakable) return interaction.reply({ embeds: [this.container.util.embed('error', `I don't have permission to play audio in <#${interaction.member.voice.channel.id}>.`)], ephemeral: true });
        for (const track of selectedPlaylist.tracks) await this.container.queue.handle(interaction.guild, interaction.member, interaction.channel, node, track);
        return interaction.reply({ embeds: [this.container.util.embed('success', `Queued **${selectedPlaylist.tracks.length} tracks** from **${selectedPlaylist.info.name}**.`)] });
    }

    async autocompleteRun(interaction) {
        if (interaction.options.getSubcommand() !== 'add') return;
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
        const source = qSource || interaction.options.getString('source') || 'ytmsearch';
        const search = await node.rest.resolve(`${source}:${query}`);
        if (search.loadType !== 'SEARCH_RESULT') return interaction.respond([{ name: PlaylistCommand.truncate(query, 97), value: query }]);
        return interaction.respond(search.tracks.map((track) => ({ name: PlaylistCommand.truncate(`${track.info.title} - ${track.info.author}`, 97), value: track.info.uri }))).catch(() => null);
    }

    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
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

    static truncate(str, n){
        return (str.length > n) ? str.slice(0, n-1) + '...' : str;
    }
}