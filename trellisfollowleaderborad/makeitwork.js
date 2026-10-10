/**
 * Trellis Follower Leaderboard Scraper
 * 
 * Fetches users 1-300 from trellis.consciousb.one, extracts follower counts,
 * avatars, and usernames, then outputs a ranked leaderboard.
 * 
 * Usage (Node.js 18+):
 *   node trellis-leaderboard.js
 * 
 * Usage (Browser console):
 *   Paste into console on any page (CORS may block; use a proxy or run in Node).
 */

const BASE_USER_URL = 'https://trellis.consciousb.one/web/user.php?id=';
const AVATAR_BASE = 'https://trellis.consciousb.one/dynamic/avatars/avatar_';
const MIN_ID = 1;
const MAX_ID = 300;
const MAX_FOLLOWERS = 9999;
const CONCURRENT_LIMIT = 15;
const REQUEST_TIMEOUT_MS = 10000;
const RETRY_ATTEMPTS = 2;

// ---------- Utilities ----------

/**
 * Fetch with timeout and retry support.
 */
async function fetchWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'text/html' }
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a URL with retries on failure.
 */
async function fetchWithRetry(url, attempts = RETRY_ATTEMPTS) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchWithTimeout(url);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

/**
 * Extract username from profile HTML.
 */
function extractUsername(html, fallbackId) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const selectors = [
    'h1', 'h2', '.username', '.user-name', '.profile-username',
    '[class*="username"]', '[class*="user-name"]'
  ];
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    if (el && el.textContent.trim() && el.textContent.trim().length < 60) {
      return el.textContent.trim();
    }
  }

  // Look for bold text that isn't a number
  for (const b of doc.querySelectorAll('b, strong')) {
    const txt = b.textContent.trim();
    if (txt && !/^\d+$/.test(txt) && txt.length > 1 && txt.length < 50) {
      return txt;
    }
  }

  // Fall back to <title>
  const title = doc.querySelector('title');
  if (title) {
    const parts = title.textContent.split(/[·\-|]/);
    for (const part of parts) {
      const p = part.trim();
      if (p && p !== 'Trellis' && !p.toLowerCase().includes('user not found')) {
        return p;
      }
    }
  }

  return `user_${fallbackId}`;
}

/**
 * Extract follower count from the specific anchor pattern.
 * Looks for: <a href="#followersModal" ...><b>(number)</b> followers</a>
 */
function extractFollowerCount(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Primary: exact selector
  const anchors = doc.querySelectorAll('a[href="#followersModal"]');
  for (const a of anchors) {
    if (!a.textContent.toLowerCase().includes('follower')) continue;
    const bold = a.querySelector('b');
    if (bold) {
      const num = parseInt(bold.textContent.trim().replace(/,/g, ''), 10);
      if (!isNaN(num)) return num;
    }
    // Try any number in the anchor text
    const m = a.textContent.match(/(\d[\d,]*)/);
    if (m) {
      const num = parseInt(m[1].replace(/,/g, ''), 10);
      if (!isNaN(num)) return num;
    }
  }

  // Fallback: regex on body text
  const bodyText = doc.body?.textContent || '';
  const match = bodyText.match(/(\d[\d,]*)\s*followers?/i);
  if (match) {
    const num = parseInt(match[1].replace(/,/g, ''), 10);
    if (!isNaN(num)) return num;
  }

  return null;
}

/**
 * Extract avatar URL matching the pattern /dynamic/avatars/avatar_{id}*
 */
function extractAvatarUrl(html, userId) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  for (const img of doc.querySelectorAll('img')) {
    const src = img.getAttribute('src') || '';
    if (src.includes('/dynamic/avatars/avatar_')) {
      // Normalize to absolute URL
      if (src.startsWith('http')) return src;
      if (src.startsWith('//')) return 'https:' + src;
      if (src.startsWith('/')) return 'https://trellis.consciousb.one' + src;
      return 'https://trellis.consciousb.one/' + src;
    }
  }

  // Try constructing a URL based on the documented pattern.
  // We don't know the "other text" suffix, so we try common extensions.
  const candidates = [
    `${AVATAR_BASE}${userId}.png`,
    `${AVATAR_BASE}${userId}.jpg`,
    `${AVATAR_BASE}${userId}_default.png`,
    `${AVATAR_BASE}${userId}_avatar.png`
  ];
  // Return first as best guess; caller can validate later if needed.
  return candidates[0];
}

/**
 * Fetch and parse a single user.
 */
async function fetchUser(id) {
  const url = `${BASE_USER_URL}${id}`;

  let response;
  try {
    response = await fetchWithRetry(url);
  } catch (err) {
    return { id, success: false, reason: `Network error: ${err.message}` };
  }

  if (!response.ok) {
    return { id, success: false, reason: `HTTP ${response.status}` };
  }

  const html = await response.text();

  // Detect "user doesn't exist" pages
  if (/user\s+not\s+found|doesn'?t\s+exist/i.test(html)) {
    return { id, success: false, reason: 'User not found' };
  }

  const followers = extractFollowerCount(html);
  if (followers === null) {
    return { id, success: false, reason: 'No follower count found' };
  }

  if (followers < 0 || followers > MAX_FOLLOWERS) {
    return { id, success: false, reason: `Out of range: ${followers}` };
  }

  const username = extractUsername(html, id);
  const avatarUrl = extractAvatarUrl(html, id);

  return {
    id,
    success: true,
    followers,
    username,
    avatarUrl,
    profileUrl: url
  };
}

