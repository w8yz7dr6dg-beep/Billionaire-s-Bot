const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  AttachmentBuilder,
} = require('discord.js');
require('dotenv').config();

const config = require('./config');
const commands = require('./commandDefs');
const { fetchInventoryValueByUsername } = require('./jbvalues');
const { upsertVerified, getAllVerified, getVerifiedByDiscordId } = require('./db');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// In-memory cache of computed leaderboard pages, keyed by a random id embedded in button customIds.
// Data is only kept for the lifetime of the process — fine since /leaderboard is manual/on-demand.
const leaderboardCache = new Map();

function hasAnyRole(member, roleIds) {
  return roleIds.some(id => id && id !== 'REPLACE_ME' && member.roles.cache.has(id));
}

function formatValue(n) {
  return n.toLocaleString();
}

function tierForValue(value) {
  let matched = null;
  for (const tier of config.NET_WORTH_TIERS) {
    if (value >= tier.threshold) matched = tier;
  }
  return matched;
}

// ---------- /check ----------
async function handleCheck(interaction) {
  const username = interaction.options.getString('roblox_username');
  await interaction.deferReply();
  try {
    const { robloxUsername, value, itemCount } = await fetchInventoryValueByUsername(username);
    const embed = new EmbedBuilder()
      .setTitle(`${robloxUsername}'s Inventory`)
      .addFields(
        { name: 'Total Value', value: `${formatValue(value)} 💵`, inline: true },
        { name: 'Item Count', value: `${itemCount}`, inline: true },
      )
      .setColor(0x2ecc71)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`Couldn't look that up: ${err.message}`);
  }
}

// ---------- /verify ----------
async function handleVerify(interaction) {
  if (!hasAnyRole(interaction.member, config.ADMIN_ROLE_IDS)) {
    return interaction.reply({ content: "You don't have permission to use this.", ephemeral: true });
  }

  const discordUser = interaction.options.getUser('discord_user');
  const robloxUsername = interaction.options.getString('roblox_username');

  await interaction.deferReply();
  try {
    const { robloxId, robloxUsername: canonicalUsername, value } =
      await fetchInventoryValueByUsername(robloxUsername);

    upsertVerified.run({
      discord_id: discordUser.id,
      roblox_id: String(robloxId),
      roblox_username: canonicalUsername,
      last_value: value,
      last_checked: Date.now(),
    });

    const tier = tierForValue(value);
    const guildMember = await interaction.guild.members.fetch(discordUser.id);

    // Remove any other tier roles, then add the matched one.
    const allTierRoleIds = config.NET_WORTH_TIERS.map(t => t.roleId).filter(id => id !== 'REPLACE_ME');
    const rolesToRemove = guildMember.roles.cache.filter(r => allTierRoleIds.includes(r.id));
    if (rolesToRemove.size > 0) {
      await guildMember.roles.remove(rolesToRemove);
    }
    if (tier && tier.roleId !== 'REPLACE_ME') {
      await guildMember.roles.add(tier.roleId);
    }

    const embed = new EmbedBuilder()
      .setTitle('Verification Complete')
      .setDescription(`${discordUser} linked to \`${canonicalUsername}\``)
      .addFields(
        { name: 'Net Worth', value: `${formatValue(value)} 💵`, inline: true },
        { name: 'Role Assigned', value: tier ? `<@&${tier.roleId}>` : 'Below lowest tier', inline: true },
      )
      .setColor(0xf1c40f);

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`Verification failed: ${err.message}`);
  }
}

// ---------- /leaderboard ----------
function buildLeaderboardEmbed(entries, page, totalValue) {
  const pageSize = config.LEADERBOARD_PAGE_SIZE;
  const start = page * pageSize;
  const pageEntries = entries.slice(start, start + pageSize);

  const lines = pageEntries.map((e, i) =>
    `**#${start + i + 1}** <@${e.discord_id}> — ${formatValue(e.last_value)} 💵`
  );

  return new EmbedBuilder()
    .setTitle('🏆 Server Leaderboard')
    .addFields({ name: 'Total Value', value: `${formatValue(totalValue)} 💵` })
    .setDescription(lines.join('\n') || 'No verified users yet.')
    .setColor(0xf1c40f)
    .setFooter({ text: `Page ${page + 1} of ${Math.max(1, Math.ceil(entries.length / pageSize))}` })
    .setTimestamp();
}

