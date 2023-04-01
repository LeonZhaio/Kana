import { Subcommand } from '@sapphire/plugin-subcommands';

export class FilterCommand extends Subcommand {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'filter',
            description: 'Apply/remove filters to/from the currently playing track. Slightly impacts audio quality.',
            subcommands: [
                {
                    name: '8d',
                    chatInputRun: 'rotationFilter'
                },
                {
                    name: 'bassboost',
                    chatInputRun: 'bassboostFilter'
                }
            ],
            preconditions: ['voice', 'sameVoice', 'dispatcher']
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
                        .setName('8d')
                        .setDescription('Toggles the 8D audio filter.')
                        .addStringOption((option) => 
                            option
                                .setName('frequency')
                                .setDescription('Frequency in Hz of audio rotation. Accepts a number from 0.1 to 1, defaults to 0.2.')
                                .setRequired(false)
                        )
                )
                .addSubcommand((command) =>
                    command
                        .setName('bassboost')
                        .setDescription('Toggles the bass boost audio filter.')
                        .addIntegerOption((option) =>
                            option
                                .setName('level')
                                .setDescription('Bass boost level. Accepts an integer from 0 to 5, defaults to 2.')
                                .setRequired(false)
                        )
                );
        });
    }

    async rotationFilter(interaction) {
        const frequency = interaction.options.getString('frequency') || '0.2';
        const dispatcher = this.container.queue.get(interaction.guildId);
        const filters = dispatcher.player.filters;
        if (!Number(frequency) || Number(frequency) < 0.1 || Number(frequency) > 1) {
            return interaction.reply({ embeds: [this.container.util.embed('error', 'Frequency must be a number from 0.1 to 1.')], ephemeral: true });
        }
        if (filters.rotation == null || (filters.rotation.rotationHz != Number(frequency) && interaction.options.getString('frequency'))) {
            dispatcher.player.setRotation({ rotationHz: Number(frequency) });
            await interaction.reply({ embeds: [this.container.util.embed('loading', `Enabling the **8D** filter (${frequency} Hz)...`)] });
            await FilterCommand.wait(5000);
            await interaction.editReply({ embeds: [this.container.util.embed('success', `Enabled the **8D** filter (${frequency} Hz).`)] });
        } else if (filters.rotation != null) {
            dispatcher.player.setRotation();
            await interaction.reply({ embeds: [this.container.util.embed('loading', 'Disabling the **8D** filter...')] });
            await FilterCommand.wait(5000);
            await interaction.editReply({ embeds: [this.container.util.embed('success', 'Disabled the **8D** filter.')] });
        }
    }

    async bassboostFilter(interaction) {
        const level = interaction.options.getInteger('level') || 2;
        const dispatcher = this.container.queue.get(interaction.guildId);
        const bassboostLevels = [
            [], // Level 0 (no bassboost)
            [ // Level 1
                { band: 0, gain: 0.15 },  // 60Hz
            ],
            [ // Level 2
                { band: 0, gain: 0.25 },  // 60Hz
                { band: 1, gain: 0.3 },   // 230Hz
            ],
            [ // Level 3
                { band: 0, gain: 0.35 },  // 60Hz
                { band: 1, gain: 0.4 },   // 230Hz
                { band: 2, gain: 0.5 },   // 910Hz
            ],
            [ // Level 4
                { band: 0, gain: 0.45 },  // 60Hz
                { band: 1, gain: 0.5 },   // 230Hz
                { band: 2, gain: 0.6 },   // 910Hz
                { band: 3, gain: 0.7 },   // 3.6kHz
            ],
            [ // Level 5 (maximum bassboost)
                { band: 0, gain: 0.55 },  // 60Hz
                { band: 1, gain: 0.6 },   // 230Hz
                { band: 2, gain: 0.7 },   // 910Hz
                { band: 3, gain: 0.8 },   // 3.6kHz
                { band: 4, gain: 0.9 },   // 14kHz
            ],
        ];
          
        if (interaction.options.getInteger('level') == 0) {
            dispatcher.player.setEqualizer();
            delete dispatcher.player.filters.bassboost;
            await interaction.reply({ embeds: [this.container.util.embed('loading', 'Disabling the **bass boost** filter...')] });
            await FilterCommand.wait(5000);
            await interaction.editReply({ embeds: [this.container.util.embed('success', 'Disabled the **bass boost** filter.')] });
        } else if (dispatcher.player.filters.bassboost == undefined || (dispatcher.player.filters.bassboost != level && interaction.options.getInteger('level'))) {
            dispatcher.player.setEqualizer(bassboostLevels[level]);
            dispatcher.player.filters.bassboost = level;
            await interaction.reply({ embeds: [this.container.util.embed('loading', `Enabling the **bass boost** filter (Intensity level ${level})...`)] });
            await FilterCommand.wait(5000);
            await interaction.editReply({ embeds: [this.container.util.embed('success', `Enabled the **bass boost** filter (Intensity level ${level}).`)] });
        } else if (!interaction.options.getInteger('level') && dispatcher.player.filters.bassboost != undefined) {
            dispatcher.player.setEqualizer();
            delete dispatcher.player.filters.bassboost;
            await interaction.reply({ embeds: [this.container.util.embed('loading', 'Disabling the **bass boost** filter...')] });
            await FilterCommand.wait(5000);
            await interaction.editReply({ embeds: [this.container.util.embed('success', 'Disabled the **bass boost** filter.')] });
        }
    }

    static wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}