const https = require('https');
const http = require('http');

const BASE_HEADERS = {
  authority: 'x.com',
  accept: '*/*',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'content-type': 'application/json',
  origin: 'https://x.com',
  priority: 'u=1, i',
  referer: 'https://x.com/',
  'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  'x-twitter-client-language': 'en',
  'x-client-transaction-id': '',
};

const OPS = {
  searchTimeline:   'pCd62NDD9dlCDgEGgEVHMg',
  tweetDetail:      'rU08O-YiXdr0IZfE7qaUMg',
  userByScreenName: 'IGgvgiOx4QZndDHuD3x9TQ'
};

const FEATURES = JSON.stringify({
  rweb_video_screen_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: false,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_annotations_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  content_disclosure_indicator_enabled: true,
  content_disclosure_ai_generated_indicator_enabled: true,
  responsive_web_grok_show_grok_translated_post: true,
  responsive_web_grok_analysis_button_from_backend: true,
  post_ctas_fetch_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: false,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: true,
  responsive_web_enhance_cards_enabled: false
});

function buildHeaders(extra = {}) {
  const h = Object.assign({}, BASE_HEADERS, extra);
  h['x-client-transaction-id'] = Math.random().toString(36).substring(2, 11);
  if (!h['x-guest-token']) delete h['x-guest-token'];
  return h;
}

