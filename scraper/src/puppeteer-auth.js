const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const COOKIE_FILE = path.join(__dirname, '..', 'cookies.json');

function loadCookies() {
  if (fs.existsSync(COOKIE_FILE)) {
    try {
      const raw = fs.readFileSync(COOKIE_FILE, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function saveCookies(sessionData) {
  const content = JSON.stringify(sessionData, null, 2);
  fs.writeFileSync(COOKIE_FILE, content);
  console.log('[auth] Saved ' + sessionData.cookies.length + ' cookies to ' + COOKIE_FILE);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function loginToX(username, password, email) {
  console.log('[auth] Launching browser...');

  const chromePathCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/google/chrome/google-chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  ];
  let chromePath = null;
  for (const p of chromePathCandidates) {
    if (fs.existsSync(p)) {
      chromePath = p;
      break;
    }
  }

  const userDataDir = path.join(__dirname, '..', '.chrome-profile');

  const launchOpts = {
    headless: false,
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation'], 
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1366,800',
      '--disable-features=ThirdPartyCookieBlocking,SameSiteByDefaultCookies',
      '--user-data-dir=' + userDataDir,
    ],
  };

  if (chromePath) {
    launchOpts.executablePath = chromePath;
    console.log('[auth] Using real Chrome: ' + chromePath);
  } else {
    console.log('[auth] Using bundled Chromium');
  }

  const browser = await puppeteer.launch(launchOpts);
  const page = (await browser.pages())[0] || await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    window.chrome = { runtime: {} };

    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en', 'id'],
    });

    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter.apply(this, arguments);
    };
  });

  try {
    console.log('[auth] Navigating to x.com/i/flow/login...');
    await page.goto('https://x.com/i/flow/login', {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    console.log('[auth] Waiting for page to settle...');
    await delay(5000);

    console.log('[auth] Waiting for username field...');
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 20000 });
    await delay(1000);

    console.log('[auth] Entering username: ' + username);
    const usernameInput = await page.$('input[autocomplete="username"]');
    await usernameInput.click();
    await delay(300);
    await usernameInput.type(username, { delay: 80 + Math.random() * 50 });
    await delay(1500);

    console.log('[auth] Clicking Next...');
    const nextClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[role="button"], button'));
      const nextBtn = buttons.find(b => {
        const text = (b.textContent || '').toLowerCase().trim();
        return text === 'next' || text === 'berikutnya' || text === 'siguiente';
      });
      if (nextBtn) { nextBtn.click(); return 'text'; }

      const testBtn = document.querySelector('[data-testid="LoginForm_Login_Button"]');
      if (testBtn) { testBtn.click(); return 'testid'; }

      return null;
    });
    console.log('[auth] Next clicked via: ' + (nextClicked || 'FALLBACK_ENTER'));

    if (!nextClicked) {
      await page.keyboard.press('Enter');
    }

    console.log('[auth] Waiting for next step...');
    await delay(3000);

    let attempts = 0;
    const MAX_ATTEMPTS = 3;

    while (attempts < MAX_ATTEMPTS) {
      const state = await page.evaluate(() => {
        const passInput = document.querySelector('input[name="password"], input[type="password"]');
        const verifyInput = document.querySelector('input[data-testid="ocfEnterTextTextInput"]');
        const errorEl = document.querySelector('[data-testid="LoginForm_error"], [role="alert"]');
        const errorText = errorEl ? errorEl.textContent : '';

        return {
          hasPassword: !!passInput,
          hasVerify: !!verifyInput,
          hasError: !!errorEl,
          errorText,
        };
      });

      console.log('[auth] State check #' + (attempts + 1) + ':', JSON.stringify(state));

      if (state.hasPassword) {
        console.log('[auth] ✅ Password field found!');
        break;
      }

      if (state.hasVerify) {
        console.log('[auth] 📧 Email verification step detected');
        const verifyValue = email || username;
        console.log('[auth] Entering: ' + verifyValue);

        const verifyInput = await page.$('input[data-testid="ocfEnterTextTextInput"]');
        await verifyInput.click();
        await delay(300);
        await verifyInput.type(verifyValue, { delay: 80 });
        await delay(1000);

        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="ocfEnterTextNextButton"]');
          if (btn) { btn.click(); return; }
          const buttons = Array.from(document.querySelectorAll('button'));
          const nextBtn = buttons.find(b => {
            const t = (b.textContent || '').toLowerCase();
            return t.includes('next') || t.includes('berikutnya') || t.includes('verify');
          });
          if (nextBtn) nextBtn.click();
        });

        await delay(3000);
        attempts++;
        continue;
      }

      if (state.hasError && state.errorText.includes('Could not log you in')) {
        console.log('[auth] ⚠️  Rate limited. Waiting 10s and retrying...');
        await delay(10000);

        await page.goto('https://x.com/i/flow/login', {
          waitUntil: 'networkidle0',
          timeout: 60000,
        });

        await page.waitForSelector('input[autocomplete="username"]', { timeout: 15000 });
        const retryInput = await page.$('input[autocomplete="username"]');
        await retryInput.click();
        await delay(300);
        await retryInput.type(username, { delay: 100 });
        await delay(2000);

        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const nextBtn = buttons.find(b => {
            const t = (b.textContent || '').toLowerCase().trim();
            return t === 'next' || t === 'berikutnya';
          });
          if (nextBtn) nextBtn.click();
        });

        await delay(4000);
        attempts++;
        continue;
      }

      console.log('[auth] Unrecognized state, waiting...');
      await delay(3000);
      attempts++;
    }

    console.log('[auth] Waiting for password field...');
    try {
      await page.waitForSelector('input[name="password"], input[type="password"]', { timeout: 15000 });
    } catch (e) {
      const ssPath = path.join(__dirname, '..', 'debug_login.png');
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('[auth] ❌ Password field not found. Screenshot: ' + ssPath);
      console.log('[auth] ');
      console.log('[auth] 💡 TIP: If X.com keeps blocking, try this:');
      console.log('[auth]    1. Run with --manual flag');
      console.log('[auth]    2. Login manually in the browser window');
      console.log('[auth]    3. Cookies will be extracted automatically');
      throw new Error('Password field not found after ' + MAX_ATTEMPTS + ' attempts.');
    }

    console.log('[auth] Entering password...');
    const passInput = await page.$('input[name="password"], input[type="password"]');
    await passInput.click();
    await delay(300);
    await passInput.type(password, { delay: 60 + Math.random() * 40 });
    await delay(1000);

    console.log('[auth] Clicking Log in...');
    await page.evaluate(() => {
      const loginBtn = document.querySelector('[data-testid="LoginForm_Login_Button"]');
      if (loginBtn) { loginBtn.click(); return; }
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.click(); return; }
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => {
        const t = (b.textContent || '').toLowerCase();
        return t.includes('log in') || t.includes('masuk');
      });
      if (btn) btn.click();
    });

    console.log('[auth] Waiting for home page...');
    try {
      await page.waitForSelector(
        '[data-testid="primaryColumn"], [data-testid="SideNav_NewTweet_Button"], a[data-testid="AppTabBar_Home_Link"]',
        { timeout: 30000 }
      );
      console.log('[auth] ✅ Login successful! Home page loaded.');
    } catch (e) {
      const hasChallenge = await page.$('input[data-testid="ocfEnterTextTextInput"]');
      if (hasChallenge) {
        console.log('[auth] ⚠️  Additional challenge (2FA / phone verification).');
        console.log('[auth] Please complete it manually in the browser window.');
        console.log('[auth] Waiting up to 3 minutes...');
        try {
          await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 180000 });
          console.log('[auth] ✅ Challenge resolved!');
        } catch (e2) {
          const ssPath = path.join(__dirname, '..', 'debug_challenge.png');
          await page.screenshot({ path: ssPath, fullPage: true });
          throw new Error('Challenge not resolved. Screenshot: ' + ssPath);
        }
      } else {
        const ssPath = path.join(__dirname, '..', 'debug_post_login.png');
        await page.screenshot({ path: ssPath, fullPage: true });
        console.log('[auth] ⚠️  Home page not detected, but continuing to extract cookies...');
      }
    }

    await delay(3000);

    console.log('[auth] Extracting cookies via CDP...');
    const cdp = await page.target().createCDPSession();
    const { cookies: allCookies } = await cdp.send('Network.getAllCookies');

    const xCookies = allCookies.filter(c =>
      c.domain.includes('x.com') || c.domain.includes('twitter.com')
    );

    const criticalNames = [
      'auth_token', 'ct0', 'twid', 'guest_id', 'personalization_id',
      'kdt', 'guest_id_ads', 'guest_id_marketing', 'lang',
      '_twpid', 'att', 'g_state', '__cuid',
    ];

    const criticalCookies = xCookies.filter(c => criticalNames.includes(c.name));

    const hasAuth = criticalCookies.some(c => c.name === 'auth_token');
    const hasCt0 = criticalCookies.some(c => c.name === 'ct0');
    const hasTwid = criticalCookies.some(c => c.name === 'twid');

    console.log('[auth] Cookies - auth_token: ' + (hasAuth ? '✅' : '❌') +
      ', ct0: ' + (hasCt0 ? '✅' : '❌') +
      ', twid: ' + (hasTwid ? '✅' : '❌'));

    if (!hasAuth || !hasCt0) {
      console.log('[auth] ⚠️  Missing critical cookies. All x.com cookies:');
      xCookies.forEach(c => console.log('  ' + c.name));
    }

    const cookieStr = criticalCookies.map(c => c.name + '=' + c.value).join('; ');
    const ct0Cookie = criticalCookies.find(c => c.name === 'ct0');
    const csrfToken = ct0Cookie ? ct0Cookie.value : '';

    const sessionData = {
      cookies: criticalCookies.map(c => ({
        name: c.name, value: c.value, domain: c.domain,
        path: c.path, expires: c.expires,
        httpOnly: c.httpOnly, secure: c.secure,
      })),
      cookieString: cookieStr,
      csrfToken,
      savedAt: new Date().toISOString(),
      expiresAt: ct0Cookie && ct0Cookie.expires > 0
        ? new Date(ct0Cookie.expires * 1000).toISOString()
        : null,
    };

    saveCookies(sessionData);
    await browser.close();
    console.log('[auth] ✅ Done! Cookies saved.');

    return sessionData;

  } catch (e) {
    console.error('[auth] ❌ Error:', e.message);
    try { await browser.close(); } catch (_) {}
    throw e;
  }
}

