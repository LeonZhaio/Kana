import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import tags from 'common-tags';

export class HelpCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'help',
            description: 'Shows you a list of Kana\'s commands.'
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) => 
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option
                        .setName('command')
                        .setDescription('The specific command you would like to get information about.')
                        .setRequired(false)
                )
                .setDMPermission(true)
        );
    }
    
    async chatInputRun(interaction) {
        const commands = this.container.stores.get('commands');
        const cmd = interaction.options.getString('command');
        const owner = await this.container.client.users.fetch(this.container.config.ownerIds[0]);
        const subcommand = cmd?.split(' ');
        if (subcommand?.length > 1) {
            const command = this.container.client.application.commands.cache.find((c) => 
                c.name === subcommand[0] && 
                c.options.find(o => o.name === subcommand[1]) && 
                ApplicationCommandOptionType[c.options.find(o => o.name === subcommand[1]).type] === 'Subcommand'
            );
            if (!command) return interaction.reply({ embeds: [this.container.util.embed('error', 'That subcommand does not exist.')], ephemeral: true });
            const scObj = command.options.find(o => o.name === subcommand[1]);
            const embed = new EmbedBuilder()
                .setColor('#cba6f7')
                .setAuthor({ name: this.container.client.user.tag + ' - Subcommand Information', iconURL: this.container.client.user.displayAvatarURL({ size: 4096 }), url: 'https://discord.com/oauth2/authorize?client_id=1060888178422202388&permissions=279176399936&scope=bot%20applications.commands' })
                .setFooter({ text: 'Made with ♡ by ' + owner.tag + ' • Thank you for using Kana.', iconURL: owner.displayAvatarURL({ dynamic: true, size: 4096 }) })
                .addFields(
                    {
                        name: 'Name:',
                        value: `</${command.name} ${scObj.name}:${command.id}> (\`${command.name} ${scObj.name}\`)`,
                        inline: true
                    },
                    {
                        name: 'Description:',
                        value: scObj.description,
                    },
                    {
                        name: 'Usage:',
                        value: '`' + `/${command.name} ${scObj.name}${scObj.options.length ? ' ' : ''}` + scObj.options.map((option) => `${option.required ? `<${option.name}>` : `[${option.name}]`}`).join(' ') + '`'
                    },
                    {
                        name: 'Options:',
                        value: scObj.options.length ? scObj.options.map((option) => `**\`${option.name}\` ${option.required ? '(Required) ' : ''} - ${ApplicationCommandOptionType[option.type]}:** ${option.description}${option.autocomplete ? ' (Supports autocomplete)' : ''}${option.choices ? ` (${option.choices.length} choices)` : ''}`).join('\n') : 'None'
                    }
                )
                .setDescription('**Note:** `<>` denotes a required argument, while `[]` denotes an optional argument.\nFor more information about a subcommand, use `/help [command + subcommand (space separated)]`.');
            return interaction.reply({ embeds: [embed] });
        }
        if (cmd) {
            const command = this.container.client.application.commands.cache.find((c) => c.name === cmd) || commands.find((c) => c.aliases.includes(cmd));
            if (!command) return interaction.reply({ embeds: [this.container.util.embed('error', 'That command does not exist.')], ephemeral: true });
            const embed = new EmbedBuilder()
                .setColor('#cba6f7')
                .setAuthor({ name: this.container.client.user.tag + ' - Command Information', iconURL: this.container.client.user.displayAvatarURL({ size: 4096 }), url: 'https://discord.com/oauth2/authorize?client_id=1060888178422202388&permissions=279176399936&scope=bot%20applications.commands' })
                .setFooter({ text: 'Made with ♡ by ' + owner.tag + ' • Thank you for using Kana.', iconURL: owner.displayAvatarURL({ dynamic: true, size: 4096 }) })
                .addFields(
                    {
                        name: 'Name:',
                        value: `</${command.name}:${command.id}> (\`${command.name}\`)`,
                        inline: true
                    },
                    {
                        name: 'ID:',
                        value: command.id,
                        inline: true
                    },
                    {
                        name: 'Server only:',
                        value: command.dmPermission ? 'No' : 'Yes',
                        inline: true
                    },
                    {
                        name: 'Description:',
                        value: command.description,
                    },
                    {
                        name: 'Usage:',
                        value: '`' + `/${command.name}${command.options.length ? ' ' : ''}` + command.options.map((option) => `${option.required ? `<${option.name}>` : `[${option.name}]`}`).join(' ') + '`'
                    },
                    {
                        name: 'Options:',
                        value: command.options.length ? command.options.map((option) => `**\`${option.name}\` ${option.required ? '(Required) ' : ''} - ${ApplicationCommandOptionType[option.type]}:** ${option.description}${option.autocomplete ? ' (Supports autocomplete)' : ''}${option.choices ? ` (${option.choices.length} choices)` : ''}`).join('\n') : 'None'
                    }
                )
                .setDescription(`**Note:** \`<>\` denotes a required argument, while \`[]\` denotes an optional argument.${command.options?.filter((o) => ApplicationCommandOptionType[o.type] === 'Subcommand').length > 0 ? `\nThis command has **subcommands**. To view more information about a subcommand, use \`/help ${command.name} [subcommand]\`.` : ''}`);
            return interaction.reply({ embeds: [embed] });
        }
        const slashDoc = new EmbedBuilder()
            .setColor('#cba6f7')
            .setAuthor({ name: this.container.client.user.tag + ' - Help', iconURL: this.container.client.user.displayAvatarURL({ size: 4096 }), url: 'https://discord.com/oauth2/authorize?client_id=1060888178422202388&permissions=279176399936&scope=bot%20applications.commands' })
            .setDescription(
                '**Kana uses Discord\'s new [Slash Commands](https://support.discord.com/hc/en-us/articles/1500000368501-Slash-Commands-FAQ).**\n' + 
                'This is a simple explanation as to how these work, in case you have no idea at all.\n\n' +
                '**The simplest way to use Kana is to use the *tab* key for command selection.**\n' +
                'For example (assuming you don\'t have other bots that use `/play`), you can type the following in order to play a track named *\'never gonna give you up\'*:\n' + 
                '`/play [TAB/SPACE] never gonna give you up [ENTER]`\n\n' +
                '**Slash commands come with *optional and required arguments*.**\n' +
                'For example, in `/play`, `query` is required, while `source` and `next` are optional. ' +
                'This means that the command will not run unless `query` is provided.\n\n' +
                '**Some of Kana\'s slash commands also have *autocomplete*.**\n' +
                'In the context of the `/play` command, this just allows you to search from the specific platform ' +
                'and play directly using your search result instead of searching externally. This can help when selecting specific versions of tracks, e.g. remixes.\n\n' +
                '**You do not *need* to use the autocomplete feature on Kana.**\n' +
                'Do take note that in the `/play` command and related ones, using autocomplete is *not required* to get a search result. Kana will still search normally if you don\'t select an option from the autocomplete menu, and will select the first result.\n\n' + 
                '**Kana uses *subcommands* for the `/playlist` command.**\n' +
                'Subcommands are a way to categorise commands. If you type `/playlist`, you will see a list of subcommands related to playlist management. ' +
                'These work the same ways that normal commands do, and have the same features.\n\n' +
                '*This should be everything that you need to know to use Kana.\nNeed more help? Join the [support server](https://discord.gg/w9MjahmXYv)!*'
            );
        const musicCommands = [];
        const infoCommands = [];
        const utilCommands = [];
        const musicStore = commands.filter((c) => c.fullCategory.includes('music')).map(c => c.name);
        const infoStore = commands.filter((c) => c.fullCategory.includes('info')).map(c => c.name);
        const utilStore = commands.filter((c) => c.fullCategory.includes('util')).map(c => c.name); 
        for (const cmd in musicStore) {
            const djsCommand = this.container.client.application.commands.cache.find(c => c.name === musicStore[cmd]);
            const subs = djsCommand.options.filter(o => ApplicationCommandOptionType[o.type] === 'Subcommand');
            if (subs.length > 0) { 
                for (let i = 0; i < subs.length; i++) {
                    const mention = `</${djsCommand.name} ${subs[i].name}:${djsCommand.id}>`;
                    musicCommands.push(mention);
                }
            } else {
                const mention = `</${djsCommand.name}:${djsCommand.id}>`;
                musicCommands.push(mention);
            }
        }
        for (const cmd in infoStore) {
            const djsCommand = this.container.client.application.commands.cache.find(c => c.name === infoStore[cmd]);
            const subs = djsCommand.options.filter(o => ApplicationCommandOptionType[o.type] === 'Subcommand');
            if (subs.length > 0) { 
                for (let i = 0; i < subs.length; i++) {
                    const mention = `</${djsCommand.name} ${subs[i].name}:${djsCommand.id}>`;
                    infoCommands.push(mention);
                }
            } else {
                const mention = `</${djsCommand.name}:${djsCommand.id}>`;
                infoCommands.push(mention);
            }
        }
        for (const cmd in utilStore) {
            const djsCommand = this.container.client.application.commands.cache.find(c => c.name === utilStore[cmd]);
            const subs = djsCommand.options.filter(o => ApplicationCommandOptionType[o.type] === 'Subcommand');
            if (subs.length > 0) { 
                for (let i = 0; i < subs.length; i++) {
                    const mention = `</${djsCommand.name} ${subs[i].name}:${djsCommand.id}>`;
                    utilCommands.push(mention);
                }
            } else {
                const mention = `</${djsCommand.name}:${djsCommand.id}>`;
                utilCommands.push(mention);
            }
        }
        const commandList = new EmbedBuilder()
            .setColor('#cba6f7')
            .setFooter({ text: 'Made with ♡ by ' + owner.tag + ' • Thank you for using Kana.', iconURL: owner.displayAvatarURL({ dynamic: true, size: 4096 }) })
            .setDescription('**This is a list of Kana\'s commands and subcommands. To get additional information about a command, use `/help [command]`. Click on a command to fill it into your chat input box.**')
            .addFields(
                {
                    name: 'Music',
                    value: musicCommands.join(', ') || 'None'
                },
                {
                    name: 'Informative',
                    value: infoCommands.join(', ') || 'None'
                },
                {
                    name: 'Utility',
                    value: utilCommands.join(', ') || 'None'
                }
            );
        await interaction.reply({ embeds: [slashDoc, commandList] });
        /*
        await interaction.reply(
            tags.stripIndents`**__Kana's commands:__**
            **Music:**
            \`${commands.filter((command) => command.fullCategory.includes('music') && command.chatInputRun).map((command) => command.name).join('`, `')}\`
            **Info:**
            \`${commands.filter((command) => command.fullCategory.includes('info') && command.chatInputRun).map((command) => command.name).join('`, `')}\`
            **Utility:**
            \`${commands.filter((command) => command.fullCategory.includes('bot') && command.chatInputRun).map((command) => command.name).join('`, `')}\`
            \nFor more information regarding Kana, type \`/info\`.`
        );
        */
    }

    async whatsappRun ({ msg, args, author }) {
        const command = args.join(' ').toLowerCase().trim();
        const commands = this.container.stores.get('commands');
        if (command) {
            const cmd = commands.get(command) || commands.find((c) => c.aliases.includes(command));
            if (cmd) {
                await msg.reply(
                    tags.stripIndents`*Command: ${cmd.name}*
                    *Description:* ${cmd.whatsappDescription || cmd.description}
                    *Aliases:* ${cmd.aliases.join(', ')}
                    *Category:* ${cmd.fullCategory.join(' > ')}
                    `
                );
            } else {
                await msg.reply('Command not found.');
            }
        } else {
            await msg.reply(
                tags.stripIndents`*Kana's commands:*
                *Music:* \n\`\`\`${commands.filter((command) => command.fullCategory.includes('music') && command.whatsappRun).map((command) => command.name).join(', ')}\`\`\`
                *Info:* \n\`\`\`${commands.filter((command) => command.fullCategory.includes('info') && command.whatsappRun).map((command) => command.name).join(', ')}\`\`\`
                *Utility:* \n\`\`\`${commands.filter((command) => command.fullCategory.includes('utility') && command.whatsappRun).map((command) => command.name).join(', ')}\`\`\`${this.container.config.ownerIds.includes(author) ? `\n*Owner:* \n\`\`\`${commands.filter((command) => command.fullCategory.includes('owner') && command.whatsappRun).map((command) => command.name).join(', ')}\`\`\`` : ''}
                \nFor more information on a command, type \`\`\`/help <command>\`\`\`.`
            );
        }
    }
}