function httpRequest(url, headers) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers, timeout: 20000 }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const enc = (res.headers['content-encoding'] || '').split(',')[0].trim();
        try {
          let body;
          if (enc === 'br') {
            body = require('zlib').brotliDecompressSync(buf).toString('utf8');
          } else if (enc === 'gzip') {
            body = require('zlib').gunzipSync(buf).toString('utf8');
          } else {
            body = buf.toString('utf8');
          }
          resolve({ status: res.statusCode, body, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: buf.toString('utf8'), headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

const { loadCookies, ensureValidSession } = require('./puppeteer-auth');

let cookieJar = '';
let csrfToken = '';
let guestToken = '';
let sessionLoaded = false;

async function loadSession() {
  if (sessionLoaded) return;
  const session = loadCookies();
  if (session) {
    cookieJar = session.cookieString;
    csrfToken = session.csrfToken;
    guestToken = '';
    sessionLoaded = true;
    console.log('Session loaded from cookies.json');
  }
}

async function refreshGuestToken() {
  const { status, body, headers } = await httpRequest('https://api.x.com/1.1/guest/activate.json', buildHeaders({
    'x-guest-token': 'placeholder'
  }));

  if (status === 200 && body) {
    try {
      const data = JSON.parse(body);
      guestToken = data.guest_token;
      return guestToken;
    } catch (e) {}
  }

  const { body: html } = await httpRequest('https://x.com/', buildHeaders());
  const gtMatch = html.match(/gt=(\d+)/);
  if (gtMatch) {
    guestToken = gtMatch[1];
    return guestToken;
  }

  throw new Error('Cannot obtain guest token - X.com may require login');
}

async function apiSearch(query, product = 'Top', count = 20) {
  await loadSession();
  if (!csrfToken) await refreshGuestToken();

  const variables = JSON.stringify({
    rawQuery: query,
    count,
    querySource: 'typeahead_click',
    product,
    withGrokTranslatedBio: true
  });

  const headers = buildHeaders({
    authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'x-csrf-token': csrfToken,
    'x-guest-token': guestToken,
    'x-twitter-active-user': csrfToken ? 'yes' : 'no',
    'x-twitter-auth-type': csrfToken ? 'OAuth2Session' : '',
    cookie: cookieJar
  });

  const url = `https://x.com/i/api/graphql/${OPS.searchTimeline}/SearchTimeline?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(FEATURES)}`;
  console.log("REQUESTING URL:", url);

  const { status, body } = await httpRequest(url, headers);

  if (status === 403 || status === 401) {
    throw new Error(`Auth failed (${status}) - cookies expired. Update session cookies in graphql.js`);
  }
  if (status !== 200) {
    throw new Error(`HTTP ${status}: ${body}`);
  }

  const data = JSON.parse(body);
  const timeline = data?.data?.search_by_raw_query?.search_timeline?.timeline;
  if (!timeline) return [];

  const tweets = [];
  for (const instr of (timeline.instructions || [])) {
    if (instr.type === 'TimelineAddEntries') {
      for (const entry of (instr.entries || [])) {
        const tweet = parseTweet(entry);
        if (tweet) tweets.push(tweet);
      }
    }
  }
  return tweets;
}

async function apiTweetDetail(tweetId) {
  await loadSession();
  if (!csrfToken) await refreshGuestToken();

  const variables = JSON.stringify({
    focalTweetId: tweetId,
    rankingMode: 'Relevance',
    includePromotedContent: true,
    withCommunity: true,
    withQuickPromoteEligibilityTweetFields: true,
    withBirdwatchNotes: true,
    withVoice: true
  });

  const headers = buildHeaders({
    authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'x-csrf-token': csrfToken,
    'x-guest-token': guestToken,
    'x-twitter-active-user': csrfToken ? 'yes' : 'no',
    'x-twitter-auth-type': csrfToken ? 'OAuth2Session' : '',
    cookie: cookieJar
  });

  const url = `https://x.com/i/api/graphql/${OPS.tweetDetail}/TweetDetail?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(FEATURES)}`;

  const { status, body } = await httpRequest(url, headers);

  if (status === 403 || status === 401) {
    throw new Error(`Auth failed (${status}) - cookies expired. Update session cookies in graphql.js`);
  }
  if (status !== 200) {
    throw new Error(`HTTP ${status}: ${body}`);
  }

  const data = JSON.parse(body);
  const instructions = data?.data?.threaded_conversation_with_injections_v2?.instructions;
  if (!instructions) return { main: null, replies: [] };

  let mainTweet = null;
  const replies = [];

  for (const instr of instructions) {
    for (const entry of (instr.entries || [])) {
      const tweet = parseTweet(entry);
      if (!tweet) continue;
      const displayType = entry.content?.itemContent?.tweetDisplayType;
      if (displayType === 'SelfThread') {
        mainTweet = tweet;
      } else {
        replies.push(tweet);
      }
    }
  }

  return { main: mainTweet, replies };
}

async function apiUserByScreenName(screenName) {
  await loadSession();
  if (!csrfToken) await refreshGuestToken();

  const variables = JSON.stringify({
    screen_name: screenName,
    withSafetyModeUserFields: true,
    withSuperFollowsUserFields: true
  });

  const headers = buildHeaders({
    authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'x-csrf-token': csrfToken,
    'x-guest-token': guestToken,
    'x-twitter-active-user': csrfToken ? 'yes' : 'no',
    'x-twitter-auth-type': csrfToken ? 'OAuth2Session' : '',
    cookie: cookieJar
  });

  const url = `https://x.com/i/api/graphql/${OPS.userByScreenName}/UserByScreenName?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(FEATURES)}`;

  const { status, body } = await httpRequest(url, headers);

  if (status === 403 || status === 401) {
    throw new Error(`Auth failed (${status}) - cookies expired. Update session cookies in graphql.js`);
  }
  if (status !== 200) {
    throw new Error(`HTTP ${status}: ${body}`);
  }

  const data = JSON.parse(body);
  console.log("RAW BODY:", JSON.stringify(data, null, 2).substring(0, 500));
  const user = data?.data?.userByScreenName?.result ?? data?.data?.user?.result;
  if (!user) return null;

  const core = user.core;
  const legacy = user.legacy;

  return {
    id: user.rest_id || '',
    name: core?.name || '',
    screen_name: core?.screen_name || '',
    description: legacy?.description || '',
    followers_count: legacy?.followers_count || 0,
    friends_count: legacy?.friends_count || 0,
    statuses_count: legacy?.statuses_count || 0,
    location: user.location?.location || '',
    profile_image_url: user.avatar?.image_url || '',
    verified: user.is_blue_verified || false,
    created_at: core?.created_at || ''
  };
}

function parseTweet(entry) {
  const item = entry.content?.itemContent;
  const result = item?.tweet_results?.result;
  if (!result?.legacy) return null;

  const ur = result.core?.user_results?.result;
  const userCore = ur?.core;
  const userLegacy = ur?.legacy;

  return {
    id: result.rest_id || '',
    full_text: result.legacy.full_text || '',
    created_at: result.legacy.created_at || '',
    reply_count: result.legacy.reply_count || 0,
    retweet_count: result.legacy.retweet_count || 0,
    like_count: result.legacy.favorite_count || 0,
    quote_count: result.legacy.quote_count || 0,
    bookmark_count: result.legacy.bookmark_count || 0,
    views: parseInt(result.views?.count || '0', 10),
    hashtags: (result.legacy.entities?.hashtags || []).map(h => h.text),
    mentions: (result.legacy.entities?.user_mentions || []).map(m => m.screen_name),
    urls: (result.legacy.entities?.urls || []).map(u => u.url),
    lang: result.legacy.lang || '',
    conversation_id: result.legacy.conversation_id_str || '',
    user_name: userCore?.name || '',
    user_screen_name: userCore?.screen_name || '',
    user_id: ur?.rest_id || '',
    user_followers: userLegacy?.followers_count || 0,
    user_friends: userLegacy?.friends_count || 0,
    user_verified: ur?.is_blue_verified || false,
    user_location: ur?.location?.location || '',
    user_description: userLegacy?.description || '',
    user_profile_image: ur?.avatar?.image_url || '',
    translation: result.grok_translated_post_with_availability?.data?.translation || null
  };
}

function setCookies(cookies, csrf) {
  cookieJar = cookies;
  csrfToken = csrf;
  guestToken = '';
  sessionLoaded = true;
}

module.exports = { apiSearch, apiTweetDetail, apiUserByScreenName, setCookies, loadSession };