/**
 * Fetch all users with bounded concurrency.
 */
async function fetchAllUsers(options = {}) {
  const {
    minId = MIN_ID,
    maxId = MAX_ID,
    concurrency = CONCURRENT_LIMIT,
    onProgress = null
  } = options;

  const total = maxId - minId + 1;
  const ids = Array.from({ length: total }, (_, i) => minId + i);

  const queue = [...ids];
  const results = [];
  const failed = [];
  let completed = 0;

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift();
      if (id === undefined) break;

      const result = await fetchUser(id);
      completed++;

      if (result.success) {
        results.push(result);
      } else {
        failed.push({ id, reason: result.reason });
      }

      if (onProgress) {
        onProgress({ completed, total, success: results.length, failed: failed.length });
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, total) },
    () => worker()
  );
  await Promise.all(workers);

  // Sort by followers descending, then by id ascending for stable ties
  results.sort((a, b) => {
    if (b.followers !== a.followers) return b.followers - a.followers;
    return a.id - b.id;
  });

  // Assign ranks (with ties getting the same rank)
  let lastFollowers = null;
  let currentRank = 0;
  results.forEach((user, idx) => {
    if (user.followers !== lastFollowers) {
      currentRank = idx + 1;
      lastFollowers = user.followers;
    }
    user.rank = currentRank;
  });

  return { leaderboard: results, failed, total };
}

// ---------- Output formatters ----------

function formatTable(leaderboard) {
  if (leaderboard.length === 0) return 'No valid users found.';

  const rows = [['Rank', 'ID', 'Followers', 'Username', 'Avatar URL']];
  for (const u of leaderboard) {
    rows.push([
      String(u.rank),
      String(u.id),
      String(u.followers),
      u.username,
      u.avatarUrl
    ]);
  }

  const widths = rows[0].map((_, i) =>
    Math.max(...rows.map(r => (r[i] || '').length))
  );

  return rows.map(r =>
    r.map((cell, i) => String(cell).padEnd(widths[i])).join(' | ')
  ).join('\n');
}

function formatJSON(leaderboard) {
  return JSON.stringify(
    leaderboard.map(u => ({
      rank: u.rank,
      id: u.id,
      username: u.username,
      followers: u.followers,
      avatarUrl: u.avatarUrl,
      profileUrl: u.profileUrl
    })),
    null,
    2
  );
}

function formatCSV(leaderboard) {
  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = ['rank,id,username,followers,avatar_url,profile_url'];
  for (const u of leaderboard) {
    lines.push([
      u.rank, u.id, esc(u.username), u.followers,
      esc(u.avatarUrl), esc(u.profileUrl)
    ].join(','));
  }
  return lines.join('\n');
}

// ---------- Main entry point ----------

async function runLeaderboard(options = {}) {
  const {
    format = 'table',   // 'table' | 'json' | 'csv'
    output = 'console', // 'console' | 'object'
    verbose = true
  } = options;

  if (verbose) {
    console.log('Fetching users', MIN_ID, 'through', MAX_ID, '...');
  }

  const start = Date.now();
  const { leaderboard, failed, total } = await fetchAllUsers({
    onProgress: verbose
      ? ({ completed, total, success, failed }) => {
          // Throttle output: print every 20 completions
          if (completed % 20 === 0 || completed === total) {
            process.stdout.write(
              `\rProgress: ${completed}/${total} (ok: ${success}, fail: ${failed})   `
            );
          }
        }
      : null
  });

  if (verbose) {
    console.log('\nDone in', ((Date.now() - start) / 1000).toFixed(1), 'seconds');
    console.log(`Found ${leaderboard.length} valid users, ${failed.length} failed.`);
  }

  if (output === 'object') {
    return { leaderboard, failed };
  }

  switch (format) {
    case 'json':
      console.log(formatJSON(leaderboard));
      break;
    case 'csv':
      console.log(formatCSV(leaderboard));
      break;
    case 'table':
    default:
      console.log('\n' + formatTable(leaderboard));
      break;
  }

  return { leaderboard, failed };
}

// ---------- Exports (Node) / Global (Browser) ----------

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runLeaderboard,
    fetchAllUsers,
    fetchUser,
    extractFollowerCount,
    extractAvatarUrl,
    extractUsername,
    formatTable,
    formatJSON,
    formatCSV,
    MIN_ID,
    MAX_ID,
    CONCURRENT_LIMIT,
    AVATAR_BASE,
    BASE_USER_URL
  };
} else if (typeof window !== 'undefined') {
  window.TrellisLeaderboard = {
    run: runLeaderboard,
    fetchAllUsers,
    fetchUser,
    formatTable,
    formatJSON,
    formatCSV
  };
}

// ---------- CLI execution (Node) ----------

if (typeof require !== 'undefined' && require.main === module) {
  const args = process.argv.slice(2);
  const formatArg = args.find(a => a.startsWith('--format='));
  const format = formatArg ? formatArg.split('=')[1] : 'table';

  runLeaderboard({ format, verbose: true }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}