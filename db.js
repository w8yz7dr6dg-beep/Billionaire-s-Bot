const Database = require('better-sqlite3');
const db = new Database('billionaires.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS verified (
    discord_id TEXT PRIMARY KEY,
    roblox_id TEXT NOT NULL,
    roblox_username TEXT NOT NULL,
    last_value INTEGER DEFAULT 0,
    last_checked INTEGER DEFAULT 0
  )
`);

const upsertVerified = db.prepare(`
  INSERT INTO verified (discord_id, roblox_id, roblox_username, last_value, last_checked)
  VALUES (@discord_id, @roblox_id, @roblox_username, @last_value, @last_checked)
  ON CONFLICT(discord_id) DO UPDATE SET
    roblox_id = excluded.roblox_id,
    roblox_username = excluded.roblox_username,
    last_value = excluded.last_value,
    last_checked = excluded.last_checked
`);

const getAllVerified = db.prepare(`SELECT * FROM verified`);
const getVerifiedByDiscordId = db.prepare(`SELECT * FROM verified WHERE discord_id = ?`);

module.exports = { db, upsertVerified, getAllVerified, getVerifiedByDiscordId };
