const express = require('express');
const cors = require('cors');
const scraper = require('./scraper');
const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '..', 'results');
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

async function getSessionStatus() {
  const loggedIn = await scraper.isLoggedIn();
  if (!loggedIn) return { loggedIn: false, message: 'Not logged in. Visit /login.' };

  const session = loadCookies();
  return {
    loggedIn: true,
    savedAt: session ? session.savedAt : null,
    expiresAt: session ? session.expiresAt : null,
    cookieCount: session && session.cookies ? session.cookies.length : 0,
  };
}

function loadCookies() {
  const cookieFile = path.join(__dirname, '..', 'cookies.json');
  if (!fs.existsSync(cookieFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(cookieFile, 'utf8'));
  } catch {
    return null;
  }
}

app.get('/login', async (req, res) => {
  const status = await getSessionStatus();
  if (status.loggedIn) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Sentiment Scraper - Already Logged In</title>
  <style>
    body { font-family: system-ui; max-width: 600px; margin: 60px auto; padding: 20px; background: #1a1a2e; color: #eee; }
    .card { background: #16213e; border-radius: 12px; padding: 30px; border: 1px solid #0f3460; }
    h1 { color: #e94560; margin-top: 0; }
    .status { color: #4ecca3; font-size: 1.1em; margin: 20px 0; }
    .info { color: #aaa; font-size: 0.9em; margin: 10px 0; }
    a { color: #e94560; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Already Logged In</h1>
    <div class="status">Session active</div>
    <div class="info">Saved: ${status.savedAt}</div>
    <div class="info">Expires: ${status.expiresAt}</div>
    <div class="info">${status.cookieCount} cookies</div>
    <br>
    <a href="/">Back to Dashboard</a>
  </div>
</body>
</html>`);
  }

  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Sentiment Scraper - Login</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui; max-width: 700px; margin: 60px auto; padding: 20px; background: #1a1a2e; color: #eee; }
    .card { background: #16213e; border-radius: 12px; padding: 40px; border: 1px solid #0f3460; }
    h1 { color: #e94560; margin-top: 0; font-size: 1.8em; }
    p { color: #aaa; margin: 15px 0; line-height: 1.6; }
    label { display: block; font-weight: 600; margin-bottom: 6px; color: #ccc; }
    input {
      width: 100%; padding: 12px 14px; font-size: 0.95em; font-family: monospace;
      background: #0a0a1a; color: #4ecca3; border: 1px solid #0f3460;
      border-radius: 6px; margin-bottom: 20px;
    }
    input:focus { outline: none; border-color: #e94560; }
    button {
      width: 100%; padding: 16px; font-size: 1.1em;
      background: #e94560; color: white; border: none;
      border-radius: 8px; cursor: pointer; margin-top: 10px;
      font-weight: 600; transition: background 0.2s;
    }
    button:hover { background: #d63050; }
    .steps { background: #0f3460; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 0.9em; }
    .steps li { margin: 8px 0; color: #ccc; }
    .ok { color: #4ecca3; }
    .err { color: #ff6b6b; }
    .warn { background: #2d1a1a; border: 1px solid #e94560; border-radius: 8px; padding: 15px; margin: 20px 0; color: #ff8fa3; font-size: 0.9em; }
    #msg { margin-top: 15px; padding: 12px; border-radius: 6px; display: none; font-weight: 600; text-align: center; }
    #msg.ok { display: block; background: #1a3a2a; color: #4ecca3; border: 1px solid #4ecca3; }
    #msg.err { display: block; background: #3a1a1a; color: #ff6b6b; border: 1px solid #ff6b6b; }
    code { background: #0a0a1a; padding: 2px 6px; border-radius: 3px; font-size: 0.85em; color: #ffd93d; }
  </style>
</head>
<body>
  <div class="card">
    <h1>X.com Cookie Setup</h1>
    <p>Paste <code>auth_token</code> dan <code>ct0</code> dari DevTools browser X.com yang sudah login.</p>

    <div class="warn">
      <strong>Cara dapat cookies:</strong><br>
      1. Login ke <a href="https://x.com" style="color:#ff8fa3">x.com</a> di browser<br>
      2. Buka DevTools (<code>F12</code> atau <code>Ctrl+Shift+I</code>)<br>
      3. Tab <strong>Application</strong> → <strong>Cookies</strong> → <code>https://x.com</code><br>
      4. Copy value dari <code>auth_token</code> dan <code>ct0</code> ke form di bawah
    </div>

    <form id="form" onsubmit="submitCookies(event)">
      <label for="cookieStr">Full Cookie String</label>
      <textarea id="cookieStr" rows="6" style="width:100%;padding:12px;font-family:monospace;font-size:0.85em;background:#0a0a1a;color:#4ecca3;border:1px solid #0f3460;border-radius:6px;resize:vertical;box-sizing:border-box;" placeholder="Paste full cookie string from DevTools Network tab..." required></textarea>
      <button type="submit" id="btn">Save Session</button>
    </form>

    <div id="msg" style="margin-top:15px;padding:12px;border-radius:6px;display:none;font-weight:600;text-align:center;"></div>
  </div>

  <script>
    async function submitCookies(e) {
      e.preventDefault();
      const btn = document.getElementById('btn');
      const msg = document.getElementById('msg');
      const cookieStr = document.getElementById('cookieStr').value.trim();

      btn.disabled = true;
      btn.innerText = 'Saving...';
      msg.style.display = 'none';

      try {
        const r = await fetch('/login/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookieStr })
        });
        const data = await r.json();
        if (r.ok) {
          msg.style.cssText = 'display:block;background:#1a3a2a;color:#4ecca3;border:1px solid #4ecca3;';
          msg.textContent = 'Session saved! Redirecting...';
          setTimeout(() => window.location.href = '/', 1500);
        } else {
          msg.style.cssText = 'display:block;background:#3a1a1a;color:#ff6b6b;border:1px solid #ff6b6b;';
          msg.textContent = 'Error: ' + (data.error || r.status);
          btn.disabled = false;
          btn.innerText = 'Save Session';
        }
      } catch (err) {
        msg.style.cssText = 'display:block;background:#3a1a1a;color:#ff6b6b;border:1px solid #ff6b6b;';
        msg.textContent = 'Error: ' + err.message;
        btn.disabled = false;
        btn.innerText = 'Save Session';
      }
    }
  </script>
</body>
</html>`);
});

let loginSSEClients = [];

app.get('/login/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();
  loginSSEClients.push(res);
  req.on('close', () => {
    loginSSEClients = loginSSEClients.filter(c => c !== res);
  });
});

function sseLog(msg, type, done) {
  const data = JSON.stringify({ msg, type, done: done || false });
  loginSSEClients.forEach(c => c.write('data: ' + data + '\n'));
}

app.post('/login/save', express.json(), async (req, res) => {
  const { cookieStr } = req.body;

  if (!cookieStr || typeof cookieStr !== 'string') {
    return res.status(400).json({ error: 'Missing cookieStr' });
  }

  const parsedCookies = [];
  let ct0Value = '';

  cookieStr.split(';').forEach(pair => {
    const eqIdx = pair.indexOf('=');
    if (eqIdx < 0) return;
    const name = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (!name) return;
    parsedCookies.push({
      name,
      value,
      domain: '.x.com',
      path: '/',
      httpOnly: false,
      secure: true,
      session: false,
    });
    if (name === 'ct0') ct0Value = value;
  });

  if (!ct0Value) {
    return res.status(400).json({ error: 'ct0 cookie not found in cookie string' });
  }

  const fullCookieString = parsedCookies.map(c => `${c.name}=${c.value}`).join('; ');

  const sessionData = {
    cookies: parsedCookies,
    cookieString: fullCookieString,
    csrfToken: ct0Value,
    savedAt: new Date().toISOString(),
    expiresAt: null,
  };

  const cookieFile = path.join(__dirname, '..', 'cookies.json');
  fs.writeFileSync(cookieFile, JSON.stringify(sessionData, null, 2));
  await scraper.setCookies(sessionData.cookieString, sessionData.csrfToken);

  console.log(`Session saved — ${parsedCookies.length} cookies, ct0=${ct0Value.slice(0, 8)}...`);
  res.json({ success: true, cookieCount: parsedCookies.length });
});

let loginInProgress = false;

app.post('/login/start', async (req, res) => {
  if (loginInProgress) {
    return res.status(409).json({ error: 'Login already in progress' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    loginInProgress = true;
    sseLog('Starting browser...', 'info');

    try {
      const puppeteer = require('puppeteer');
      sseLog('Launching browser (headless)...', 'info');

      const browser = await puppeteer.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });
      await page.setViewport({ width: 1280, height: 800 });

      sseLog('Navigating to x.com/login...', 'info');
      await page.goto('https://x.com/login', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      sseLog('Waiting for login form...', 'info');
      await page.waitForSelector('input[autocomplete="username"], input[name="username"]', {
        timeout: 15000,
      });

      if (email) {
        sseLog('Filling email...', 'info');
        await page.type('input[autocomplete="username"], input[name="username"]', email, { delay: 30 });
        const nextBtn = (await page.$$('button[type="button"]'))[0];
        if (nextBtn) await nextBtn.click();
        await new Promise(r => setTimeout(r, 2000));
      }

      sseLog('Waiting for password or challenge...', 'info');
      try {
        await page.waitForSelector('input[type="password"]', { timeout: 5000 });
        if (password) {
          sseLog('Filling password...', 'info');
          await page.type('input[type="password"]', password, { delay: 30 });
          await (await page.$('button[type="submit"]')).click();
        } else {
          sseLog('Manual login needed in browser window', 'info');
        }
      } catch (e) {
        sseLog('Password field not auto-filled', 'info');
      }

      sseLog('Waiting for home page...', 'info');
      try {
        await Promise.race([
          page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 30000 }),
          page.waitForSelector('[data-testid="challenge"]', { timeout: 5000 }),
        ]);

        const isChallenge = await page.$('[data-testid="challenge"]');
        if (isChallenge) {
          sseLog('Challenge detected - handle manually in browser', 'warn');
          sseLog('Waiting up to 5 min for manual resolution...', 'info');
          await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 300000 });
        }
      } catch (e) {
        sseLog('Navigation timeout - checking current state...', 'warn');
      }

      sseLog('Waiting for cookies to settle...', 'info');
      await new Promise(r => setTimeout(r, 5000));
      await page.reload({ waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 3000));

      sseLog('Extracting cookies via CDP...', 'info');
      const cdp = await page.target().createCDPSession();
      const { cookies } = await cdp.send('Network.getAllCookies');
      allCookies = cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        session: c.session,
      }));
      await browser.close();

      const neededNames = [
        'auth_token', 'ct0', 'twid', 'guest_id', 'personalization_id',
        'kdt', 'guest_id_ads', 'guest_id_marketing', 'lang',
        '_twpid', 'att', 'g_state', '__cuid', 'external_referer',
        '__cf_bm', '__cf_clearance',
      ];

      const needed = allCookies.filter(c => neededNames.indexOf(c.name) >= 0);
      const cookieStr = needed.map(c => c.name + '=' + c.value).join('; ');
      const ct0 = needed.find(c => c.name === 'ct0');
      const csrf = ct0 ? ct0.value : '';

      const sessionData = {
        cookies: needed,
        cookieString: cookieStr,
        csrfToken: csrf,
        savedAt: new Date().toISOString(),
        expiresAt: ct0 && ct0.expires ? new Date(ct0.expires * 1000).toISOString() : null,
      };

      const cookieFile = path.join(__dirname, '..', 'cookies.json');
      fs.writeFileSync(cookieFile, JSON.stringify(sessionData, null, 2));

      await scraper.setCookies(cookieStr, csrf);

      sseLog('Success! ' + needed.length + ' cookies saved', 'ok');
      sseLog('Done', 'ok', true);

    } catch (e) {
      sseLog('Error: ' + e.message, 'err');
      sseLog('Done', 'err', true);
    } finally {
      loginInProgress = false;
    }

    return res.json({ started: true });
  }

  loginInProgress = true;
  sseLog('Starting login with credentials...', 'info');

  try {
    const session = await puppeteerAuth.loginToX(email, password);
    await scraper.setCookies(session.cookieString, session.csrfToken);
    sseLog('Login successful!', 'ok');
    sseLog('Done', 'ok', true);
    res.json({ success: true });
  } catch (e) {
    sseLog('Error: ' + e.message, 'err');
    sseLog('Done', 'err', true);
    res.status(500).json({ error: e.message });
  } finally {
    loginInProgress = false;
  }
});

