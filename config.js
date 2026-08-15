module.exports = {
  // ---- Roles allowed to run gated commands ----
  // Co-Owner, Head Admin, and Admin can all use /verify and the other admin-gated commands.
  ADMIN_ROLE_IDS: ['1424194856464683049', '1424158210801143975', '1424157907074682940'],
  // Staff — used for /leaderboard and /inventoryticket.
  STAFF_ROLE_IDS: ['1366100605214527641'],

  // ---- Channels / categories ----
  TICKET_CATEGORY_ID: '1500563049130496051',
  STAFF_LOG_CHANNEL_ID: '1500229762856255560', // where /leaderboard posts; also reused for staff-only logs unless you want a separate one
  SUGGESTIONS_CHANNEL_ID: '1502072392393166859',
  SUGGESTIONS_LOG_CHANNEL_ID: '1515504284601553017', // staff channel that logs who ran /suggest

  // ---- Net worth role tiers for /verify ----
  // Sorted ascending. The bot assigns the HIGHEST tier the user's total value qualifies for,
  // and removes any other tier roles they previously held.
  NET_WORTH_TIERS: [
    { threshold: 1_000_000_000, roleId: '1320835007526211594' },   // 1B
    { threshold: 1_500_000_000, roleId: '1320832633969709264' },   // 1.5B
    { threshold: 2_000_000_000, roleId: '1320833293700042783' },   // 2B
    { threshold: 2_500_000_000, roleId: '1320833692800913520' },   // 2.5B
    { threshold: 3_000_000_000, roleId: '1377565866006286356' },   // 3B
    { threshold: 3_500_000_000, roleId: '1377567376211574814' },   // 3.5B
    { threshold: 4_000_000_000, roleId: '1377567480033181797' },   // 4B
    { threshold: 4_500_000_000, roleId: '1377567592134217748' },   // 4.5B
    { threshold: 5_000_000_000, roleId: '1320844122717818973' },   // 5B
    { threshold: 7_500_000_000, roleId: '1321881883709018112' },   // 7.5B
    { threshold: 10_000_000_000, roleId: '1417221245673668639' },  // 10B
    { threshold: 12_500_000_000, roleId: '1417221382965694544' },  // 12.5B
    { threshold: 15_000_000_000, roleId: '1417221467476725831' },  // 15B
    { threshold: 17_500_000_000, roleId: '1417221547050926242' },  // 17.5B
    { threshold: 20_000_000_000, roleId: '1417221598112514048' },  // 20B
  ],

  // ---- /inventoryticket panel content ----
  // Edit freely — this drives what gets rendered and what each Buy button charges.
  TICKET_PANEL: {
    emoji: '💎',
    title: 'Premium Access',
    description:
      'Experience access to exclusive features, important information, and valuable features that will help you become even richer. Unlock premium today!',
    thumbnailUrl: './assets/banner.png', // sent as an attachment, not fetched as a URL — see index.js
    footer: 'Powered by Billionaires',
    products: [
      { name: 'Premium', badge: 'LIFE TIME', badgeColor: 0xf1c40f, price: 50_000_000 },
      { name: 'Premium', badge: 'MONTHLY', badgeColor: 0xe91e63, price: 15_000_000 },
    ],
  },

  // Roblox items flagged duped are excluded from value totals by default.
  EXCLUDE_DUPED: true,

  // How many players per page on /leaderboard.
  LEADERBOARD_PAGE_SIZE: 5,
};
