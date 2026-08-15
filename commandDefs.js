const { SlashCommandBuilder } = require('discord.js');

module.exports = [
  new SlashCommandBuilder()
    .setName('check')
    .setDescription("Check a player's Jailbreak inventory value")
    .addStringOption(opt =>
      opt.setName('roblox_username').setDescription('The Roblox username to check').setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify a member and assign their net worth role (Admin+ only)')
    .addUserOption(opt =>
      opt.setName('discord_user').setDescription('Discord user to verify').setRequired(true))
    .addStringOption(opt =>
      opt.setName('roblox_username').setDescription('Their Roblox username').setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Display or update the inventory leaderboard (Staff only)')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion for an item price change')
    .addStringOption(opt =>
      opt.setName('title').setDescription('Suggestion title').setRequired(true))
    .addStringOption(opt =>
      opt.setName('url').setDescription('Link/evidence for the suggestion').setRequired(true))
    .addStringOption(opt =>
      opt.setName('vote').setDescription('What should change (e.g. raise/lower value)').setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('inventoryticket')
    .setDescription('Create an inventory ticket panel (Staff only)')
    .addStringOption(opt =>
      opt.setName('note').setDescription('Optional note to add above the panel').setRequired(false))
    .toJSON(),
];
