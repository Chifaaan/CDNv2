/** Shortcode extraction + clean publish link helpers. */

const HOST_RULES: { test: RegExp; extract: RegExp }[] = [
  { test: /instagram\.com|instagr\.am/i, extract: /\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/ },
  { test: /tiktok\.com/i, extract: /\/(?:video|photo|v)\/(\d{8,})/ },
  { test: /youtube\.com|youtu\.be/i, extract: /(?:shorts\/|watch\?v=|youtu\.be\/|live\/)([A-Za-z0-9_-]{6,})/ },
  { test: /facebook\.com|fb\.watch/i, extract: /\/(?:videos?|reel|watch\/?\?v=)\/?(\d{6,})/ },
  { test: /twitter\.com|x\.com/i, extract: /\/status\/(\d+)/ },
  { test: /threads\.net/i, extract: /\/post\/([A-Za-z0-9_-]{5,})/ },
];

export function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^(www\.)?[a-z0-9-]+\.[a-z]{2,}/i.test(s)) return `https://${s}`;
  return s;
}

/** Strip tracking params + hash so the link can be compared / scraped cleanly. */
export function cleanPublishLink(raw: string): string {
  const s = normalizeUrl(raw);
  if (!s) return "";
  try {
    const u = new URL(s);
    u.search = "";
    u.hash = "";
    let path = u.pathname.replace(/\/+$/, "");
    return `${u.origin}${path}`;
  } catch {
    return s.split("?")[0].split("#")[0].replace(/\/+$/, "");
  }
}

export function extractShortcode(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const url = normalizeUrl(s);
  for (const rule of HOST_RULES) {
    if (rule.test.test(url)) {
      const m = url.match(rule.extract);
      if (m?.[1]) return m[1];
      return "";
    }
  }
  // Bare shortcode pasted into the cell.
  if (/^[A-Za-z0-9_-]{6,}$/.test(s)) return s;
  return "";
}

export function platformOf(raw: string): "Instagram" | "TikTok" | "YouTube" | "Facebook" | "X" | "Link" {
  const s = raw.toLowerCase();
  if (s.includes("instagram")) return "Instagram";
  if (s.includes("tiktok")) return "TikTok";
  if (s.includes("youtube") || s.includes("youtu.be")) return "YouTube";
  if (s.includes("facebook") || s.includes("fb.watch")) return "Facebook";
  if (s.includes("twitter") || /\/\/x\.com/.test(s)) return "X";
  return "Link";
}

export function buildShortcodeIndex(projects: { brandId: string; campaignId: string; rows: { shortcode: string }[] }[]) {
  const map = new Map<string, string>();
  for (const p of projects) {
    for (const r of p.rows) {
      if (!r.shortcode) continue;
      const key = `${p.brandId}::${r.shortcode}`;
      if (!map.has(key)) map.set(key, p.campaignId);
    }
  }
  return map;
}

export function lookupCampaign(index: Map<string, string>, brandId: string, shortcode: string) {
  if (!shortcode) return null;
  return index.get(`${brandId}::${shortcode}`) ?? null;
}
