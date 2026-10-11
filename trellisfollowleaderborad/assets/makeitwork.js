/**
 * Trellis Follower Leaderboard
 * Fetches users 1–300, extracts follower counts, avatars, and usernames,
 * then renders a ranked leaderboard with JSON/CSV export.
 *
 * If you hit CORS errors, set PROXY below to your own proxy endpoint.
 * Example proxy: "https://xavierfisher.uk/trellisfollowleaderborad/assets/proxy.php?url="
 * Leave PROXY as "" to fetch directly (only works if CORS allows it).
 */
(function () {
    'use strict';

    // ---------- Config ----------
    var PROXY = 'https://api.allorigins.win/raw?url=';
    var BASE_URL = 'https://trellis.consciousb.one/web/user.php?id=';
    var AVATAR_BASE = 'https://trellis.consciousb.one/dynamic/avatars/avatar_';
    var MIN_ID = 1;
    var MAX_ID = 300;
    var MAX_FOLLOWERS = 9999;
    var CONCURRENCY = 15;
    var TIMEOUT_MS = 12000;
    var RETRIES = 2;

    // ---------- DOM ----------
    var loadBtn = document.getElementById('loadBtn');
    var jsonBtn = document.getElementById('jsonBtn');
    var csvBtn = document.getElementById('csvBtn');
    var statusEl = document.getElementById('status');
    var errorEl = document.getElementById('error');
    var emptyEl = document.getElementById('emptyState');
    var table = document.getElementById('table');
    var tbody = document.getElementById('tbody');

    // ---------- State ----------
    var leaderboard = [];
    var isFetching = false;

    // ---------- Networking ----------
    function buildUrl(target) {
        return PROXY ? (PROXY + encodeURIComponent(target)) : target;
    }

    function fetchTimeout(url, ms) {
        var ctrl = new AbortController();
        var timer = setTimeout(function () { ctrl.abort(); }, ms);
        return fetch(url, {
            signal: ctrl.signal,
            headers: { 'Accept': 'text/html,application/xhtml+xml' }
        }).finally(function () { clearTimeout(timer); });
    }

    async function fetchWithRetry(url) {
        var lastErr;
        for (var i = 0; i < RETRIES; i++) {
            try {
                return await fetchTimeout(url, TIMEOUT_MS);
            } catch (e) {
                lastErr = e;
                if (i < RETRIES - 1) {
                    await new Promise(function (r) { setTimeout(r, 400); });
                }
            }
        }
        throw lastErr;
    }

    // ---------- Parsing ----------
    function parseUsername(html, id) {
        var doc = new DOMParser().parseFromString(html, 'text/html');

        var selectors = [
            'h1', 'h2', '.username', '.user-name', '.profile-username',
            '[class*="username"]', '[class*="user-name"]'
        ];
        for (var i = 0; i < selectors.length; i++) {
            var el = doc.querySelector(selectors[i]);
            if (el && el.textContent.trim() && el.textContent.trim().length < 60) {
                return el.textContent.trim();
            }
        }

        var bolds = doc.querySelectorAll('b, strong');
        for (var j = 0; j < bolds.length; j++) {
            var t = bolds[j].textContent.trim();
            if (t && !/^\d+$/.test(t) && t.length > 1 && t.length < 50) return t;
        }

        var title = doc.querySelector('title');
        if (title) {
            var parts = title.textContent.split(/[·\-|]/);
            for (var k = 0; k < parts.length; k++) {
                var p = parts[k].trim();
                if (p && p !== 'Trellis' &&
                    p.toLowerCase().indexOf('user not found') === -1) {
                    return p;
                }
            }
        }
        return 'user_' + id;
    }

    function parseFollowers(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');

        // Primary: <a href="#followersModal" ...><b>NUMBER</b> followers</a>
        var anchors = doc.querySelectorAll('a[href="#followersModal"]');
        for (var i = 0; i < anchors.length; i++) {
            var a = anchors[i];
            if (a.textContent.toLowerCase().indexOf('follower') === -1) continue;
            var b = a.querySelector('b');
            if (b) {
                var n = parseInt(b.textContent.trim().replace(/,/g, ''), 10);
                if (!isNaN(n)) return n;
            }
            var m = a.textContent.match(/(\d[\d,]*)/);
            if (m) {
                var n2 = parseInt(m[1].replace(/,/g, ''), 10);
                if (!isNaN(n2)) return n2;
            }
        }

        // Fallback: any "NUMBER followers" in body text
        var body = doc.body ? doc.body.textContent : '';
        var match = body.match(/(\d[\d,]*)\s*followers?/i);
        if (match) {
            var n3 = parseInt(match[1].replace(/,/g, ''), 10);
            if (!isNaN(n3)) return n3;
        }
        return null;
    }

    function parseAvatar(html, id) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var imgs = doc.querySelectorAll('img');
        for (var i = 0; i < imgs.length; i++) {
            var src = imgs[i].getAttribute('src') || '';
            if (src.indexOf('/dynamic/avatars/avatar_') !== -1) {
                if (src.indexOf('http') === 0) return src;
                if (src.indexOf('//') === 0) return 'https:' + src;
                if (src.indexOf('/') === 0) return 'https://trellis.consciousb.one' + src;
                return 'https://trellis.consciousb.one/' + src;
            }
        }
        // Fallback: construct from known pattern
        return AVATAR_BASE + id + '.png';
    }

    // ---------- Fetch one user ----------
    async function fetchUser(id) {
        var target = BASE_URL + id;
        var url = buildUrl(target);

        var res;
        try {
            res = await fetchWithRetry(url);
        } catch (e) {
            return { id: id, ok: false, reason: 'network' };
        }
        if (!res.ok) {
            return { id: id, ok: false, reason: 'http ' + res.status };
        }

        var html = await res.text();

        if (/user\s+not\s+found|doesn'?t\s+exist/i.test(html)) {
            return { id: id, ok: false, reason: 'not found' };
        }

        var followers = parseFollowers(html);
        if (followers === null) {
            return { id: id, ok: false, reason: 'no followers' };
        }
        if (followers < 0 || followers > MAX_FOLLOWERS) {
            return { id: id, ok: false, reason: 'range' };
        }

        return {
            id: id,
            ok: true,
            followers: followers,
            username: parseUsername(html, id),
            avatar: parseAvatar(html, id),
            profile: target
        };
    }

    // ---------- Fetch all ----------
    async function fetchAll(onProgress) {
        var total = MAX_ID - MIN_ID + 1;
        var queue = [];
        for (var i = MIN_ID; i <= MAX_ID; i++) queue.push(i);

        var results = [];
        var failed = 0;
        var done = 0;

        async function worker() {
            while (queue.length > 0) {
                var id = queue.shift();
                if (id === undefined) break;
                var r = await fetchUser(id);
                done++;
                if (r.ok) results.push(r);
                else failed++;
                if (onProgress) onProgress(done, total, results.length, failed);
            }
        }

        var workers = [];
        for (var w = 0; w < Math.min(CONCURRENCY, total); w++) {
            workers.push(worker());
        }
        await Promise.all(workers);

        // Sort: followers desc, then id asc
        results.sort(function (a, b) {
            if (b.followers !== a.followers) return b.followers - a.followers;
            return a.id - b.id;
        });

        // Rank with ties
        var last = null, rank = 0;
        results.forEach(function (u, idx) {
            if (u.followers !== last) {
                rank = idx + 1;
                last = u.followers;
            }
            u.rank = rank;
        });

        return { results: results, failed: failed, total: total };
    }

    // ---------- Render ----------
    function render(list) {
        tbody.innerHTML = '';
        if (!list.length) {
            table.style.display = 'none';
            emptyEl.style.display = 'block';
            return;
        }
        table.style.display = 'table';
        emptyEl.style.display = 'none';

        list.forEach(function (u) {
            var tr = document.createElement('tr');

            var tdRank = document.createElement('td');
            tdRank.textContent = u.rank;
            tr.appendChild(tdRank);

            var tdUser = document.createElement('td');

            if (u.avatar) {
                var img = document.createElement('img');
                img.className = 'avatar';
                img.src = u.avatar;
                img.alt = '';
                img.onerror = function () {
                    var ph = document.createElement('span');
                    ph.className = 'avatar-placeholder';
                    ph.textContent = '?';
                    if (this.parentNode) this.parentNode.replaceChild(ph, this);
                };
                tdUser.appendChild(img);
            } else {
                var ph = document.createElement('span');
                ph.className = 'avatar-placeholder';
                ph.textContent = '?';
                tdUser.appendChild(ph);
            }

            var a = document.createElement('a');
            a.href = u.profile;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = u.username;
            tdUser.appendChild(a);
            tr.appendChild(tdUser);

            var tdF = document.createElement('td');
            tdF.textContent = u.followers.toLocaleString();
            tr.appendChild(tdF);

            tbody.appendChild(tr);
        });
    }

    // ---------- Export ----------
    function download(text, filename, mime) {
        var blob = new Blob([text], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    if (jsonBtn) {
        jsonBtn.addEventListener('click', function () {
            if (!leaderboard.length) return;
            var out = leaderboard.map(function (u) {
                return {
                    rank: u.rank,
                    id: u.id,
                    username: u.username,
                    followers: u.followers,
                    avatar: u.avatar,
                    profile: u.profile
                };
            });
            download(JSON.stringify(out, null, 2), 'leaderboard.json', 'application/json');
        });
    }

    if (csvBtn) {
        csvBtn.addEventListener('click', function () {
            if (!leaderboard.length) return;
            function esc(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }
            var lines = ['rank,id,username,followers,avatar,profile'];
            leaderboard.forEach(function (u) {
                lines.push([
                    u.rank, u.id, esc(u.username), u.followers,
                    esc(u.avatar), esc(u.profile)
                ].join(','));
            });
            download(lines.join('\n'), 'leaderboard.csv', 'text/csv');
        });
    }

    // ---------- Main load ----------
    async function load() {
        if (isFetching) return;
        isFetching = true;

        loadBtn.disabled = true;
        jsonBtn.disabled = true;
        csvBtn.disabled = true;
        errorEl.style.display = 'none';
        emptyEl.style.display = 'none';
        table.style.display = 'none';
        statusEl.textContent = 'Loading...';

        try {
            var out = await fetchAll(function (done, total, ok, fail) {
                statusEl.textContent = 'Loading ' + done + '/' + total +
                    ' (' + ok + ' ok, ' + fail + ' failed)';
            });

            leaderboard = out.results;
            render(leaderboard);

            statusEl.textContent = 'Loaded ' + leaderboard.length + ' users' +
                (out.failed ? ' (' + out.failed + ' failed)' : '');

            if (out.failed > 0) {
                errorEl.textContent = out.failed + ' users could not be loaded.';
                errorEl.style.display = 'block';
            }

            if (leaderboard.length > 0) {
                jsonBtn.disabled = false;
                csvBtn.disabled = false;
            }
        } catch (e) {
            console.error(e);
            statusEl.textContent = 'Error';
            errorEl.textContent = 'Something went wrong: ' + e.message;
            errorEl.style.display = 'block';
        } finally {
            isFetching = false;
            loadBtn.disabled = false;
        }
    }

    loadBtn.addEventListener('click', load);

    // Expose for debugging
    window.TrellisLeaderboard = {
        load: load,
        getData: function () { return leaderboard; }
    };
})();
