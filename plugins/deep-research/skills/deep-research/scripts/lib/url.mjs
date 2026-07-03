/**
 * Deterministic URL canonicalization (design section 10.3).
 * Canonicalization failures are reported, never guessed around.
 */

const TRACKING_PARAM_PATTERNS = [
  /^utm_/i,
  /^gclid$/i,
  /^fbclid$/i,
  /^msclkid$/i,
  /^mc_cid$/i,
  /^mc_eid$/i,
  /^igshid$/i,
  /^ref_src$/i,
  /^cmpid$/i,
];

export function isTrackingParam(name) {
  return TRACKING_PARAM_PATTERNS.some((re) => re.test(name));
}

/**
 * @returns {{ok: true, canonical: string, hostname: string} | {ok: false, reason: string}}
 */
export function canonicalizeUrl(rawUrl) {
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    return { ok: false, reason: "empty_url" };
  }
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, reason: "unparsable_url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: `unsupported_scheme:${url.protocol.replace(":", "")}` };
  }

  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith("www.")) {
    hostname = hostname.slice(4);
  }
  if (hostname === "") {
    return { ok: false, reason: "empty_hostname" };
  }

  const params = new URLSearchParams(url.search);
  const kept = [];
  for (const [name, value] of params.entries()) {
    if (!isTrackingParam(name)) {
      kept.push([name, value]);
    }
  }
  kept.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const search = kept.length > 0
    ? "?" + kept.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
    : "";

  let pathname = url.pathname || "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.replace(/\/+$/, "");
    if (pathname === "") pathname = "/";
  }

  const port = url.port ? `:${url.port}` : "";
  const canonical = `${url.protocol}//${hostname}${port}${pathname}${search}`;
  return { ok: true, canonical, hostname };
}

/**
 * Normalize a publisher group label: Unicode NFKC, lowercase, trim,
 * collapse runs of whitespace and hyphens into a single hyphen.
 */
export function normalizePublisherGroup(label) {
  if (typeof label !== "string") return null;
  const normalized = label
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "-");
  return normalized === "" ? null : normalized;
}

/**
 * Deterministic independence key (design section 10.3).
 * Priority: originUrl > publisherGroup > canonical hostname.
 * @returns {{key: string, confidence: "established" | "provisional"}}
 */
export function independenceKey({ originUrl, publisherGroup, canonicalHostname }) {
  if (originUrl) {
    const canon = canonicalizeUrl(originUrl);
    if (canon.ok) {
      return { key: `origin:${canon.canonical}`, confidence: "established" };
    }
  }
  const group = normalizePublisherGroup(publisherGroup);
  if (group) {
    return { key: `publisher:${group}`, confidence: "established" };
  }
  return { key: `host:${canonicalHostname}`, confidence: "provisional" };
}
