import { Command } from '@sapphire/framework';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import axios from 'axios';

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
                .setDMPermission(false)
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
        await interaction.reply({ embeds: [this.container.util.embed('loading', 'Fetching lyrics...')] });
        const dispatcher = this.container.queue.get(interaction.guildId);
        let query = interaction.options.getString('query');
        if (!query && !dispatcher?.current) return interaction.editReply({ embeds: [this.container.util.embed('error', 'You did not provide a query and there is nothing playing.')] });
        let url;
        let customQ;
        if (!query && dispatcher.current.info.sourceName === 'spotify') {
            url = `https://api.tkkr.one/lyrics?query=${dispatcher.current.info.identifier}`;
        } else {
            query = query || `${dispatcher.current.info.title.replace('(Lyrics)', '')} - ${dispatcher.current.info.author.replace(' - Topic', '')}`; // most common things to replace
            const node = this.container.shoukaku.getNode();
            let result;
            const spotifyURL = query.includes('https://open.spotify.com/track/');
            if (spotifyURL) result = await node.rest.resolve(`${query}`);
            else result = await node.rest.resolve(`spsearch:${query}`);
            if (!result.tracks.length) return interaction.editReply({ embeds: [this.container.util.embed('error', `No results for \`${query}\`.${!interaction.options.getString('query') ? ' Try searching using a query instead.' : ''}`)] });
            const track = result.tracks.shift();
            customQ = `${track.info.title} - ${track.info.author}`;
            if (!track.info.uri.includes('/track/') || track.info.sourceName !== 'spotify') return interaction.editReply({ embeds: [this.container.util.embed('error', `No results for \`${query}\`.${!interaction.options.getString('query') ? ' Try searching using a query instead.' : ''}`)] });
            if (
                LyricsCommand.stringMatchPercentage(track.info.title, spotifyURL ? customQ : query) < 90 &&
                LyricsCommand.stringMatchPercentage(track.info.author, spotifyURL ? customQ : query) < 90 &&
                LyricsCommand.stringMatchPercentage(`${track.info.title} - ${track.info.author}`, spotifyURL ? customQ : query) < 75
            ) return interaction.editReply({ embeds: [this.container.util.embed('error', `No results for \`${query}\`.${!interaction.options.getString('query') ? ' Try searching using a query instead.' : ''}`)] }); 
            url = `https://api.tkkr.one/lyrics?query=${track.info.identifier}`;
        }
        let res;
        try {
            res = await axios({
                method: 'get',
                url,
                headers: {
                    Authorization: this.container.config.apiAuth
                }
            });
        } catch (e) {
            try {
                res = await axios({
                    method: 'get',
                    url,
                    headers: {
                        Authorization: this.container.config.apiAuth
                    }
                });
            } catch (e) {
                return interaction.editReply({ embeds: [this.container.util.embed('error', 'No lyrics found for this track.')] });
            }
        }
        let motd = this.container.motd;
        if (!Object(motd) || !motd.enabled || motd?.text?.length <= 0) motd = { enabled: false };
        res = res.data;
        let lyricsLines = [];
        let lyrics;
        if (res.error) {
            this.container.logWebhook.send(`__**Error while getting lyrics:**__\n**Query:** ${res.query}\n\`\`\`${res.error}\`\`\``);
            return interaction.editReply({ embeds: [this.container.util.embed('error', 'An error occurred when getting lyrics. A bug report has automatically been sent to the developers.')] });
        } else {
            res.data.lines.forEach(line => lyricsLines.push(line.words));
            lyrics = lyricsLines.join('\n');
        }
        const lyr = LyricsCommand.splitLyrics(lyrics);
        const pm = new PaginatedMessage();
        for (const page of lyr) {
            pm.addPageEmbed((embed) => {
                embed.setAuthor({ name: 'Lyrics' })
                    .setTitle(customQ || `${dispatcher.current.info.title} - ${dispatcher.current.info.author}`)
                    .setDescription(page)
                    .setFooter({ text: `Provided by ${res.data.provider} | ` + this.container.config.footer.text, iconURL: this.container.config.footer.iconURL })
                    .setColor('#cba6f7');
                if (motd.enabled && motd.text?.length > 0) embed.setFooter({ text: motd.text, iconURL: motd.icon || undefined });
                return embed;
            });
        }
        pm.run(interaction);
    }

    async autocompleteRun(interaction) {
        let node = this.node;
        if (!node) {
            node = await this.container.shoukaku.getNode();
            this.node = node;
        }
        let query = interaction.options.getString('query');
        const search = await node.rest.resolve(`spsearch:${query}`);
        return interaction.respond(search.tracks.map((track) => ({ name: LyricsCommand.truncate(`${track.info.title} - ${track.info.author}`, 97), value: track.info.uri }))).catch(() => null);
    }

    async whatsappRun({ msg, args, dispatcher}) {
        let query = args.join(' ');
        if (!query && !dispatcher?.current) return await msg.reply('You did not provide a query and there is nothing playing.');
        let url;
        let customQ;
        if (!query && dispatcher.current.info.sourceName === 'spotify') {
            url = `https://api.tkkr.one/lyrics?query=${dispatcher.current.info.identifier}`;
        } else {
            query = query || `${dispatcher.current.info.title.replace('(Lyrics)', '')} - ${dispatcher.current.info.author.replace(' - Topic', '')}`; // most common things to replace
            const node = this.container.shoukaku.getNode();
            let result;
            const spotifyURL = query.includes('https://open.spotify.com/track/');
            if (spotifyURL) result = await node.rest.resolve(`${query}`);
            else result = await node.rest.resolve(`spsearch:${query}`);
            if (!result.tracks.length) return msg.reply(`No results for _${query}_.${!args.length ? ' Try searching using a query instead.' : ''}`);
            const track = result.tracks.shift();
            customQ = `${track.info.title} - ${track.info.author}`;
            if (!track.info.uri.includes('/track/') || track.info.sourceName !== 'spotify') return msg.reply(`No results for _${query}_.${!args.length ? ' Try searching using a query instead.' : ''}`);
            if (
                LyricsCommand.stringMatchPercentage(track.info.title, spotifyURL ? customQ : query) < 90 &&
                LyricsCommand.stringMatchPercentage(track.info.author, spotifyURL ? customQ : query) < 90 &&
                LyricsCommand.stringMatchPercentage(`${track.info.title} - ${track.info.author}`, spotifyURL ? customQ : query) < 75
            ) return msg.reply(`No results for _${query}_.${!args.length ? ' Try searching using a query instead.' : ''}`);
            url = `https://api.tkkr.one/lyrics?query=${track.info.identifier}`;
        }
        let res;
        try {
            res = await axios({
                method: 'get',
                url,
                headers: {
                    Authorization: this.container.config.apiAuth
                }
            });
        } catch (e) {
            try {
                res = await axios({
                    method: 'get',
                    url,
                    headers: {
                        Authorization: this.container.config.apiAuth
                    }
                });
            } catch (e) {
                return msg.reply('No lyrics found for this track.');
            }
        }
        res = res.data;
        let lyricsLines = [];
        let lyrics;
        if (res.error) {
            this.container.logWebhook.send(`__**Error while getting lyrics:**__\n**Query:** ${res.query}\n\`\`\`${res.error}\`\`\``);
            return msg.reply('An error occurred when getting lyrics. A bug report has automatically been sent to the developers.');
        } else {
            res.data.lines.forEach(line => lyricsLines.push(line.words));
            lyrics = lyricsLines.join('\n');
        }
        if (!lyrics || lyrics instanceof Error) return msg.reply(`No results for _${query}_.${!args.length ? ' Try searching using a query instead.' : ''}`);
        else msg.reply(`*Lyrics${!args.length ? ` (${dispatcher.current.info.title.replace('(Lyrics)', '')} - ${dispatcher.current.info.author.replace(' - Topic', '')})`: ` (${customQ})`}* - Provided by ${res.data.provider}\n${lyrics}`);
    }

    static stringMatchPercentage(str1, str2) {
        // Convert both strings to lowercase to ensure a case-insensitive comparison
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
      
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
        const maxCharsInAPage = 2000;
        const lineArray = lyrics.split('\n');
        const pages = [];
        for (let i = 0; i < lineArray.length; i++) {
            let page = '';
            while (lineArray[i].length + page.length < maxCharsInAPage) {
                page += `${lineArray[i]}\n`;
                i++;
                if (i >= lineArray.length) break;
            }
            pages.push(page);
        }
        return pages;
    }

    static truncate(str, n) {
        return (str.length > n) ? str.slice(0, n-1) + '...' : str;
    }

    /*
        The code below is an old method of fetching lyrics. It is kept here for reference and as a backup.
        This is, however, unreliable and therefore no longer used.
        Depends on: @jeve/lyrics-finder
    */
    /*
    async chatInputRun(interaction) {
        await interaction.reply({ embeds: [this.container.util.embed('loading', 'Fetching lyrics...')] });
        const dispatcher = this.container.queue.get(interaction.guildId);
        let query = interaction.options.getString('query');
        if (!query && !dispatcher?.current) return interaction.editReply({ embeds: [this.container.util.embed('error', 'You did not provide a query and there is nothing playing.')] });
        if (!query) query = `${dispatcher.current.info.title.replace('(Lyrics)', '')} - ${dispatcher.current.info.author.replace(' - Topic', '')}`; // most common things to replace
        const lyrics = await lyricsFinder.LyricsFinder(query);
        if (!lyrics || lyrics instanceof Error) return interaction.editReply({ embeds: [this.container.util.embed('error', `No results for \`${query}\`.${!interaction.options.getString('query') ? ' Try searching using a query instead.' : ''}`)] });
        const lyr = LyricsCommand.splitLyrics(lyrics);
        const pm = new PaginatedMessage();
        for (const page of lyr) {
            pm.addPageEmbed((embed) => {
                embed.setAuthor({ name: `Lyrics${!interaction.options.getString('query') ? '' : ' (Custom query)'}` })
                    .setTitle(query)
                    .setDescription(page)
                    .setFooter(this.container.config.footer)
                    .setColor('#cba6f7');
                return embed;
            });
        }
        pm.run(interaction);
    }

    async whatsappRun({ msg, args, dispatcher}) {
        let query = args.join(' ');
        if (!query && !dispatcher?.current) return await msg.reply('You did not provide a query and there is nothing playing.');
        query = query || `${dispatcher.current.info.title.replace('(Lyrics)', '')} - ${dispatcher.current.info.author.replace(' - Topic', '')}`; // most common things to replace
        const lyrics = await lyricsFinder.LyricsFinder(query);
        if (!lyrics || lyrics instanceof Error) return msg.reply(`No results for _${query}_.${!args.length ? ' Try searching using a query instead.' : ''}`);
        else msg.reply(`*Lyrics${!args.length ? ` (${dispatcher.current.info.title.replace('(Lyrics)', '')} - ${dispatcher.current.info.author.replace(' - Topic', '')})`: ' (Custom query)'}*\n${lyrics}`);
    }
    */
}
