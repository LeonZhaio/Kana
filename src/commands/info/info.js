import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import ms from 'pretty-ms';
import si from 'systeminformation';

export class InfoCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'info',
            description: 'Returns information about Kana.',
            aliases: ['about']
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) => 
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(true)
        );
    }
    
    async chatInputRun(interaction) {
        const container = this.container;
        await interaction.reply({ embeds: [this.container.util.embed('loading', 'Retrieving statistics...')] });
        const owner = await this.container.client.users.fetch(this.container.config.ownerIds[0]);
        let stats = await this.container.db.get('stats');
        stats = { 
            tracksPlayed: [...stats.tracksPlayed, ...container.tracksPlayed], // List of tracks played by the bot ({ identifier, source, title, author })
            totalTracksPlayed: container.totalTracksPlayed + stats.totalTracksPlayed, // Total number of tracks played by the bot
            totalDuration: container.totalTrackDuration + stats.totalDuration, // Total duration of all tracks played by the bot (not including streams of course) in milliseconds
            totalCommandsInvoked: container.totalCommandsInvoked + stats.totalCommandsInvoked, // Total number of commands invoked by users
            totalUptime: container.totalUptime + stats.totalUptime // Total uptime of the bot in seconds
        };
        const lavalinkStats = this.container.shoukaku.getNode().stats;
        const currentLoad = await si.currentLoad();
        const memory = await si.mem();
        const embed1 = new EmbedBuilder()
            .setTitle('About Kana')
            .setThumbnail(this.container.client.user.displayAvatarURL({ size: 4096 }))
            .setDescription(
                'Kana is a free music Discord bot with WhatsApp integrations, made using [node.js](https://nodejs.org/) and [discord.js](https://discord.js.org/), powered by [Lavalink](https://github.com/freyacodes/Lavalink) and the [Sapphire Framework](https://sapphirejs.dev). Kana aims to provide music at the highest quality possible, fully free of charge, through a simple to use interface and command list.\n' +
                `**[Invite](https://discord.com/oauth2/authorize?client_id=${this.container.client.user.id}&permissions=279176399936&scope=bot%20applications.commands)** | **[GitHub](https://github.com/thaddeuskkr/Kana)** | **[Vote](https://top.gg/bot/${this.container.client.user.id}/vote)** on **[top.gg](https://top.gg/bot/${this.container.client.user.id})** | **[Support](https://discord.gg/w9MjahmXYv)** | Currently on **v${this.container.client.version}**`
            )
            .setColor('#cba6f7')
            .addFields([
                {
                    name: 'Platform support:',
                    value: 'Kana supports dozens of platforms, including via direct search and link resolving. Supported platforms include YouTube Music, YouTube, Spotify, Apple Music and much more!'
                },
                {
                    name: 'Playlists:',
                    value: 'Kana has an in-built playlist system that allows users to create playlists, add tracks and share playlists with other Kana users. No external URLs needed, all done through Discord.'
                },
                {
                    name: 'Free:',
                    value: 'Kana is, and always will be, completely free to use. No vote-locked commands, no paywalls, and no advertisements.'
                },
                {
                    name: 'Clean and modern:',
                    value: 'No premium subscriptions, and no advertisements in Kana\'s responses. Uses the latest Discord features, such as context menus, autocomplete, and slash commands / subcommands.'
                },
                {
                    name: 'Reliable:',
                    value: 'New features are tested before release on a seperate instance and Kana has minimal downtime.'
                },
                {
                    name: 'Open Source:',
                    value: 'Kana is fully open-source, allowing developers to contribute towards new features and improvements. Want to help out? Check out the [GitHub](https://github.com/thaddeuskkr/Kana)!'
                },
                {
                    name: 'WhatsApp:',
                    value: 'Kana has (experimental) WhatsApp integrations, meaning that most commands can be executed on WhatsApp as well as Discord with basically no latency. `/link` on Discord to get started!'
                }
            ]);
        const embed2 = new EmbedBuilder()
            .setTitle('Kana\'s Statistics')
            .setColor('#cba6f7')
            .setFooter({ text: 'Kana is made with ♡ by ' + owner.tag, iconURL: owner.displayAvatarURL({ dynamic: true, size: 4096 }) })
            .setImage('https://github.com/thaddeuskkr/Kana/blob/master/assets/kana-banner.png?raw=true')
            .addFields([
                {
                    name: 'Server count:',
                    value: String(this.container.client.guilds.cache.size),
                    inline: true
                },
                {
                    name: 'Uptime:',
                    value: ms(process.uptime() * 1000, { secondsDecimalDigits: 0 }),
                    inline: true
                },
                {
                    name: 'Active players:',
                    value: String(lavalinkStats.players),
                    inline: true
                },
                {
                    name: 'Total tracks played:',
                    value: String(stats.totalTracksPlayed),
                    inline: true
                },
                {
                    name: 'Total commands executed:',
                    value: String(stats.totalCommandsInvoked),
                    inline: true
                },
                {
                    name: 'Total play time:',
                    value: ms(stats.totalDuration, { secondsDecimalDigits: 0 }),
                    inline: true
                },
                {
                    name: 'Total uptime:',
                    value: ms(stats.totalUptime * 1000, { secondsDecimalDigits: 0 }),
                    inline: true
                },
                {
                    name: 'CPU load:',
                    value: `${Math.round((currentLoad.currentLoad + Number.EPSILON) * 100) / 100}%`,
                    inline: true
                },
                {
                    name: 'Memory usage:',
                    value: `${Math.round((memory.used / (1024 * 1024 * 1024)) * 100) / 100} GB / ${Math.round((memory.total / (1024 * 1024 * 1024)) * 100) / 100} GB`,
                    inline: true
                }
            ]);
        return interaction.editReply({ embeds: [embed1, embed2] });
    }

    async whatsappRun({ msg }) {
        const owner = await this.container.client.users.fetch(this.container.config.ownerIds[0]);
        return msg.reply(
            '_*This command, on Discord, will show statistics of the bot. Please run this command on Discord instead to get the best possible experience.*_\n\n' + 
            'Kana is a free music Discord bot with WhatsApp integrations, made using node.js and discord.js, powered by Lavalink and the Sapphire Framework. Kana aims to provide music at the highest quality possible, fully free of charge, through a simple to use interface and command list.\n' +
            '*Invite:* https://kana.tkkr.one/invite\n' + 
            '*GitHub:* https://kana.tkkr.one/github\n' + 
            '*Vote on top.gg:* https://kana.tkkr.one/vote\n' + 
            '*Support:* https://kana.tkkr.one/discord\n' +
            `Currently running *v${this.container.client.version}*\n` +
            'Kana is made with ♡ by ' + owner.tag + '.'
        );
    }
}