const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionsBitField
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// ⚡ Token z environment proměnné
const TOKEN = process.env.TOKEN;

// Přesný název support role
const SUPPORT_ROLE_NAME = "「🔰」A-Team NOUZOVÝ Ping";

// Kategorie musí existovat na serveru
const ticketCategories = {
    stiznosti: "STÍŽNOSTI",
    frakce: "FRAKCE",
    vedeni: "VEDENÍ",
    spoluprace: "SPOLUPRÁCE",
    support: "SUPPORT"
};

client.once("ready", () => {
    console.log(`✅ Bot běží jako ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith("!")) return;

    if (message.content.toLowerCase() === "!ticket") {

        const embed = new EmbedBuilder()
            .setTitle("🎫 A-Team Ticket Systém")
            .setDescription(`
Vyber kategorii ticketu níže.

⚠️ Jeden otevřený ticket na osobu.
🔒 Ticket může zavřít pouze A-Team.
            `)
            .setColor("#2B2D31")
            .setThumbnail(message.guild.iconURL())
            .setFooter({ text: "A-Team Support System" })
            .setTimestamp();

        const menu = new StringSelectMenuBuilder()
            .setCustomId("ticket_select")
            .setPlaceholder("📂 Vyber kategorii")
            .addOptions([
                { label: "STÍŽNOSTI", value: "stiznosti", emoji: "⚠️" },
                { label: "FRAKCE", value: "frakce", emoji: "🏴" },
                { label: "VEDENÍ", value: "vedeni", emoji: "👑" },
                { label: "SPOLUPRÁCE", value: "spoluprace", emoji: "🤝" },
                { label: "SUPPORT", value: "support", emoji: "🛠️" }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.on("interactionCreate", async (interaction) => {

    // ===== VÝBĚR KATEGORIE =====
    if (interaction.isStringSelectMenu()) {

        if (interaction.customId !== "ticket_select") return;

        const selected = interaction.values[0];
        const categoryName = ticketCategories[selected];

        const guild = interaction.guild;
        const member = interaction.member;

        // Kontrola zda už uživatel nemá otevřený ticket
        const existing = guild.channels.cache.find(
            ch => ch.name === `ticket-${member.user.id}`
        );

        if (existing) {
            return interaction.reply({ content: "❌ Už máš otevřený ticket!", ephemeral: true });
        }

        const category = guild.channels.cache.find(
            c => c.type === ChannelType.GuildCategory && c.name === categoryName
        );

        const supportRole = guild.roles.cache.find(r => r.name === SUPPORT_ROLE_NAME);

        if (!category)
            return interaction.reply({ content: "❌ Kategorie neexistuje.", ephemeral: true });

        if (!supportRole)
            return interaction.reply({ content: "❌ Support role nebyla nalezena.", ephemeral: true });

        // Vytvoření ticket kanálu
        const channel = await guild.channels.create({
            name: `ticket-${member.user.id}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: member.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ],
                },
                {
                    id: supportRole.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ],
                },
            ],
        });

        // Tlačítko zavřít ticket
        const closeButton = new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Zavřít ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        const ticketEmbed = new EmbedBuilder()
            .setTitle(`🎫 ${categoryName} Ticket`)
            .setDescription(`
Dobrý den ${member},

popište prosím detailně svůj problém.
A-Team se vám brzy ozve.
            `)
            .setColor("#57F287")
            .setFooter({ text: "Použij tlačítko níže pro zavření ticketu." })
            .setTimestamp();

        await channel.send({
            content: `${member} ${supportRole}`,
            embeds: [ticketEmbed],
            components: [row]
        });

        await interaction.reply({
            content: `✅ Ticket vytvořen: ${channel}`,
            ephemeral: true
        });
    }

    // ===== ZAVŘENÍ TICKETU =====
    if (interaction.isButton()) {

        if (interaction.customId !== "close_ticket") return;

        if (!interaction.member.roles.cache.some(r => r.name === SUPPORT_ROLE_NAME)) {
            return interaction.reply({
                content: "❌ Ticket může zavřít pouze A-Team.",
                ephemeral: true
            });
        }

        await interaction.reply("🔒 Ticket se zavírá za 5 sekund...");

        setTimeout(() => {
            interaction.channel.delete();
        }, 5000);
    }
});

client.login(TOKEN);