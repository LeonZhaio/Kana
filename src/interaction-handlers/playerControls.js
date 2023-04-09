import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import prettyms from 'pretty-ms';

export class PlayerControlsHandler extends InteractionHandler {
    constructor(ctx, options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    parse(interaction) {
        const id = interaction.customId;
        if (
            id !== 'previous' && id !== 'playback' && id !== 'skip' && id !== 'stop' &&
            id !== 'shuffle' && id !== 'repeat' && id !== 'queue' && id !== 'lyrics'
        ) return this.none();
        return this.some();
    }

    async run(interaction) {
        const dispatcher = this.container.queue.get(interaction.guildId);
        switch (interaction.customId) {
        case 'previous':
            if (!dispatcher.previous.length) return await interaction.reply({ embeds: [this.container.util.embed('error', 'There is no previous track to return to.')], ephemeral: true });
            if (dispatcher.current.info.requester.id == interaction.user.id) await interaction.deferUpdate();
            else await interaction.reply({ embeds: [this.container.util.embed('success', `Returned to the previous track **${dispatcher.previous[0].info.title}** - **${dispatcher.previous[0].info.author}**${dispatcher.repeat === 'one' ? ' and turned off track repeat' : ''}. [${interaction.user.toString()}]`)] });
            var prev = dispatcher.previous.shift();
            dispatcher.previousUsed = true;
            if (dispatcher.repeat === 'one') dispatcher.repeat = 'off';
            dispatcher.queue.unshift(dispatcher.current);
            dispatcher.queue.unshift(prev);
            await dispatcher.player.stopTrack();
            break;
        case 'playback':
            if (dispatcher.player.paused) {
                await dispatcher.player.setPaused(false);
                await interaction.update({ embeds: [ this.container.util.embed('info', `${this.container.config.emojis.playing} [**${dispatcher.current.info.title}** - **${dispatcher.current.info.author}**](${dispatcher.current.info.uri}) \`${PlayerControlsHandler.humanizeTime(dispatcher.current.info.length)}\` (${dispatcher.current.info.requester.toString()})`, false) ] });
            } else {
                await dispatcher.player.setPaused(true);
                await interaction.update({ embeds: [ this.container.util.embed('info', `${this.container.config.emojis.playing} [**${dispatcher.current.info.title}** - **${dispatcher.current.info.author}**](${dispatcher.current.info.uri}) \`${PlayerControlsHandler.humanizeTime(dispatcher.current.info.length)}\` (${dispatcher.current.info.requester.toString()}) [Paused by ${interaction.user.toString()}]`, false) ] });
            }
            break;
        case 'skip':
            if (dispatcher.current.info.requester.id == interaction.user.id) await interaction.deferUpdate();
            else await interaction.reply({ embeds: [this.container.util.embed('success', `Skipped ${dispatcher.repeat === 'all' ? 'and removed ' : ''}**${dispatcher.current.info.title}** - **${dispatcher.current.info.author}**${dispatcher.repeat === 'one' ? ' and turned off track repeat' : ''}${dispatcher.repeat === 'all' ? ' from the queue' : ''}. [${interaction.user.toString()}]`)] });
            if (dispatcher.repeat === 'one') dispatcher.repeat = 'off';
            if (dispatcher.repeat === 'all') {
                dispatcher.current.skipped = true;
                await dispatcher.player.stopTrack();
                return;
            } else {
                dispatcher.player.stopTrack();
            }
            break;
        case 'stop':
            dispatcher.queue = [];
            if (dispatcher.queue) dispatcher.queue.length = 0;
            dispatcher.repeat = 'off';
            dispatcher.stopped = true;
            dispatcher.player.stopTrack();
            await interaction.reply({ embeds: [this.container.util.embed('success', `Stopped the player. [${interaction.user.toString()}]`)] });
            await interaction.guild.members.me.voice.disconnect().catch(() => null);
            await dispatcher.destroy().catch(() => null);
            break;
        case 'rewind':
            if (dispatcher.current.info.requester.id == interaction.user.id) await interaction.deferUpdate();
            else await interaction.reply({ embeds: [this.container.util.embed('success', `Restarted **${dispatcher.current.info.title}** - **${dispatcher.current.info.author}**. [${interaction.user.toString()}]`)] });
            dispatcher.player.seekTo(0);
            break;
        case 'shuffle':
            if (!dispatcher.queue.length) return interaction.reply({ embeds: [this.container.util.embed('error', 'There are no tracks in queue.')], ephemeral: true });
            dispatcher.queue = dispatcher.queue.sort(() => Math.random() - 0.5);
            if (dispatcher.current.info.requester.id == interaction.user.id) await interaction.reply({ embeds: [this.container.util.embed('success', `Shuffled **${dispatcher.queue.length} tracks**.`)], ephemeral: true });
            else await interaction.reply({ embeds: [this.container.util.embed('success', `Shuffled **${dispatcher.queue.length} tracks**. [${interaction.user.toString()}]`)] });
            break;
        case 'repeat':
            if (dispatcher.repeat === 'off') {
                dispatcher.repeat = 'one';
                await interaction.reply({ embeds: [this.container.util.embed('success', `Now looping the currently playing track. [${interaction.user.toString()}]`)] });
            } else if (dispatcher.repeat === 'one') {
                dispatcher.repeat = 'all';
                await interaction.reply({ embeds: [this.container.util.embed('success', `Now looping the whole queue. [${interaction.user.toString()}]`)] });
            } else if (dispatcher.repeat === 'all') {
                dispatcher.repeat = 'off';
                await interaction.reply({ embeds: [this.container.util.embed('success', `Disabled loop. [${interaction.user.toString()}]`)] });
            }
            break;
        case 'queue':
            var queueCommand = this.container.stores.get('commands').get('queue');
            queueCommand.chatInputRun(interaction);
            break;
        case 'lyrics':
            var lyricsCommand = this.container.stores.get('commands').get('lyrics');
            lyricsCommand.chatInputRun(interaction);
            break;
        }
    }

    static humanizeTime(ms) {
        return prettyms(ms, { colonNotation: true, secondsDecimalDigits: 0 });
    }
}