async function manualLogin() {
  console.log('[auth] Opening browser for manual login...');
  console.log('[auth] Log in to X.com manually, then press Enter in this terminal.');
  console.log('');

  const userDataDir = path.join(__dirname, '..', '.chrome-profile');

  const chromePathCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/google/chrome/google-chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  ];
  let chromePath = null;
  for (const p of chromePathCandidates) {
    if (fs.existsSync(p)) { chromePath = p; break; }
  }

  const launchOpts = {
    headless: false,
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1366,800',
      '--disable-features=ThirdPartyCookieBlocking',
      '--user-data-dir=' + userDataDir,
    ],
  };
  if (chromePath) launchOpts.executablePath = chromePath;

  const browser = await puppeteer.launch(launchOpts);
  const page = (await browser.pages())[0] || await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  await page.goto('https://x.com/i/flow/login', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });

  console.log('[auth] Browser opened. Please log in manually.');
  console.log('[auth] After login, wait for the home feed to load, then press Enter here.');
  console.log('');

  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  console.log('[auth] Extracting cookies...');
  await delay(2000);

  const cdp = await page.target().createCDPSession();
  const { cookies: allCookies } = await cdp.send('Network.getAllCookies');

  const xCookies = allCookies.filter(c =>
    c.domain.includes('x.com') || c.domain.includes('twitter.com')
  );

  const criticalNames = [
    'auth_token', 'ct0', 'twid', 'guest_id', 'personalization_id',
    'kdt', 'guest_id_ads', 'guest_id_marketing', 'lang',
    '_twpid', 'att', 'g_state', '__cuid',
  ];

  const criticalCookies = xCookies.filter(c => criticalNames.includes(c.name));
  const cookieStr = criticalCookies.map(c => c.name + '=' + c.value).join('; ');
  const ct0Cookie = criticalCookies.find(c => c.name === 'ct0');
  const csrfToken = ct0Cookie ? ct0Cookie.value : '';

  const sessionData = {
    cookies: criticalCookies.map(c => ({
      name: c.name, value: c.value, domain: c.domain,
      path: c.path, expires: c.expires,
      httpOnly: c.httpOnly, secure: c.secure,
    })),
    cookieString: cookieStr,
    csrfToken,
    savedAt: new Date().toISOString(),
    expiresAt: ct0Cookie && ct0Cookie.expires > 0
      ? new Date(ct0Cookie.expires * 1000).toISOString()
      : null,
  };

  saveCookies(sessionData);
  await browser.close();

  console.log('[auth] ✅ ' + criticalCookies.length + ' cookies saved!');
  console.log('[auth] auth_token: ' + (criticalCookies.some(c => c.name === 'auth_token') ? '✅' : '❌'));
  console.log('[auth] ct0: ' + (!!csrfToken ? '✅' : '❌'));
  console.log('');
  console.log('Now run: npm start');

  return sessionData;
}

