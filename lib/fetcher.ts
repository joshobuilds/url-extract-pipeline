import * as cheerio from 'cheerio';

const MAX_BYTES = 800_000;
const TIMEOUT_MS = 15_000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; UrlExtractBot/0.1; +https://github.com/joshobuilds/url-extract-pipeline)';

export type FetchedPage = {
  html: string;
  finalUrl: string;
  contentType: string;
  truncated: boolean;
  byteCount: number;
};

export async function fetchAndClean(url: string): Promise<FetchedPage> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL. Include the scheme, e.g. https://example.com.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.8',
      },
      redirect: 'follow',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (controller.signal.aborted) {
      throw new Error(`Fetch timed out after ${TIMEOUT_MS}ms.`);
    }
    throw new Error(`Fetch failed: ${msg}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Fetch failed: HTTP ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get('content-type') ?? 'text/html';
  if (!/html|xml|json|text/i.test(contentType)) {
    throw new Error(
      `Unsupported content-type: ${contentType}. This tool only handles HTML, XML, JSON, or text.`,
    );
  }

  const text = await res.text();
  const truncated = text.length > MAX_BYTES;
  const body = truncated ? text.slice(0, MAX_BYTES) : text;
  const cleaned = contentType.includes('json') ? body : cleanHtml(body, res.url);

  return {
    html: cleaned,
    finalUrl: res.url,
    contentType,
    truncated,
    byteCount: text.length,
  };
}

function cleanHtml(raw: string, baseUrl: string): string {
  const $ = cheerio.load(raw);

  $('script, style, noscript, svg, iframe, link, template, canvas, picture source').remove();
  $('*')
    .contents()
    .each(function () {
      if (this.type === 'comment') $(this).remove();
    });

  const KEEP = new Set(['href', 'src', 'alt', 'title', 'aria-label', 'datetime', 'value']);
  $('*').each(function () {
    const el = $(this);
    const node = this as unknown as { attribs?: Record<string, string> };
    const attribs = node.attribs;
    if (!attribs) return;
    for (const name of Object.keys(attribs)) {
      if (!KEEP.has(name)) el.removeAttr(name);
    }
  });

  $('a[href]').each(function () {
    const el = $(this);
    const href = el.attr('href');
    if (!href) return;
    try {
      el.attr('href', new URL(href, baseUrl).toString());
    } catch {
      // leave as-is
    }
  });
  $('[src]').each(function () {
    const el = $(this);
    const src = el.attr('src');
    if (!src) return;
    try {
      el.attr('src', new URL(src, baseUrl).toString());
    } catch {
      // leave as-is
    }
  });

  const body = $('body').html() ?? $.html();
  return body.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
