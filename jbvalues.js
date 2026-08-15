const { EXCLUDE_DUPED } = require('./config');

let itemValueCache = null;
let itemValueCacheTime = 0;
const ITEM_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getItemValues() {
  const now = Date.now();
  if (itemValueCache && now - itemValueCacheTime < ITEM_CACHE_TTL_MS) {
    return itemValueCache;
  }

  const res = await fetch('https://api.jbvalues.com/v1/items');
  if (!res.ok) throw new Error(`Failed to fetch item values: ${res.status}`);
  const data = await res.json();

  // NOTE: confirm this matches the real response shape — log `data` once if values look off.
  const lookup = {};
  for (const item of Object.values(data)) {
    if (item.gameId) lookup[item.gameId] = item.value ?? 0;
  }

  itemValueCache = lookup;
  itemValueCacheTime = now;
  return lookup;
}

async function resolveRobloxId(username) {
  const res = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
  });
  if (!res.ok) throw new Error(`Roblox username lookup failed: ${res.status}`);
  const data = await res.json();
  if (!data.data || data.data.length === 0) {
    throw new Error(`No Roblox user found for username "${username}"`);
  }
  return { id: data.data[0].id, username: data.data[0].name };
}

async function getInventoryValue(robloxId) {
  const invRes = await fetch(`https://api.jbvalues.com/v1/inventory/${robloxId}`);
  if (!invRes.ok) throw new Error(`Failed to fetch inventory: ${invRes.status}`);
  const invData = await invRes.json();
  const items = Object.values(invData.inventory || {});

  const valueTable = await getItemValues();

  let total = 0;
  let itemCount = 0;
  for (const item of items) {
    if (EXCLUDE_DUPED && item.duped) continue;
    total += valueTable[item.gameId] ?? 0;
    itemCount += 1;
  }

  return { value: total, itemCount };
}

// Convenience: username -> full value lookup in one call
async function fetchInventoryValueByUsername(username) {
  const { id, username: canonicalUsername } = await resolveRobloxId(username);
  const { value, itemCount } = await getInventoryValue(id);
  return { robloxId: id, robloxUsername: canonicalUsername, value, itemCount };
}

module.exports = {
  getItemValues,
  resolveRobloxId,
  getInventoryValue,
  fetchInventoryValueByUsername,
};