app.get('/', (req, res) => {
  const status = getSessionStatus();
  const statusHTML = status.loggedIn
    ? '<span class="ok">Logged In</span> <small>(' + status.cookieCount + ' cookies)</small>'
    : '<span class="err">Not Logged In</span>';

  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Sentiment Scraper</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui; max-width: 900px; margin: 0 auto; padding: 30px 20px; background: #1a1a2e; color: #eee; min-height: 100vh; }
    h1 { color: #e94560; margin-bottom: 5px; }
    .subtitle { color: #888; margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
    .card { background: #16213e; border-radius: 12px; padding: 25px; border: 1px solid #0f3460; }
    .card h2 { color: #4ecca3; margin-bottom: 15px; font-size: 1.1em; }
    .card pre { background: #0a0a1a; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 0.85em; color: #aaa; }
    .status-bar { background: #16213e; border-radius: 8px; padding: 15px 20px; margin-bottom: 25px; border: 1px solid #0f3460; display: flex; justify-content: space-between; align-items: center; }
    .ok { color: #4ecca3; }
    .err { color: #ff6b6b; }
    .warn { color: #ffd93d; }
    a { color: #e94560; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .full { grid-column: 1 / -1; }
    code { color: #4ecca3; background: #0a0a1a; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
  </style>
</head>
<body>
  <h1>Sentiment Scraper</h1>
  <p class="subtitle">X.com GraphQL API Scraper</p>

  <div class="status-bar">
    <div>
      <strong>Session:</strong> ${statusHTML}
    </div>
    <div>
      <a href="/login">${status.loggedIn ? 'Re-login' : 'Login'}</a>
      &nbsp;|&nbsp;
      <a href="/api/session">Session JSON</a>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Search Tweets</h2>
      <pre>GET /api/search?q=MBG&product=Top&limit=20</pre>
      <p style="color:#888;margin-top:10px;font-size:0.85em;">product: Top | Latest</p>
    </div>

    <div class="card">
      <h2>Tweet Detail</h2>
      <pre>GET /api/tweet/:id</pre>
      <p style="color:#888;margin-top:10px;font-size:0.85em;">Returns tweet + replies</p>
    </div>

    <div class="card">
      <h2>User Profile</h2>
      <pre>GET /api/user/:screenName</pre>
      <p style="color:#888;margin-top:10px;font-size:0.85em;">e.g. /api/user/myshawti</p>
    </div>

    <div class="card">
      <h2>Results</h2>
      <pre>GET /api/results</pre>
      <p style="color:#888;margin-top:10px;font-size:0.85em;">List saved JSON files</p>
    </div>

    <div class="card full">
      <h2>Quick Test</h2>
      <pre>GET /api/search?q=MBG&limit=5</pre>
      <p style="color:#888;margin-top:10px;font-size:0.85em;">
        Results auto-saved to <code>results/</code> folder.
      </p>
    </div>
  </div>
</body>
</html>`);
});

app.get('/api/session', async (req, res) => {
  const status = await getSessionStatus();
  if (!status.loggedIn) {
    return res.json({
      loggedIn: false,
      loginUrl: '/login',
      message: 'Not logged in. Visit /login to authenticate Twitter session.',
    });
  }
  res.json({
    loggedIn: true,
    savedAt: status.savedAt,
    expiresAt: status.expiresAt,
    cookieCount: status.cookieCount,
  });
});

app.get('/health', (_, res) => {
  const sessionStatus = getSessionStatus();
  res.json({ status: 'ok', loggedIn: sessionStatus.loggedIn, timestamp: new Date().toISOString() });
});

app.get('/api/search', async (req, res) => {
  const { q, product = 'Top', limit = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing param: q' });

  const status = await getSessionStatus();
  if (!status.loggedIn) {
    return res.status(401).json({ error: 'Not logged in. Visit /login first.' });
  }

  try {
    const count = Math.min(parseInt(limit) || 20, 100);
    const tweets = await scraper.searchTweets(q, count, product);

    const result = {
      query: q,
      product,
      count: tweets.length,
      tweets,
      scraped_at: new Date().toISOString(),
    };

    const safe = q.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const filename = 'search_' + safe + '_' + Date.now() + '.json';
    const outPath = path.join(RESULTS_DIR, filename);
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

    res.json(result);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tweet/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing param: id' });

  const status = await getSessionStatus();
  if (!status.loggedIn) {
    return res.status(401).json({ error: 'Not logged in. Visit /login first.' });
  }

  try {
    const data = await scraper.getTweet(id);
    const result = {
      tweet_id: id,
      main: data.main,
      replies_count: data.replies.length,
      replies: data.replies,
      scraped_at: new Date().toISOString(),
    };

    const filename = 'tweet_' + id + '.json';
    const outPath = path.join(RESULTS_DIR, filename);
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

    res.json(result);
  } catch (err) {
    console.error('Tweet error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/:screenName', async (req, res) => {
  const { screenName } = req.params;
  if (!screenName) return res.status(400).json({ error: 'Missing param: screenName' });

  const status = await getSessionStatus();
  if (!status.loggedIn) {
    return res.status(401).json({ error: 'Not logged in. Visit /login first.' });
  }

  try {
    const user = await scraper.getProfile(screenName);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = { user, scraped_at: new Date().toISOString() };
    const filename = 'user_' + screenName + '_' + Date.now() + '.json';
    const outPath = path.join(RESULTS_DIR, filename);
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

    res.json(result);
  } catch (err) {
    console.error('User error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/results', (_, res) => {
  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const fp = path.join(RESULTS_DIR, f);
      const s = fs.statSync(fp);
      return { filename: f, size: s.size, created: s.birthtime };
    })
    .sort((a, b) => b.created - a.created);
  res.json({ files });
});

const PORT = process.env.SCRAPER_PORT || 5001;

(async () => {
  await scraper.loadSession();
  app.listen(PORT, async () => {
    console.log('Sentiment Scraper running on http://localhost:' + PORT);
    const status = await getSessionStatus();
    if (status.loggedIn) {
      console.log('Session: logged in (' + status.cookieCount + ' cookies)');
    } else {
      console.log('Session: NOT logged in - visit http://localhost:' + PORT + '/login');
    }
  });
})();

// Start BullMQ worker (after Express is ready)
require('./worker');

module.exports = app;