async function ensureValidSession() {
  const session = loadCookies();
  if (!session) {
    throw new Error('No cookies saved. Run login first.');
  }

  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    throw new Error('Session expired. Re-run login.');
  }

  const https = require('https');
  try {
    const result = await new Promise((res, rej) => {
      const req = https.get('https://x.com/i/api/1.1/account/settings.json', {
        headers: {
          'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
          'cookie': session.cookieString,
          'x-csrf-token': session.csrfToken,
          'x-twitter-auth-type': 'OAuth2Session',
          'x-twitter-active-user': 'yes',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        }
      }, r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => res({ s: r.statusCode, d }));
      });
      req.on('error', rej);
    });

    if (result.s === 200) {
      console.log('[auth] Session valid ✅');
      return session;
    } else {
      throw new Error('Session invalid (HTTP ' + result.s + ').');
    }
  } catch (e) {
    throw new Error('Session check failed: ' + e.message);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === '--check') {
    ensureValidSession()
      .then(s => console.log('Session OK until: ' + s.expiresAt))
      .catch(e => console.error('Error: ' + e.message));

  } else if (args[0] === '--manual') {
    manualLogin()
      .catch(e => { console.error('❌ Error:', e.message); process.exit(1); });

  } else if (args.length >= 2) {
    const username = args[0];
    const password = args[1];
    const email = args[2] || null;

    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║     X.com Auto Login via Puppeteer    ║');
    console.log('╠═══════════════════════════════════════╣');
    console.log('║  Username: ' + username.padEnd(27) + '║');
    console.log('║  Email:    ' + (email || '(not provided)').padEnd(27) + '║');
    console.log('║  Password: ' + '●'.repeat(Math.min(password.length, 20)).padEnd(27) + '║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('');

    loginToX(username, password, email)
      .then(s => {
        console.log('');
        console.log('✅ Login successful!');
        console.log('   Cookies: ' + s.cookies.length);
        console.log('   CSRF:    ' + s.csrfToken.substring(0, 30) + '...');
        console.log('');
        console.log('Now run: npm start');
      })
      .catch(e => {
        console.error('');
        console.error('❌ Login failed: ' + e.message);
        console.error('');
        console.error('💡 Try manual mode instead:');
        console.error('   node src/puppeteer-auth.js --manual');
        process.exit(1);
      });

  } else {
    console.log('');
    console.log('Usage:');
    console.log('  Auto login:     node src/puppeteer-auth.js <username> <password> [email]');
    console.log('  Manual login:   node src/puppeteer-auth.js --manual');
    console.log('  Check session:  node src/puppeteer-auth.js --check');
    console.log('');
    console.log('Examples:');
    console.log('  node src/puppeteer-auth.js Nopsy_pw mypass123 email@gmail.com');
    console.log('  node src/puppeteer-auth.js --manual    # login manually, auto extract cookies');
    console.log('');
    process.exit(1);
  }
}

module.exports = { loginToX, manualLogin, ensureValidSession, loadCookies };
