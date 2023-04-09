import { Command } from '@sapphire/framework';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import axios from 'axios';

const lyrics_url = 'https://spclient.wg.spotify.com/color-lyrics/v2/track';

export class LyricsCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'lyrics',
            description: 'Shows lyrics for the currently playing track or a specified one.',
            aliases: ['ly'],
            preconditions: []
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) => 
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(true)
                .addStringOption(option => 
                    option
                        .setName('query')
                        .setDescription('What track would you like to get lyrics for?')
                        .setRequired(false)
                        .setAutocomplete(true)
                )
        );
    }

    async chatInputRun(interaction) {
        const dispatcher = this.container.queue.get(interaction.guildId);
        let query = interaction.options?.getString('query');
        if (!query && !dispatcher?.current) return interaction.reply({ embeds: [this.container.util.embed('error', 'You did not provide a query and there is nothing playing.')], ephemeral: true });
        await interaction.reply({ embeds: [this.container.util.embed('loading', 'Fetching lyrics...')] });
        let iden;
        let customQ;
        if (!query && dispatcher.current.info.sourceName == 'spotify') {
            iden = dispatcher.current.info.identifier;
        } else {
            const node = this.container.shoukaku.getNode();
            query = query || `${dispatcher.current.info.title.replace('(Lyrics)', '').replace(`(${dispatcher.current.info.title.replace(/\(.*?\)/g, '').trim()})`, '')} - ${dispatcher.current.info.author.replace(' - Topic', '')}`;
            let result;
            let finalRes;
            const spotifyURL = query.startsWith('https://open.spotify.com/track/');
            if (spotifyURL) result = await node.rest.resolve(`${query}`);
            else result = await node.rest.resolve(`spsearch:${query}`);
            if (!result.tracks.length) return interaction.editReply({ embeds: [this.container.util.embed('error', `No results for \`${query}\`.${!interaction.options.getString('query') ? ' Try searching using a query instead.' : ''}`)] });
            const tracks = result.tracks;
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                customQ = `${track.info.title} - ${track.info.author}`;
                if (
                    LyricsCommand.stringMatchPercentage(track.info.title, spotifyURL ? customQ : query) < 90 &&
                    LyricsCommand.stringMatchPercentage(track.info.author, spotifyURL ? customQ : query) < 90 &&
                    LyricsCommand.stringMatchPercentage(`${track.info.title} - ${track.info.author}`, spotifyURL ? customQ : query) < 75
                ) continue; 
                else {
                    finalRes = track;
                    break;
                }
            }
            if (!finalRes) return interaction.editReply({ embeds: [this.container.util.embed('error', `No results for \`${query}\`.${!interaction.options.getString('query') ? ' Try searching using a query instead.' : ''}`)] }); 
            iden = finalRes.info.identifier;
        }
        const cfg = await this.container.db.get('spotify-cfg');
        axios.get(`${lyrics_url}/${iden}?format=json&market=from_token`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                'App-platform': 'WebPlayer',
                'authorization': `Bearer ${cfg.accessToken}`
            },
            timeout: 3000
        }).then((res) => {
            const lyrics = res.data.lyrics;
            let motd = this.container.motd;
            if (!Object(motd) || !motd.enabled || motd?.text?.length <= 0) motd = { enabled: false };
            let lyricsLines = [];
            lyrics.lines.forEach(line => lyricsLines.push(line.words));
            const lyr = LyricsCommand.splitLyrics(lyricsLines.join('\n'));
            const pm = new PaginatedMessage();
            for (const page of lyr) {
                pm.addPageEmbed((embed) => {
                    embed.setAuthor({ name: 'Lyrics' })
                        .setTitle(customQ || `${dispatcher.current.info.title} - ${dispatcher.current.info.author}`)
                        .setDescription(page)
                        .setFooter({ text: `Provided by ${lyrics.providerDisplayName} | ` + this.container.config.footer.text, iconURL: this.container.config.footer.iconURL })
                        .setColor('#cba6f7');
                    if (motd.enabled && motd.text?.length > 0) embed.setFooter({ text: motd.text, iconURL: motd.icon || undefined });
                    return embed;
                });
            }
            pm.run(interaction);
        }).catch((err) => {
            if (err.toJSON().status == 404) return interaction.editReply({ embeds: [this.container.util.embed('error', 'Lyrics are unavailable for this track.')] });
            this.container.logger.error('Lyrics fetching error: ' + err);
            return interaction.editReply({ embeds: [this.container.util.embed('error', 'An unknown error occurred when fetching lyrics.')] }); 
        });
    }

    async autocompleteRun(interaction) {
        let node = this.node;
        if (!node) {
            node = await this.container.shoukaku.getNode();
            this.node = node;
        }
        let query = interaction.options.getString('query');
        const search = await node.rest.resolve(`spsearch:${query}`);
        return interaction.respond(search.tracks.map((track) => ({ name: LyricsCommand.truncate(`${track.info.title} - ${track.info.author}`, 97), value: `${track.info.uri}` }))).catch(() => null);
    }

    async whatsappRun({ msg, args, dispatcher }) {
        let query = args.join(' ');
        if (!query && !dispatcher?.current) return await msg.reply('You did not provide a query and there is nothing playing.');
        let iden;
        let customQ;
        if (!query && dispatcher.current.info.sourceName == 'spotify') {
            iden = dispatcher.current.info.identifier;
        } else {
            query = query || `${dispatcher.current.info.title.replace('(Lyrics)', '').replace(`(${dispatcher.current.info.title.replace(/\(.*?\)/g, '').trim()})`, '')} - ${dispatcher.current.info.author.replace(' - Topic', '')}`;
            const node = this.container.shoukaku.getNode();
            let result;
            let finalRes;
            const spotifyURL = query.startsWith('https://open.spotify.com/track/');
            if (spotifyURL) result = await node.rest.resolve(`${query}`);
            else result = await node.rest.resolve(`spsearch:${query}`);
            if (!result.tracks.length) return msg.reply(`No results for _${query}_.${!args.length ? ' Try searching using a query instead.' : ''}`);
            const tracks = result.tracks;
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                customQ = `${track.info.title} - ${track.info.author}`;
                if (
                    LyricsCommand.stringMatchPercentage(track.info.title, spotifyURL ? customQ : query) < 90 &&
                    LyricsCommand.stringMatchPercentage(track.info.author, spotifyURL ? customQ : query) < 90 &&
                    LyricsCommand.stringMatchPercentage(`${track.info.title} - ${track.info.author}`, spotifyURL ? customQ : query) < 75
                ) continue; 
                else {
                    finalRes = track;
                    break;
                }
            }
            if (!finalRes) return msg.reply(`No results for _${query}_.${!args.length ? ' Try searching using a query instead.' : ''}`);
            iden = finalRes.info.identifier;
        }
        const cfg = await this.container.db.get('spotify-cfg');
        axios.get(`${lyrics_url}/${iden}?format=json&market=from_token`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                'App-platform': 'WebPlayer',
                'authorization': `Bearer ${cfg.accessToken}`
            },
            timeout: 3000
        }).then((res) => {
            const lyrics = res.data.lyrics;
            let motd = this.container.motd;
            if (!Object(motd) || !motd.enabled || motd?.text?.length <= 0) motd = { enabled: false };
            let lyricsLines = [];
            lyrics.lines.forEach(line => lyricsLines.push(line.words));
            const lyr = lyricsLines.join('\n');
            msg.reply(`*Lyrics${!args.length ? ` (${dispatcher.current.info.title.replace('(Lyrics)', '')} - ${dispatcher.current.info.author.replace(' - Topic', '')})`: ` (${customQ})`}* - Provided by ${lyrics.providerDisplayName}\n${lyr}`);
        }).catch((err) => {
            if (err.toJSON().status == 404) return msg.reply('Lyrics are unavailable for this track.');
            this.container.logger.error('Lyrics fetching error: ' + err);
            return msg.reply('An unknown error occurred when fetching lyrics.');
        });
    }

    static stringMatchPercentage(str1, str2) {
        // Convert both strings to lowercase to ensure a case-insensitive comparison & remove special characters
        const regex = /[-[\]{}()*+?.,\\^$|#\s]/g;
        str1 = str1.toLowerCase().replace(regex, '');
        str2 = str2.toLowerCase().replace(regex, '');
      
        // Calculate the edit distance between the two strings using the Levenshtein distance algorithm
        const matrix = [];
        const len1 = str1.length, len2 = str2.length;
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
            for (let j = 1; j <= len2; j++) {
                matrix[i][j] = i === 0 ? j :
                    Math.min(matrix[i - 1][j - 1] +
                (str1.charAt(i - 1) === str2.charAt(j - 1) ? 0 : 1),
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
      
        // Calculate the percentage match using the formula: 100 * (1 - (edit distance / length of longer string))
        const editDistance = matrix[len1][len2];
        const maxLength = Math.max(len1, len2);
        return Math.round(100 * (1 - (editDistance / maxLength)));
    }

    static splitLyrics (lyrics) {
        const maxCharsInAPage = 1024;
        const lineArray = lyrics.split('\n');
        const pages = [];
        for (let i = 0; i < lineArray.length; i++) {
            let page = '';
            while (lineArray[i].length + page.length < maxCharsInAPage) {
                page += `${lineArray[i]}\n`;
                i++;
                if (i >= lineArray.length) break;
            }
            if (page.trim().length > 0) pages.push(page);
        }
        return pages;
    }

    static truncate(str, n) {
        return (str.length > n) ? str.slice(0, n-1) + '...' : str;
    }

    static removeURLParams(url) {
        if (LyricsCommand.isValidUrl(url) === false) return url;
        const obj = new URL(url);
        obj.search = '';
        obj.hash = '';
        url = obj.toString();
        return url; 
    }

    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }
}
