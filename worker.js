// Cloudflare Worker: first-party check-in + download gateway for easyscanlate.site.
//
// Routes:
//   POST /event    Generic JSON check-in from /js/e.js.
//                  Body: { event, path, ref, sid, lang, tz, os, sw, sh,
//                          utm: { utm_source, utm_medium, utm_campaign },
//                          engaged (0|1), score, d: {...}, via }
//   POST /visit    Legacy alias from the old inline tracker.
//                  Treated as an engaged view (old client only fired post-engagement).
//   GET  /download Tracked redirect to an allowlisted file host.
//
// Bots are still recorded (suspected_bot = 1) so raw visit volume stays
// visible — filter with `suspected_bot = 0` (and/or `engaged = 1`) for
// human numbers.
//
// D1 setup: run schema.sql once against the bound database.

const ALLOWED_HOSTS = ["easyscanlate.site", "www.easyscanlate.site"];
const ALLOWED_ORIGIN = "https://easyscanlate.site";
const ALLOWED_DOWNLOAD_DOMAINS = ["github.com", "objects.githubusercontent.com"];

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_BODY_BYTES = 8192;
const EVENT_RE = /^[a-z][a-z0-9_]{0,31}$/;
const BOT_UA_RE =
  /bot|crawl|spider|slurp|mediapartners|baidu|yandex|sogou|exabot|facebot|ia_archiver|headless|puppeteer|playwright|selenium|phantomjs|lighthouse|pagespeed|pingdom|uptimerobot|monitor|checker|petal|semrush|ahrefs|mj12|dotbot|amazonbot|gptbot|claudebot|claude-agent|ccbot|applebot|bingpreview|discordbot|telegrambot|whatsapp|slackbot|twitterbot|facebookexternalhit|linkedinbot|embedly|quora|pinterest|redditbot|nuzzel|outbrain|taboola|python-requests|python-urllib|curl|wget|go-http|java\/|okhttp|axios|node-fetch|httpclient|libwww-perl/i;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function truncate(value, max) {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

function dayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// Exact-host check (the old `startsWith(ALLOWED_ORIGIN)` also matched
// origins like https://easyscanlate.site.evil.com).
function firstParty(request) {
  const candidate = request.headers.get("Origin") || request.headers.get("Referer") || "";
  if (!candidate) return false;
  try {
    return ALLOWED_HOSTS.includes(new URL(candidate).hostname);
  } catch {
    return false;
  }
}

function parseUA(ua) {
  const os = /windows/i.test(ua)
    ? "windows"
    : /android/i.test(ua)
      ? "android"
      : /iphone|ipad|ipod/i.test(ua)
        ? "ios"
        : /mac os/i.test(ua)
          ? "macos"
          : /linux/i.test(ua)
            ? "linux"
            : "other";
  const browser = /edg\//i.test(ua)
    ? "edge"
    : /opr\/|opera/i.test(ua)
      ? "opera"
      : /chrome\//i.test(ua)
        ? "chrome"
        : /firefox\//i.test(ua)
          ? "firefox"
          : /safari\//i.test(ua)
            ? "safari"
            : "other";
  const device = /mobile|android|iphone|ipad|ipod/i.test(ua) ? "mobile" : "desktop";
  return { os, browser, device };
}

// Suspected bots are flagged, NOT dropped — raw volume stays queryable.
function suspectedBot(request, ua) {
  if (ua && BOT_UA_RE.test(ua)) return 1;
  const cf = request.cf || {};
  const bm = cf.botManagement || {};
  if (bm.verifiedBot) return 1;
  if (typeof bm.score === "number" && bm.score < 30) return 1;
  return 0;
}

function legacyUpsert(env, name) {
  return env.DB.prepare(
    `
      INSERT INTO analytics (event_name, count)
      VALUES (?, 1)
      ON CONFLICT(event_name) DO UPDATE SET count = count + 1
    `,
  ).bind(name);
}

async function recordEvent(env, row) {
  const stmts = [
    env.DB.prepare(
      `
        INSERT INTO events (ts, day, event, path, ref, sid, country, os, browser, device, lang, engaged, suspected_bot, props)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).bind(
      row.ts,
      row.day,
      row.event,
      row.path,
      row.ref,
      row.sid,
      row.country,
      row.os,
      row.browser,
      row.device,
      row.lang,
      row.engaged,
      row.bot,
      row.props,
    ),
    env.DB.prepare(
      `
        INSERT INTO events_daily (day, event, path, count, engaged_count, bot_count)
        VALUES (?, ?, ?, 1, ?, ?)
        ON CONFLICT(day, event, path) DO UPDATE SET
          count = count + 1,
          engaged_count = engaged_count + excluded.engaged_count,
          bot_count = bot_count + excluded.bot_count
      `,
    ).bind(row.day, row.event, row.path || "", row.engaged, row.bot),
  ];

  // Legacy counters so existing totals keep their meaning:
  // website_visit = engaged views (what the old tracker counted).
  if (row.event === "view" && row.engaged) {
    stmts.push(legacyUpsert(env, "website_visit"));
    stmts.push(
      env.DB.prepare(
        `
          INSERT INTO analytics_timeline (event_name, origin)
          VALUES ('website_visit', ?)
        `,
      ).bind(row.origin),
    );
  } else if (row.event === "view") {
    stmts.push(legacyUpsert(env, "visit_raw"));
    if (row.bot) stmts.push(legacyUpsert(env, "visit_bot"));
  } else if (row.event === "file_download") {
    stmts.push(legacyUpsert(env, "file_download"));
    stmts.push(
      env.DB.prepare(
        `
          INSERT INTO analytics_timeline (event_name, url)
          VALUES ('file_download', ?)
        `,
      ).bind(row.target),
    );
  } else if (row.event === "download_click") {
    stmts.push(legacyUpsert(env, "download_click"));
  }

  await env.DB.batch(stmts);
}

function requestMeta(request) {
  const ua = truncate(request.headers.get("User-Agent") || "", 256);
  const parsed = parseUA(ua);
  return {
    ua,
    parsed,
    bot: suspectedBot(request, ua),
    country: truncate(((request.cf || {}).country || ""), 4),
    origin: truncate(
      request.headers.get("Origin") || request.headers.get("Referer") || "",
      512,
    ),
  };
}

function refPath(request, fallback = "/") {
  try {
    const ref = request.headers.get("Referer");
    if (ref) return truncate(new URL(ref).pathname || "/", 256);
  } catch {
    /* keep fallback */
  }
  return fallback;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // --------------------------------------------------
    // ENDPOINT 1: Generic check-in (JSON)
    // --------------------------------------------------
    if (url.pathname === "/event") {
      if (request.method !== "POST") {
        return json({ ok: false }, 405);
      }
      if (!firstParty(request)) {
        return json({ ok: false }, 403);
      }

      let raw = "";
      try {
        raw = await request.text();
      } catch {
        return json({ ok: false }, 400);
      }
      if (raw.length > MAX_BODY_BYTES) {
        return json({ ok: false }, 413);
      }

      let body;
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        return json({ ok: false }, 400);
      }

      const event =
        typeof body.event === "string" ? body.event.toLowerCase().slice(0, 32) : "";
      if (!EVENT_RE.test(event)) {
        return json({ ok: false }, 400);
      }

      const meta = requestMeta(request);
      const utm = body.utm && typeof body.utm === "object" ? body.utm : {};
      const extra = body.d && typeof body.d === "object" ? body.d : {};
      const now = Date.now();

      try {
        await recordEvent(env, {
          ts: now,
          day: dayString(new Date(now)),
          event,
          path: truncate(typeof body.path === "string" && body.path ? body.path : "/", 256),
          ref: truncate(typeof body.ref === "string" ? body.ref : "", 512),
          sid: truncate(typeof body.sid === "string" ? body.sid : "", 64),
          country: meta.country,
          os: truncate(
            typeof body.os === "string" && body.os ? body.os : meta.parsed.os,
            32,
          ),
          browser: meta.parsed.browser,
          device: meta.parsed.device,
          lang: truncate(typeof body.lang === "string" ? body.lang : "", 16),
          engaged: body.engaged ? 1 : 0,
          bot: meta.bot,
          props: truncate(
            JSON.stringify({
              score: typeof body.score === "number" ? body.score : 0,
              sw: typeof body.sw === "number" ? body.sw : 0,
              sh: typeof body.sh === "number" ? body.sh : 0,
              tz: truncate(typeof body.tz === "string" ? body.tz : "", 64),
              utm_source: truncate(typeof utm.utm_source === "string" ? utm.utm_source : "", 64),
              utm_medium: truncate(typeof utm.utm_medium === "string" ? utm.utm_medium : "", 64),
              utm_campaign: truncate(
                typeof utm.utm_campaign === "string" ? utm.utm_campaign : "",
                64,
              ),
              target: truncate(typeof extra.target === "string" ? extra.target : "", 512),
              via: truncate(typeof body.via === "string" ? body.via : "", 32),
            }),
            2000,
          ),
          origin: meta.origin,
          target: "",
        });

        return json({ ok: true });
      } catch {
        return json({ ok: false }, 500);
      }
    }

    // --------------------------------------------------
    // ENDPOINT 2: Legacy visit alias (old inline tracker)
    // --------------------------------------------------
    if (url.pathname === "/visit") {
      if (request.method !== "POST") {
        return json({ ok: false }, 405);
      }
      if (!firstParty(request)) {
        return json({ ok: false }, 403);
      }

      // Old client only fired after passing the engagement gate.
      const meta = requestMeta(request);
      const now = Date.now();
      try {
        await recordEvent(env, {
          ts: now,
          day: dayString(new Date(now)),
          event: "view",
          path: refPath(request),
          ref: "",
          sid: "",
          country: meta.country,
          os: meta.parsed.os,
          browser: meta.parsed.browser,
          device: meta.parsed.device,
          lang: "",
          engaged: 1,
          bot: meta.bot,
          props: JSON.stringify({ via: "legacy" }),
          origin: meta.origin,
          target: "",
        });

        return json({ ok: true });
      } catch {
        return json({ ok: false }, 500);
      }
    }

    // --------------------------------------------------
    // ENDPOINT 3: Tracked download + redirect
    // --------------------------------------------------
    if (url.pathname === "/download") {
      const targetUrlString = url.searchParams.get("url");

      if (!targetUrlString) {
        return new Response("Missing 'url' parameter", { status: 400 });
      }

      try {
        const targetUrl = new URL(targetUrlString);

        if (!ALLOWED_DOWNLOAD_DOMAINS.includes(targetUrl.hostname)) {
          return new Response("Unauthorized redirect domain", { status: 403 });
        }

        const meta = requestMeta(request);
        const now = Date.now();
        const row = {
          ts: now,
          day: dayString(new Date(now)),
          event: "file_download",
          path: refPath(request),
          ref: "",
          sid: truncate(url.searchParams.get("sid") || "", 64),
          country: meta.country,
          os: meta.parsed.os,
          browser: meta.parsed.browser,
          device: meta.parsed.device,
          lang: "",
          engaged: 1,
          bot: meta.bot,
          props: truncate(
            JSON.stringify({ target: targetUrl.toString().slice(0, 512) }),
            2000,
          ),
          origin: truncate(request.headers.get("Referer") || "", 512),
          target: targetUrl.toString(),
        };

        // Don't block the redirect; write all rows in the background.
        ctx.waitUntil(recordEvent(env, row));

        return Response.redirect(targetUrl.toString(), 302);
      } catch {
        return new Response("Invalid URL or Server Error", { status: 400 });
      }
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};