function buildLeaderboardButtons(cacheKey, page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lb_${cacheKey}_${page - 1}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`lb_${cacheKey}_${page + 1}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page + 1 >= totalPages),
  );
}

async function handleLeaderboard(interaction) {
  if (!hasAnyRole(interaction.member, config.STAFF_ROLE_IDS)) {
    return interaction.reply({ content: "You don't have permission to use this.", ephemeral: true });
  }

  await interaction.deferReply();

  const verifiedUsers = getAllVerified.all();
  const entries = [...verifiedUsers].sort((a, b) => b.last_value - a.last_value);
  const totalValue = entries.reduce((sum, e) => sum + e.last_value, 0);

  const cacheKey = `${interaction.id}`;
  leaderboardCache.set(cacheKey, { entries, totalValue, createdAt: Date.now() });

  const totalPages = Math.max(1, Math.ceil(entries.length / config.LEADERBOARD_PAGE_SIZE));
  const embed = buildLeaderboardEmbed(entries, 0, totalValue);
  const row = buildLeaderboardButtons(cacheKey, 0, totalPages);

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleLeaderboardButton(interaction) {
  const [, cacheKey, pageStr] = interaction.customId.split('_');
  const page = parseInt(pageStr, 10);
  const cached = leaderboardCache.get(cacheKey);

  if (!cached) {
    return interaction.reply({
      content: 'This leaderboard view has expired — run `/leaderboard` again.',
      ephemeral: true,
    });
  }

  const totalPages = Math.max(1, Math.ceil(cached.entries.length / config.LEADERBOARD_PAGE_SIZE));
  const embed = buildLeaderboardEmbed(cached.entries, page, cached.totalValue);
  const row = buildLeaderboardButtons(cacheKey, page, totalPages);

  // Ephemeral reply — only the clicker sees this page, regardless of who ran /leaderboard originally.
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ---------- /suggest ----------
async function handleSuggest(interaction) {
  const title = interaction.options.getString('title');
  const url = interaction.options.getString('url');
  const vote = interaction.options.getString('vote');

  const embed = new EmbedBuilder()
    .setTitle(title)
    .addFields(
      { name: 'Link', value: url },
      { name: 'Suggested Change', value: vote },
    )
    .setColor(0x3498db)
    .setTimestamp();

  const suggestionsChannel = await interaction.client.channels.fetch(config.SUGGESTIONS_CHANNEL_ID);
  await suggestionsChannel.send({ embeds: [embed] });

  if (config.SUGGESTIONS_LOG_CHANNEL_ID !== 'REPLACE_ME') {
    const logChannel = await interaction.client.channels.fetch(config.SUGGESTIONS_LOG_CHANNEL_ID);
    await logChannel.send(
      `📝 ${interaction.user.tag} (${interaction.user.id}) submitted a suggestion: "${title}"`
    );
  }

  await interaction.reply({ content: 'Your suggestion has been submitted!', ephemeral: true });
}

// ---------- /inventoryticket ----------
async function handleInventoryTicket(interaction) {
  if (!hasAnyRole(interaction.member, config.STAFF_ROLE_IDS)) {
    return interaction.reply({ content: "You don't have permission to use this.", ephemeral: true });
  }

  const note = interaction.options.getString('note');
  const panel = config.TICKET_PANEL;

  const embed = new EmbedBuilder()
    .setTitle(`${panel.emoji} ${panel.title}`)
    .setDescription(panel.description)
    .setThumbnail('attachment://banner.png')
    .setFooter({ text: panel.footer })
    .setColor(0x3498db);

  const bannerAttachment = new AttachmentBuilder(panel.thumbnailUrl, { name: 'banner.png' });

  const rows = [];
  let currentRow = new ActionRowBuilder();

  panel.products.forEach((product, i) => {
    embed.addFields({
      name: `${product.name} — ${product.badge}`,
      value: `Price: ${formatValue(product.price)} 💵`,
    });

    if (currentRow.components.length === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`buyticket_${i}`)
        .setLabel(`Buy ${product.badge}`)
        .setStyle(ButtonStyle.Success)
    );
  });
  if (currentRow.components.length > 0) rows.push(currentRow);

  if (note) await interaction.channel.send(note);
  await interaction.channel.send({ embeds: [embed], components: rows, files: [bannerAttachment] });
  await interaction.reply({ content: 'Panel posted.', ephemeral: true });
}

async function handleBuyButton(interaction) {
  const index = parseInt(interaction.customId.split('_')[1], 10);
  const product = config.TICKET_PANEL.products[index];
  if (!product) {
    return interaction.reply({ content: 'That product no longer exists.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const channelName = `ticket-${interaction.user.username}`.toLowerCase().slice(0, 90);
  const ticketChannel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.TICKET_CATEGORY_ID,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ...config.STAFF_ROLE_IDS
        .filter(id => id !== 'REPLACE_ME')
        .map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] })),
    ],
  });

  const embed = new EmbedBuilder()
    .setTitle(`${product.name} — ${product.badge}`)
    .setDescription(`${interaction.user} wants to purchase this for ${formatValue(product.price)} 💵.\nStaff will assist shortly.`)
    .setColor(0x2ecc71);

  await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed] });
  await interaction.editReply(`Ticket created: ${ticketChannel}`);
}

// ---------- REGISTER + CLIENT ----------
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log('Slash commands registered.');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case 'check': return handleCheck(interaction);
        case 'verify': return handleVerify(interaction);
        case 'leaderboard': return handleLeaderboard(interaction);
        case 'suggest': return handleSuggest(interaction);
        case 'inventoryticket': return handleInventoryTicket(interaction);
      }
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('lb_')) return handleLeaderboardButton(interaction);
      if (interaction.customId.startsWith('buyticket_')) return handleBuyButton(interaction);
    }
  } catch (err) {
    console.error(err);
    const payload = { content: `Something went wrong: ${err.message}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

registerCommands().then(() => client.login(TOKEN));
