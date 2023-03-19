import { Command } from '@sapphire/framework';

export class StopCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'stop',
            description: 'Stops the music in your server.',
            aliases: ['st'],
            preconditions: ['voice', 'sameVoice', 'dispatcher']
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) => 
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(false)
        );
    }
    
    async chatInputRun(interaction) {
        await interaction.deferReply();
        const dispatcher = this.container.queue.get(interaction.guildId);
        if (dispatcher.queue) dispatcher.queue.length = 0;
        dispatcher.repeat = 'off';
        dispatcher.stopped = true;
        dispatcher.player.stopTrack();
        await interaction.guild.members.me.voice.disconnect().catch(() => null);
        await dispatcher.destroy().catch(() => null);
        await interaction.editReply({ embeds: [this.container.util.embed('success', 'Stopped the player.')] });
    }

    async whatsappRun({ msg, dispatcher, sameVoice, voice, discordUser }) {
        if (!discordUser) return await msg.reply('You are not linked to a Discord account. Use ```/link``` to link your WhatsApp account to your Discord account.');
        if (voice === false) return await msg.reply('You are not in a voice channel.');
        if (sameVoice === false) return await msg.reply('You are not in the same voice channel as the bot.');
        if (!dispatcher) return await msg.reply('There is nothing playing.');
        if (dispatcher.queue) dispatcher.queue.length = 0;
        dispatcher.repeat = 'off';
        dispatcher.stopped = true;
        dispatcher.player.stopTrack();
        await dispatcher.guild.members.me.voice.disconnect().catch(() => null);
        await dispatcher.destroy().catch(() => null);
        await msg.reply('Stopped the player.');
    }
}
