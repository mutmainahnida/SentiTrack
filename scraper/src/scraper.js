const { Scraper, SearchMode } = require('@the-convocation/twitter-scraper');
const { Cookie } = require('tough-cookie');

let scraper = null;
let sessionLoaded = false;
let initPromise = null;


async function loadSession() {
  if (initPromise) return initPromise;
  if (sessionLoaded) return Promise.resolve();

  const fs = require('fs');
  const path = require('path');
  const cookieFile = path.join(__dirname, '..', 'cookies.json');
  if (!fs.existsSync(cookieFile)) return Promise.resolve();

  let session;
  try {
    session = JSON.parse(fs.readFileSync(cookieFile, 'utf8'));
  } catch {
    return Promise.resolve();
  }

  if (!session || !session.cookieString) return Promise.resolve();

  initPromise = (async () => {
    scraper = new Scraper();
    const cookieStrings = session.cookieString.split(';').map(s => s.trim()).filter(Boolean);
    const cookies = [];
    for (const cs of cookieStrings) {
      try {
        const c = Cookie.parse(cs);
        if (c) {
          cookies.push(`${c.key}=${c.value}`);
        }
      } catch {
      }
    }

    await scraper.setCookies(cookies);

    const loggedIn = await scraper.isLoggedIn();
    if (!loggedIn) {
      console.warn('[scraper] Cookie session invalid — isLoggedIn=false');
      scraper = null;
      sessionLoaded = false;
      return;
    }

    sessionLoaded = true;
    console.log(`[scraper] Session loaded — ${cookies.length} cookies active`);
  })();

  return initPromise;
}

/**
 * Set cookies directly (used by /login/save)
 * @param {string} cookieString
 * @param {string} _csrfToken
 * @returns {Promise<void>}
 */
async function setCookies(cookieString, _csrfToken) {
  scraper = new Scraper();

  const cookieStrings = cookieString.split(';').map(s => s.trim()).filter(Boolean);
  await scraper.setCookies(cookieStrings);

  const isLoggedIn = await scraper.isLoggedIn();
  if (!isLoggedIn) {
    console.warn('[scraper] Cookie session invalid after setCookies');
    scraper = null;
    return;
  }

  sessionLoaded = true;
  console.log(`[scraper] Cookies set — ${cookieStrings.length} cookies`);
}

/**
 * Get current login status.
 * @returns {Promise<boolean>}
 */
async function isLoggedIn() {
  if (!scraper) {
    console.warn('[scraper.isLoggedIn] no scraper instance');
    return false;
  }
  const result = await scraper.isLoggedIn();
  console.log('[scraper.isLoggedIn]', result, 'scraper ready:', !!scraper);
  return result;
}

/**
 * Search tweets.
 * @param {string} query
 * @param {number} limit
 * @param {'Top'|'Latest'} [product]
 * @returns {Promise<import('@the-convocation/twitter-scraper').Tweet[]>}
 */
async function searchTweets(query, limit, product = 'Top') {
  if (!scraper) {
    await loadSession();
  }
  if (!scraper) throw new Error('Scraper not initialized');

  const mode = product === 'Latest' ? SearchMode.Latest : SearchMode.Top;

  /** @type {import('@the-convocation/twitter-scraper').Tweet[]} */
  const tweets = [];

  for await (const tweet of scraper.searchTweets(query, limit, mode)) {
    if (!tweet.id) continue;
    tweets.push({
      id: tweet.id,
      text: tweet.text || '',
      username: tweet.username || '',
      name: tweet.name || '',
      timestamp: tweet.timestamp || 0,
      likes: tweet.likes || 0,
      retweets: tweet.retweets || 0,
      replies: tweet.replies || 0,
      views: tweet.views || 0,
      isRetweet: tweet.isRetweet || false,
      isReply: tweet.isReply || false,
      hashtags: tweet.hashtags || [],
      urls: tweet.urls || [],
      photos: tweet.photos || [],
      videos: tweet.videos || [],
      conversationId: tweet.conversationId,
      inReplyToStatusId: tweet.inReplyToStatusId,
      quotedStatusId: tweet.quotedStatusId,
      userId: tweet.userId,
      permanentUrl: tweet.permanentUrl,
      timeParsed: tweet.timeParsed,
    });
  }

  return tweets;
}

/**
 * Get a single tweet by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getTweet(id) {
  if (!scraper) {
    await loadSession();
  }
  if (!scraper) throw new Error('Scraper not initialized');
  return await scraper.getTweet(id);
}

/**
 * Get a user profile by username.
 * @param {string} username
 * @returns {Promise<object|null>}
 */
async function getProfile(username) {
  if (!scraper) {
    await loadSession();
  }
  if (!scraper) throw new Error('Scraper not initialized');
  return await scraper.getProfile(username);
}

module.exports = { loadSession, setCookies, isLoggedIn, searchTweets, getTweet, getProfile };
