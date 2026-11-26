/* ==========================================================================
   MANGAVERSE VN 5.0 — MULTI-SOURCE & LIVE CRAWLER GATEWAY
   Integrates ALL Major Vietnamese & International Comic Repositories:
     1. NetTruyen / NhatTruyen Crawler (nhattruyenqq.com + beercloudy.com CDN)
     2. OTruyen API (otruyenapi.com/v1/api) + TruyenQQ / OTruyen CDN Crawler (truyenqq.cx + sv1.otruyencdn.com)
     3. Cứu Truyện VN API v2 (cuutruyen.net / hetcuutruyen.net — Full HD + DRM v4)
     4. MangaDex VN API v5 (api.mangadex.org — 6,746+ Vietnamese Comics)
     5. MangaDex Global Catalog (75,000+ English Comics)
     6. Google/Cloudflare DNS Resolver (8.8.8.8 / 1.1.1.1) to bypass ISP DNS Sinkholes
   Run with: node --use-system-ca server.js
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { URL } = require('url');
const syncEngine = require('./crawler-sync');

// Bypass Vietnamese ISP DNS Sinkholes (e.g., ::1 / 127.0.0.1 on comic domains)
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
const origLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return origLookup(hostname, options, callback);
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (!err && Array.isArray(addresses) && addresses.length > 0) {
      if (options && options.all) {
        return callback(null, addresses.map((a) => ({ address: a, family: 4 })));
      }
      return callback(null, addresses[0], 4);
    }
    return origLookup(hostname, options, callback);
  });
};

const PORT = process.env.PORT || 3080;
const HOST_BASE = `http://localhost:${PORT}`;

const MANGADEX_API = 'https://api.mangadex.org';
const CUUTRUYEN_API = 'https://cuutruyen.net/api/v2';
const OTRUYEN_API = 'https://otruyenapi.com/v1/api';
const NETTRUYEN_BASE = 'https://nhattruyenqq.com';
const TRUYENQQ_BASE = 'https://truyenqq.cx';

const USER_AGENT = 'MangaVerseVN/5.0 (MultiSourceCrawler; +http://localhost:3080)';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Memory Caches
const jsonCache = new Map();
const textCache = new Map();
const imgCache = new Map();
const JSON_TTL_MS = 8 * 60 * 1000;
const IMG_TTL_MS = 60 * 60 * 1000;
const MAX_IMG_CACHE_ITEMS = 450;

const GENRES = [
  { name: 'Action (Hành Động)', shortName: 'Hành Động', slug: 'action', tagId: '391b0423-d847-456f-aff0-8b0cfc03066b', ctTag: 'action', ntSlug: 'action-95' },
  { name: 'Fantasy (Giả Tưởng)', shortName: 'Giả Tưởng', slug: 'fantasy', tagId: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', ctTag: 'fantasy', ntSlug: 'fantasy-105' },
  { name: 'Tu Tiên / Tiên Hiệp', shortName: 'Tu Tiên', slug: 'tu-tien', tagId: '799c202e-7daa-44eb-9cf7-8a3c0441531e', ctTag: 'martial-arts', ntSlug: 'tu-tien' },
  { name: 'Manhwa (Hàn Quốc)', shortName: 'Manhwa 🇰🇷', slug: 'manhwa', origLang: 'ko', ctTag: 'manhwa', ntSlug: 'manhwa-11400' },
  { name: 'Manga (Nhật Bản)', shortName: 'Manga 🇯🇵', slug: 'manga', origLang: 'ja', ctTag: 'manga', ntSlug: 'manga-112' },
  { name: 'Manhua (Trung Quốc)', shortName: 'Manhua 🇨🇳', slug: 'manhua', origLang: 'zh', ctTag: 'manhua', ntSlug: 'manhua' },
  { name: 'Webtoon / Truyện Màu', shortName: 'Webtoon', slug: 'webtoon', origLang: 'ko', ctTag: 'webtoon', ntSlug: 'webtoon' },
  { name: 'Chuyển Sinh', shortName: 'Chuyển Sinh', slug: 'chuyen-sinh', tagId: '0bc90acb-ccc1-44ca-a34a-b9f3a73259d0', ctTag: 'reincarnation', ntSlug: 'chuyen-sinh-2130' },
  { name: 'Xuyên Không (Isekai)', shortName: 'Xuyên Không', slug: 'xuyen-khong', tagId: 'ace04997-f6bd-436e-b261-779182193d3d', ctTag: 'isekai', ntSlug: 'xuyen-khong-205' },
  { name: 'Romance (Lãng Mạn)', shortName: 'Lãng Mạn', slug: 'romance', tagId: '423e2eae-a7a2-4a8b-ac03-a8351462d71d', ctTag: 'romance', ntSlug: 'romance-121' },
  { name: 'Ngôn Tình', shortName: 'Ngôn Tình', slug: 'ngon-tinh', tagId: '423e2eae-a7a2-4a8b-ac03-a8351462d71d', ctTag: 'romance', ntSlug: 'ngon-tinh' },
  { name: 'Comedy (Hài Hước)', shortName: 'Hài Hước', slug: 'comedy', tagId: '4d32cc48-9f00-4cca-9b5a-a839f0764984', ctTag: 'comedy', ntSlug: 'comedy-99' },
  { name: 'Adventure (Phiêu Lưu)', shortName: 'Phiêu Lưu', slug: 'adventure', tagId: '87cc87cd-a395-47af-b27a-93258283bbc6', ctTag: 'adventure', ntSlug: 'adventure' },
  { name: 'Võ Thuật (Martial Arts)', shortName: 'Võ Thuật', slug: 'martial-arts', tagId: '799c202e-7daa-44eb-9cf7-8a3c0441531e', ctTag: 'martial-arts', ntSlug: 'martial-arts' },
  { name: 'Cổ Đại / Lịch Sử', shortName: 'Cổ Đại', slug: 'co-dai', tagId: '33771934-028e-4cb3-8744-691e866a923e', ctTag: 'historical', ntSlug: 'co-dai-207' },
  { name: 'Học Đường', shortName: 'Học Đường', slug: 'school-life', tagId: 'caaa44eb-cd40-4177-b930-79d3ef2afe87', ctTag: 'school-life', ntSlug: 'school-life' },
  { name: 'Drama (Kịch Tính)', shortName: 'Kịch Tính', slug: 'drama', tagId: 'b9af3a63-f058-46de-a9a0-e0c13906197a', ctTag: 'drama', ntSlug: 'drama-103' },
  { name: 'Phép Thuật (Magic)', shortName: 'Phép Thuật', slug: 'magic', tagId: 'a1f53773-c69a-4ce5-8cab-fffcd90b1565', ctTag: 'magic', ntSlug: 'fantasy-105' },
  { name: 'Siêu Nhiên', shortName: 'Siêu Nhiên', slug: 'supernatural', tagId: 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75', ctTag: 'supernatural', ntSlug: 'supernatural' },
  { name: 'Bí Ẩn / Trinh Thám', shortName: 'Trinh Thám', slug: 'mystery', tagId: 'ee968100-4191-4968-93d3-f82d72be7e46', ctTag: 'mystery', ntSlug: 'trinh-tham' },
  { name: 'Kinh Dị (Horror)', shortName: 'Kinh Dị', slug: 'horror', tagId: 'cdad7e68-1419-41dd-bdce-27753074a640', ctTag: 'horror', ntSlug: 'horror' },
  { name: 'Tâm Lý (Psychological)', shortName: 'Tâm Lý', slug: 'psychological', tagId: '3b60b75c-a2d7-4860-ab56-05f391bb889c', ctTag: 'psychological', ntSlug: 'psychological' },
  { name: 'Harem', shortName: 'Harem', slug: 'harem', tagId: 'aafb99c1-7f60-43fa-b75f-fc9502ce29c7', ctTag: 'harem', ntSlug: 'harem' },
  { name: 'Đời Thường (Slice of Life)', shortName: 'Đời Thường', slug: 'slice-of-life', tagId: 'e5301a23-ebd9-49dd-a0cb-2add944c7fe9', ctTag: 'slice-of-life', ntSlug: 'slice-of-life' },
  { name: 'Khoa Học Viễn Tưởng', shortName: 'Sci-Fi', slug: 'sci-fi', tagId: '256c8bd9-4904-4360-bf4f-508a76d67183', ctTag: 'sci-fi', ntSlug: 'sci-fi' },
  { name: 'Du Hành Thời Gian', shortName: 'Xuyên Thời Gian', slug: 'time-travel', tagId: '292e862b-2d17-4062-90a2-0356caa4ae27', ctTag: 'time-travel', ntSlug: 'xuyen-khong-205' },
  { name: 'Hệ Thống / Game', shortName: 'Trò Chơi / Hệ Thống', slug: 'video-games', tagId: '9438db5a-7e2a-4ac0-b39e-e0d95a34b8a8', ctTag: 'game', ntSlug: 'action-95' },
  { name: 'Thể Thao (Sports)', shortName: 'Thể Thao', slug: 'sports', tagId: '69964a64-2f90-4d33-beeb-f3ed2875eb4c', ctTag: 'sports', ntSlug: 'sports' },
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/* ==========================================================================
   NETWORK FETCH HELPERS (JSON & HTML)
   ========================================================================== */
async function cachedFetchJson(fullUrl, customHeaders = {}) {
  const cached = jsonCache.get(fullUrl);
  if (cached && Date.now() - cached.ts < JSON_TTL_MS) {
    return cached.data;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        ...customHeaders,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} on ${fullUrl}`);
    }
    const data = await res.json();
    jsonCache.set(fullUrl, { ts: Date.now(), data });
    return data;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function cachedFetchText(fullUrl, customHeaders = {}) {
  const cached = textCache.get(fullUrl);
  if (cached && Date.now() - cached.ts < JSON_TTL_MS) {
    return cached.data;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        ...customHeaders,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} on ${fullUrl}`);
    }
    const data = await res.text();
    textCache.set(fullUrl, { ts: Date.now(), data });
    return data;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/* ==========================================================================
   CRAWLER 1: NETTRUYEN / NHATTRUYEN ENGINE (nhattruyenqq.com)
   ========================================================================== */
function parseNetTruyenHtmlList(html) {
  const items = [];
  const seen = new Set();
  const blocks = html.split(/<div class=["']item["']>/i).slice(1);

  for (const block of blocks) {
    const linkMatch =
      block.match(/<figcaption>[\s\S]*?<h3>\s*<a[^>]+href=["']https?:\/\/[^/]+\/truyen-tranh\/([^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/i) ||
      block.match(/<h3>\s*<a[^>]+href=["']https?:\/\/[^/]+\/truyen-tranh\/([^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/i) ||
      block.match(/<a[^>]+href=["']https?:\/\/[^/]+\/truyen-tranh\/([^"'/?#]+)["'][^>]*title=["']([^"']+)["']/i);
    if (!linkMatch) continue;

    const rawSlug = linkMatch[1].trim();
    if (!rawSlug || seen.has(rawSlug)) continue;
    seen.add(rawSlug);

    const name = decodeHtmlEntities(linkMatch[2].replace(/<[^>]+>/g, '').replace(/^Truyện tranh\s+/i, ''));

    const imgMatch =
      block.match(/data-original=["']([^"']+)["']/i) ||
      block.match(/data-retries=["']([^"']+)["']/i) ||
      block.match(/<img[^>]+src=["']([^"']+)["']/i);
    let rawThumb = imgMatch ? imgMatch[1].trim() : '';
    if (rawThumb.startsWith('//')) rawThumb = `https:${rawThumb}`;
    if (rawThumb.startsWith('/')) rawThumb = `${NETTRUYEN_BASE}${rawThumb}`;
    const proxiedThumb = rawThumb ? `/api/img?url=${encodeURIComponent(rawThumb)}` : '';

    const chapMatch = block.match(/href=["']https?:\/\/[^/]+\/truyen-tranh\/[^/]+\/(chuong-[^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/i);
    const chapSlug = chapMatch ? chapMatch[1].trim() : '';
    const chapName = chapMatch
      ? decodeHtmlEntities(chapMatch[2].replace(/<[^>]+>/g, '').replace(/chapter\s*|chương\s*/i, ''))
      : 'Mới';

    items.push({
      _id: `nt-${rawSlug}`,
      slug: `nt-${rawSlug}`,
      source_id: 'nettruyen',
      source_name: '🟢 NetTruyen',
      name,
      origin_name: [],
      origin_code: 'zh',
      origin_label: '🟢 NetTruyen',
      status: 'ongoing',
      thumb_url: proxiedThumb,
      updatedAt: new Date().toISOString(),
      author: ['NetTruyen'],
      category: [{ id: 'manhua', name: 'Truyện Việt', slug: 'manhua' }],
      content: `Đọc truyện tranh ${name} bản dịch Tiếng Việt cập nhật nhanh nhất từ kho NetTruyen / NhatTruyen.`,
      chaptersLatest: [
        {
          chapter_name: chapName || 'Mới',
          chapter_api_data: chapSlug ? `/v1/api/chapter/nt-${rawSlug}__${chapSlug}` : '',
        },
      ],
    });
  }
  return items;
}

async function fetchNetTruyenList({ page = 1, keyword = '', genreSlug = '' }) {
  let url = page > 1 ? `${NETTRUYEN_BASE}/?page=${page}` : `${NETTRUYEN_BASE}/`;
  if (keyword) {
    url = `${NETTRUYEN_BASE}/tim-truyen?keyword=${encodeURIComponent(keyword)}${page > 1 ? `&page=${page}` : ''}`;
  } else if (genreSlug) {
    url = `${NETTRUYEN_BASE}/tim-truyen/${encodeURIComponent(genreSlug)}${page > 1 ? `?page=${page}` : ''}`;
  }

  let items = [];
  try {
    const html = await cachedFetchText(url, { Referer: `${NETTRUYEN_BASE}/` });
    items = parseNetTruyenHtmlList(html);
  } catch (_) {}

  const syncedNt = syncEngine.getSyncedList({ page, limit: 24, source: 'nettruyen', keyword })?.data?.items || [];
  const seen = new Set(items.map((i) => i.slug));
  for (const sItem of syncedNt) {
    if (!seen.has(sItem.slug)) {
      items.push(sItem);
      seen.add(sItem.slug);
    }
  }

  return {
    status: 'success',
    data: {
      items,
      params: {
        pagination: {
          totalItems: 35000,
          totalItemsPerPage: Math.max(24, items.length),
          currentPage: page,
        },
      },
    },
  };
}

async function fetchNetTruyenDetail(ntId) {
  const rawSlug = String(ntId).replace(/^nt-/, '');
  const [html, chapJsonText] = await Promise.all([
    cachedFetchText(`${NETTRUYEN_BASE}/truyen-tranh/${encodeURIComponent(rawSlug)}`, { Referer: `${NETTRUYEN_BASE}/` }),
    cachedFetchText(
      `${NETTRUYEN_BASE}/Comic/Services/ComicService.asmx/ChapterList?slug=${encodeURIComponent(rawSlug)}`,
      { Referer: `${NETTRUYEN_BASE}/truyen-tranh/${encodeURIComponent(rawSlug)}` }
    ).catch(() => '{"data":[]}'),
  ]);

  const titleMatch = html.match(/<h1[^>]*class=["']title-detail["'][^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const name = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '')) : rawSlug;

  const imgMatch =
    html.match(/class=["'][^"']*col-image[^"']*["'][\s\S]*?<img[^>]+(?:data-original|src)=["']([^"']+)["']/i) ||
    html.match(/meta property=["']og:image["'] content=["']([^"']+)["']/i);
  let rawThumb = imgMatch ? imgMatch[1].trim() : `https://v1.beercloudy.com/nettruyen/thumb/${rawSlug}.jpg`;
  if (rawThumb.startsWith('//')) rawThumb = `https:${rawThumb}`;
  const proxiedThumb = `/api/img?url=${encodeURIComponent(rawThumb)}`;

  const descMatch = html.match(/class=["']detail-content["'][\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
  const content = descMatch
    ? decodeHtmlEntities(descMatch[1].replace(/<[^>]+>/g, ''))
    : `Đọc truyện ${name} bản dịch Tiếng Việt đầy đủ các chương từ kho NetTruyen.`;

  const genres = [...html.matchAll(/href=["']https?:\/\/[^/]+\/tim-truyen\/([^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({
      id: m[1],
      name: decodeHtmlEntities(m[2].replace(/<[^>]+>/g, '')),
      slug: m[1],
    }))
    .slice(0, 6);

  const isCompleted = /Hoàn thành/i.test(html.match(/class=["']status[\s\S]{0,250}/i)?.[0] || '');

  let chapters = [];
  try {
    const parsed = JSON.parse(chapJsonText);
    if (Array.isArray(parsed?.data)) {
      chapters = parsed.data.map((c) => {
        const num = c.chapter_num ?? String(c.chapter_name || '').replace(/[^0-9.]/g, '');
        const cSlug = c.chapter_slug ? String(c.chapter_slug).replace(/^chapter-/i, 'chuong-') : `chuong-${num}`;
        return {
          chapter_name: String(num || c.chapter_name || '1'),
          chapter_title: c.updated_at ? `Cập nhật ${c.updated_at.split(' ')[0]}` : '',
          chapter_api_data: `/v1/api/chapter/nt-${rawSlug}__${cSlug}`,
          pages: c.image_num || 0,
        };
      });
    }
  } catch (_) {}

  return {
    status: 'success',
    data: {
      item: {
        _id: `nt-${rawSlug}`,
        slug: `nt-${rawSlug}`,
        source_id: 'nettruyen',
        source_name: '🟢 NetTruyen',
        name,
        origin_name: [],
        origin_code: 'zh',
        origin_label: '🟢 NetTruyen',
        status: isCompleted ? 'completed' : 'ongoing',
        thumb_url: proxiedThumb,
        updatedAt: new Date().toISOString(),
        author: ['NetTruyen Team'],
        category: genres.length > 0 ? genres : [{ id: 'manhua', name: 'Truyện Tranh', slug: 'manhua' }],
        content,
        chapters: [
          {
            server_name: `🟢 Server NetTruyen (${chapters.length} chương)`,
            server_data: chapters,
          },
        ],
      },
    },
  };
}

async function fetchNetTruyenChapterPages(rawCompoundId) {
  const clean = String(rawCompoundId).replace(/^nt-/, '');
  const [comicSlug, chapSlug] = clean.split('__');
  const targetUrl = `${NETTRUYEN_BASE}/truyen-tranh/${encodeURIComponent(comicSlug)}/${encodeURIComponent(chapSlug || 'chuong-1')}`;
  const html = await cachedFetchText(targetUrl, { Referer: `${NETTRUYEN_BASE}/` }).catch(() => '');

  const pageBlocks = [...html.matchAll(/<div[^>]+class=["'][^"']*page-chapter[^"']*["'][^>]*>[\s\S]*?<img[^>]+>/gi)].map((m) => m[0]);
  const urls = [];

  for (const tag of pageBlocks) {
    const m =
      tag.match(/data-src=["']([^"']+)["']/i) ||
      tag.match(/data-sv1=["']([^"']+)["']/i) ||
      tag.match(/data-original=["']([^"']+)["']/i) ||
      tag.match(/src=["']([^"']+)["']/i);
    if (m && m[1]) {
      let u = m[1].trim();
      if (u.startsWith('//')) u = `https:${u}`;
      if (u.startsWith('http')) urls.push(u);
    }
  }

  // Automatic failover to TruyenQQ / OTruyen CDN mirror when foreign cloud IPs are geo-blocked by NetTruyen
  if (urls.length === 0) {
    const tqqChapSlug = String(chapSlug || 'chuong-1').replace(/^chuong-/i, 'chapter-');
    try {
      return await fetchTruyenQQChapterPages(`tqq-${comicSlug}__${tqqChapSlug}`);
    } catch (_) {}
  }

  const chapter_image = urls.map((u, idx) => {
    const proxied = `/api/img?url=${encodeURIComponent(u)}`;
    return {
      image_page: idx + 1,
      image_file: proxied,
      hd_file: proxied,
    };
  });

  return {
    status: 'success',
    data: {
      domain_cdn: '',
      item: {
        _id: rawCompoundId,
        chapter_path: '',
        chapter_image,
      },
    },
  };
}

/* ==========================================================================
   CRAWLER 2: OTRUYEN API + TRUYENQQ / OTRUYEN CDN ENGINE (truyenqq.cx + sv1.otruyencdn.com)
   ========================================================================== */
function parseTruyenQQHtmlList(html) {
  const items = [];
  const seen = new Set();
  const blocks = html.split(/<div class=["'][^"']*comic-item[^"']*["']>/i).slice(1);

  for (const block of blocks) {
    const titleMatch = block.match(/<h3 class=["']comic-title["']>\s*<a[^>]+href=["']https?:\/\/truyenqq\.cx\/([^"'/?#]+)\/?["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch) continue;

    const rawSlug = titleMatch[1].trim();
    if (!rawSlug || seen.has(rawSlug)) continue;
    seen.add(rawSlug);

    const name = decodeHtmlEntities(titleMatch[2].replace(/<[^>]+>/g, ''));
    const imgMatch = block.match(/<img[^>]+(?:data-src|data-lazy-src|src)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
    const rawThumb = imgMatch ? imgMatch[1].trim() : '';
    const proxiedThumb = rawThumb ? `/api/img?url=${encodeURIComponent(rawThumb)}` : '';

    const chapMatch = block.match(/<div class=["']comic-chapter-last["']>\s*<a[^>]+href=["']https?:\/\/truyenqq\.cx\/[^/]+\/([^"'/?#]+)\/?["'][^>]*>([\s\S]*?)<\/a>/i);
    const chapSlug = chapMatch ? chapMatch[1].trim() : '';
    const chapName = chapMatch
      ? decodeHtmlEntities(chapMatch[2].replace(/<[^>]+>/g, '').replace(/chapter\s*|chương\s*/i, ''))
      : 'Mới';

    items.push({
      _id: `tqq-${rawSlug}`,
      slug: `tqq-${rawSlug}`,
      source_id: 'otruyen_tqq',
      source_name: '🔵 TruyenQQ • OTruyen',
      name,
      origin_name: [],
      origin_code: 'zh',
      origin_label: '🔵 TruyenQQ • OTruyen',
      status: 'ongoing',
      thumb_url: proxiedThumb,
      updatedAt: new Date().toISOString(),
      author: ['TruyenQQ • OTruyen'],
      category: [{ id: 'manhua', name: 'Truyện QQ', slug: 'manhua' }],
      content: `Đọc truyện tranh ${name} trên kho TruyenQQ & OTruyen CDN (sv1.otruyencdn.com).`,
      chaptersLatest: [
        {
          chapter_name: chapName || 'Mới',
          chapter_api_data: chapSlug ? `/v1/api/chapter/tqq-${rawSlug}__${chapSlug}` : '',
        },
      ],
    });
  }
  return items;
}

async function fetchOTruyenOrTruyenQQList({ page = 1, keyword = '', origin = '' }) {
  // 1. Try Official OTruyen API v1 first
  try {
    const otPath = keyword
      ? `${OTRUYEN_API}/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`
      : `${OTRUYEN_API}/danh-sach/truyen-moi?page=${page}`;
    const otJson = await cachedFetchJson(otPath);
    if (otJson?.status === 'success' && Array.isArray(otJson?.data?.items) && otJson.data.items.length > 0) {
      const cdn = (otJson.data.APP_DOMAIN_CDN_IMAGE || 'https://img.otruyenapi.com').replace(/\/+$/, '');
      const items = otJson.data.items.map((it) => {
        const rawThumb = it.thumb_url?.startsWith('http')
          ? it.thumb_url
          : `${cdn}/uploads/comics/${String(it.thumb_url || '').replace(/^\/+/, '')}`;
        return {
          ...it,
          _id: `ot-${it.slug}`,
          slug: `ot-${it.slug}`,
          source_id: 'otruyen_tqq',
          source_name: '🔵 OTruyen API',
          origin_label: '🔵 OTruyen',
          thumb_url: `/api/img?url=${encodeURIComponent(rawThumb)}`,
        };
      });
      return { status: 'success', data: { items, params: otJson.data.params } };
    }
  } catch (_) {
    // Failover seamlessly to TruyenQQ + OTruyen CDN (sv1.otruyencdn.com) crawler
  }

  if (keyword) {
    try {
      const wpSearchUrl = `${TRUYENQQ_BASE}/wp-json/wp/v2/search?search=${encodeURIComponent(keyword)}&per_page=24&page=${page}`;
      const wpResults = await cachedFetchJson(wpSearchUrl);
      if (Array.isArray(wpResults) && wpResults.length > 0) {
        const items = wpResults
          .filter((x) => x.url && !x.url.includes('/tin-tuc/') && !x.url.includes('/the-loai/'))
          .map((x) => {
            const rawSlug = x.url.replace(/^https?:\/\/truyenqq\.cx\//, '').replace(/\/$/, '');
            // Check if already in SyncDB for cover & chapter count
            const synced = syncEngine.getSyncedComic(`tqq-${rawSlug}`);
            return (
              synced || {
                _id: `tqq-${rawSlug}`,
                slug: `tqq-${rawSlug}`,
                source_id: 'otruyen_tqq',
                source_name: '🔵 TruyenQQ • OTruyen',
                name: decodeHtmlEntities(x.title || rawSlug),
                origin_name: [],
                origin_code: 'zh',
                origin_label: '🔵 TruyenQQ • OTruyen',
                status: 'ongoing',
                thumb_url: '',
                updatedAt: new Date().toISOString(),
                author: ['TruyenQQ • OTruyen'],
                category: [{ id: 'manhua', name: 'Truyện QQ', slug: 'manhua' }],
                content: `Đọc truyện tranh ${decodeHtmlEntities(x.title || rawSlug)} trên kho TruyenQQ & OTruyen CDN.`,
                chaptersLatest: [{ chapter_name: 'Đọc ngay', chapter_api_data: '' }],
              }
            );
          });
        if (items.length > 0) {
          return {
            status: 'success',
            data: {
              items,
              params: {
                pagination: {
                  totalItems: items.length,
                  totalItemsPerPage: 24,
                  currentPage: page,
                },
              },
            },
          };
        }
      }
    } catch (_) {}
  }

  let url = `${TRUYENQQ_BASE}/`;
  if (keyword) {
    url = `${TRUYENQQ_BASE}/?s=${encodeURIComponent(keyword)}`;
  } else if (origin === 'ja') {
    url = page > 1 ? `${TRUYENQQ_BASE}/manga/page/${page}/` : `${TRUYENQQ_BASE}/manga/`;
  } else if (origin === 'ko') {
    url = page > 1 ? `${TRUYENQQ_BASE}/manhwa/page/${page}/` : `${TRUYENQQ_BASE}/manhwa/`;
  } else if (origin === 'zh') {
    url = page > 1 ? `${TRUYENQQ_BASE}/manhua/page/${page}/` : `${TRUYENQQ_BASE}/manhua/`;
  }

  const html = await cachedFetchText(url, { Referer: `${TRUYENQQ_BASE}/` });
  const items = parseTruyenQQHtmlList(html);

  return {
    status: 'success',
    data: {
      items,
      params: {
        pagination: {
          totalItems: 25000,
          totalItemsPerPage: Math.max(24, items.length),
          currentPage: page,
        },
      },
    },
  };
}

async function fetchTruyenQQDetail(tqqId) {
  const rawSlug = String(tqqId).replace(/^tqq-/, '');
  const html = await cachedFetchText(`${TRUYENQQ_BASE}/${encodeURIComponent(rawSlug)}/`, { Referer: `${TRUYENQQ_BASE}/` });

  const titleMatch = html.match(/<h1[^>]*class=["']comic-title-detail["'][^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const name = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '')) : rawSlug;

  const imgMatch = html.match(/meta property=["']og:image["'] content=["']([^"']+)["']/i);
  const rawThumb = imgMatch ? imgMatch[1].trim() : '';
  const proxiedThumb = rawThumb ? `/api/img?url=${encodeURIComponent(rawThumb)}` : '';

  const descMatch = html.match(/meta property=["']og:description["'] content=["']([^"']+)["']/i);
  const content = descMatch ? decodeHtmlEntities(descMatch[1]) : `Đọc truyện ${name} từ kho TruyenQQ & OTruyen CDN.`;

  const chapMatches = [
    ...html.matchAll(
      new RegExp(`href=["']https?:\\/\\/truyenqq\\.cx\\/${rawSlug}\\/(chapter-[^"'/?#]+)\\/?["'][^>]*>([\\s\\S]*?)<\\/a>`, 'gi')
    ),
  ];

  const seenChap = new Set();
  const chapters = [];
  for (const m of chapMatches) {
    const cSlug = m[1].trim();
    if (seenChap.has(cSlug)) continue;
    seenChap.add(cSlug);
    const num = cSlug.replace(/^chapter-/i, '');
    chapters.push({
      chapter_name: num,
      chapter_title: '',
      chapter_api_data: `/v1/api/chapter/tqq-${rawSlug}__${cSlug}`,
      pages: 0,
    });
  }

  return {
    status: 'success',
    data: {
      item: {
        _id: `tqq-${rawSlug}`,
        slug: `tqq-${rawSlug}`,
        source_id: 'otruyen_tqq',
        source_name: '🔵 TruyenQQ • OTruyen',
        name,
        origin_name: [],
        origin_code: 'zh',
        origin_label: '🔵 TruyenQQ • OTruyen',
        status: 'ongoing',
        thumb_url: proxiedThumb,
        updatedAt: new Date().toISOString(),
        author: ['TruyenQQ • OTruyen CDN'],
        category: [{ id: 'manhua', name: 'Truyện QQ', slug: 'manhua' }],
        content,
        chapters: [
          {
            server_name: `🔵 Server TruyenQQ • OTruyen CDN (${chapters.length} chương)`,
            server_data: chapters,
          },
        ],
      },
    },
  };
}

async function fetchTruyenQQChapterPages(rawCompoundId) {
  const clean = String(rawCompoundId).replace(/^tqq-/, '');
  const [comicSlug, chapSlug] = clean.split('__');
  const html = await cachedFetchText(`${TRUYENQQ_BASE}/${encodeURIComponent(comicSlug)}/${encodeURIComponent(chapSlug)}/`, {
    Referer: `${TRUYENQQ_BASE}/`,
  });

  const allImgs = [...html.matchAll(/<img[^>]+(?:data-src|data-lazy-src|src)=["'](https?:\/\/[^"']+)["'][^>]*>/gi)].map((m) => m[1]);
  const pageUrls = [...new Set(allImgs)].filter(
    (u) =>
      u.includes('otruyencdn.com') ||
      u.includes('beercloudy.com') ||
      u.includes('chapter_') ||
      /\/page_\d+\./i.test(u) ||
      /\/\d+\.(?:jpg|jpeg|png|webp)/i.test(u)
  );

  const chapter_image = pageUrls.map((u, idx) => {
    const proxied = `/api/img?url=${encodeURIComponent(u)}`;
    return {
      image_page: idx + 1,
      image_file: proxied,
      hd_file: proxied,
    };
  });

  return {
    status: 'success',
    data: {
      domain_cdn: '',
      item: {
        _id: rawCompoundId,
        chapter_path: '',
        chapter_image,
      },
    },
  };
}

/* ==========================================================================
   SOURCE 3: CỨU TRUYỆN VN (cuutruyen.net/api/v2) ADAPTER
   ========================================================================== */
async function ctFetchJson(endpointPath) {
  const fullUrl = endpointPath.startsWith('http') ? endpointPath : `${CUUTRUYEN_API}${endpointPath}`;
  try {
    return await cachedFetchJson(fullUrl, {
      'User-Agent': BROWSER_UA,
      'Referer': 'https://cuutruyen.net/',
    });
  } catch (_) {
    const backupUrl = fullUrl.replace('https://cuutruyen.net', 'https://hetcuutruyen.net');
    return await cachedFetchJson(backupUrl, {
      'User-Agent': BROWSER_UA,
      'Referer': 'https://hetcuutruyen.net/',
    });
  }
}

function transformCuuTruyenItem(m) {
  const rawCover = m.cover_url || m.cover_mobile_url || m.panorama_url || '';
  const proxiedThumb = rawCover ? `/api/img?url=${encodeURIComponent(rawCover)}` : '';
  const latestChap = m.newest_chapter_number ? String(m.newest_chapter_number) : 'Mới';
  const latestChapId = m.newest_chapter_id ? `ct-${m.newest_chapter_id}` : '';

  const tags = Array.isArray(m.tags)
    ? m.tags.slice(0, 5).map((t) => ({ id: t.slug, name: t.name, slug: t.slug }))
    : [{ id: 'manga', name: 'Truyện Việt', slug: 'manga' }];

  const isCompleted = Array.isArray(m.tags) && m.tags.some((t) => t.slug === 'da-hoan-thanh');
  const authors = [];
  if (m.author?.name) authors.push(m.author.name);
  if (m.author_name) authors.push(m.author_name);

  return {
    _id: `ct-${m.id}`,
    slug: `ct-${m.id}`,
    source_id: 'cuutruyen',
    source_name: '🟣 Cứu Truyện',
    name: m.name || 'Truyện Tranh',
    origin_name: Array.isArray(m.titles) ? m.titles.map((t) => t.name).filter((n) => n !== m.name) : [],
    origin_code: 'ja',
    origin_label: '🟣 Cứu Truyện',
    status: isCompleted ? 'completed' : 'ongoing',
    thumb_url: proxiedThumb,
    updatedAt: m.newest_chapter_created_at || m.updated_at || new Date().toISOString(),
    author: authors.length > 0 ? authors : ['Đang cập nhật'],
    category: tags,
    content: m.full_description || m.description || 'Truyện tranh Tiếng Việt chất lượng cao từ kho Cứu Truyện.',
    chaptersLatest: [
      {
        chapter_name: latestChap,
        chapter_api_data: latestChapId ? `/v1/api/chapter/${latestChapId}` : '',
      },
    ],
  };
}

async function fetchCuuTruyenList({ page = 1, perPage = 24, mode = 'recently_updated', keyword = '', tagSlug = '' }) {
  let endpoint = `/mangas/recently_updated?page=${page}&per_page=${perPage}`;
  if (keyword) {
    endpoint = `/mangas/search?q=${encodeURIComponent(keyword)}&page=${page}&per_page=${perPage}`;
  } else if (tagSlug) {
    endpoint = `/tags/${encodeURIComponent(tagSlug)}?page=${page}&per_page=${perPage}`;
  } else if (mode === 'top') {
    endpoint = `/mangas/top?duration=week&page=${page}&per_page=${perPage}`;
  }

  const res = await ctFetchJson(endpoint);
  const rawList = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.mangas) ? res.data.mangas : [];
  const items = rawList.map((m) => transformCuuTruyenItem(m));
  const totalPages = res?._metadata?.total_pages || 120;
  const totalCount = res?._metadata?.total_count || totalPages * perPage;

  return {
    status: 'success',
    data: {
      items,
      params: {
        pagination: {
          totalItems: totalCount,
          totalItemsPerPage: perPage,
          currentPage: page,
        },
      },
    },
  };
}

async function fetchCuuTruyenDetail(rawId) {
  const numericId = String(rawId).replace(/^ct-/, '');
  const [mRes, cRes] = await Promise.all([
    ctFetchJson(`/mangas/${encodeURIComponent(numericId)}`),
    ctFetchJson(`/mangas/${encodeURIComponent(numericId)}/chapters`).catch(() => ({ data: [] })),
  ]);

  const item = transformCuuTruyenItem(mRes.data || {});
  const rawChapters = Array.isArray(cRes.data) ? cRes.data : [];

  const chapters = rawChapters.map((ch) => ({
    chapter_name: ch.number ? String(ch.number) : String(ch.order || 1),
    chapter_title: ch.name || '',
    chapter_api_data: `/v1/api/chapter/ct-${ch.id}`,
    pages: ch.pages_count || 0,
    updatedAt: ch.created_at || '',
  }));

  item.chapters = [
    {
      server_name: `🟣 Cứu Truyện Full HD (${chapters.length} chương)`,
      server_data: chapters,
    },
  ];

  return {
    status: 'success',
    data: { item },
  };
}

async function fetchCuuTruyenChapterPages(rawChapId) {
  const numericId = String(rawChapId).replace(/^ct-/, '');
  const res = await ctFetchJson(`/chapters/${encodeURIComponent(numericId)}`);
  const pages = Array.isArray(res?.data?.pages) ? res.data.pages : [];

  const chapter_image = pages.map((p, idx) => {
    const proxiedUrl = `/api/img?url=${encodeURIComponent(p.image_url)}`;
    return {
      image_page: idx + 1,
      image_file: proxiedUrl,
      hd_file: proxiedUrl,
      drm_data: p.drm_data ? String(p.drm_data).replace(/\s+/g, '') : '',
      width: p.width || 0,
      height: p.height || 0,
    };
  });

  return {
    status: 'success',
    data: {
      domain_cdn: '',
      item: {
        _id: `ct-${numericId}`,
        chapter_path: '',
        chapter_image,
      },
    },
  };
}

/* ==========================================================================
   SOURCE 4: MANGADEX v5 ADAPTER
   ========================================================================== */
async function mdFetchJson(endpointPath) {
  const fullUrl = endpointPath.startsWith('http') ? endpointPath : `${MANGADEX_API}${endpointPath}`;
  return cachedFetchJson(fullUrl);
}

function extractTitle(attr) {
  if (!attr) return 'Truyện Tranh';
  const titleObj = attr.title || {};
  const altTitles = Array.isArray(attr.altTitles) ? attr.altTitles : [];

  if (titleObj.vi) return titleObj.vi;
  for (const alt of altTitles) {
    if (alt && alt.vi) return alt.vi;
  }
  if (titleObj.en) return titleObj.en;
  for (const alt of altTitles) {
    if (alt && alt.en) return alt.en;
  }
  if (titleObj['ja-ro']) return titleObj['ja-ro'];
  if (titleObj['ko-ro']) return titleObj['ko-ro'];
  if (titleObj['zh-ro']) return titleObj['zh-ro'];

  return Object.values(titleObj)[0] || 'Truyện Tranh';
}

function extractAltTitles(attr) {
  const list = [];
  if (!attr) return list;
  const titleObj = attr.title || {};
  Object.values(titleObj).forEach((v) => {
    if (v && !list.includes(v)) list.push(v);
  });
  const altTitles = Array.isArray(attr.altTitles) ? attr.altTitles : [];
  for (const alt of altTitles) {
    const val = alt && (alt.vi || alt.en || alt['ja-ro'] || alt['ko-ro'] || alt.ja || alt.ko || alt.zh);
    if (val && !list.includes(val) && list.length < 4) {
      list.push(val);
    }
  }
  return list;
}

function extractDescription(attr) {
  const desc = attr?.description || {};
  return desc.vi || desc.en || Object.values(desc)[0] || 'Bộ truyện tranh hấp dẫn đang được cập nhật trên hệ thống.';
}

function transformMangaItem(manga, latestChapterOverride = null) {
  const attr = manga.attributes || {};
  const rels = Array.isArray(manga.relationships) ? manga.relationships : [];

  const coverRel = rels.find((r) => r.type === 'cover_art' && r.attributes?.fileName);
  const coverFileName = coverRel?.attributes?.fileName;
  const rawCoverUrl = coverFileName
    ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`
    : '';
  const proxiedThumb = rawCoverUrl ? `/api/img?url=${encodeURIComponent(rawCoverUrl)}` : '';

  const authors = rels
    .filter((r) => (r.type === 'author' || r.type === 'artist') && r.attributes?.name)
    .map((r) => r.attributes.name);

  const categories = (attr.tags || [])
    .slice(0, 6)
    .map((t) => {
      const enName = t.attributes?.name?.en || 'Action';
      const matched = GENRES.find((g) => g.tagId === t.id);
      return {
        id: t.id,
        name: matched ? matched.shortName : enName,
        slug: matched ? matched.slug : enName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      };
    });

  let origin_code = 'other';
  let origin_label = '🟠 MangaDex';

  if (attr.originalLanguage === 'ko') {
    origin_code = 'ko';
    origin_label = '🟠 Manhwa';
    categories.unshift({ id: 'manhwa', name: 'Manhwa', slug: 'manhwa' });
  } else if (attr.originalLanguage === 'ja') {
    origin_code = 'ja';
    origin_label = '🟠 Manga';
    categories.unshift({ id: 'manga', name: 'Manga', slug: 'manga' });
  } else if (attr.originalLanguage === 'zh' || attr.originalLanguage === 'zh-hk') {
    origin_code = 'zh';
    origin_label = '🟠 Manhua';
    categories.unshift({ id: 'manhua', name: 'Manhua', slug: 'manhua' });
  }

  const lastChapNum = latestChapterOverride?.chapter_name || attr.lastChapter || 'Mới';
  const chaptersLatest = latestChapterOverride
    ? [latestChapterOverride]
    : [{ chapter_name: String(lastChapNum || 'Mới'), chapter_api_data: '' }];

  return {
    _id: manga.id,
    slug: manga.id,
    source_id: 'mangadex',
    source_name: '🟠 MangaDex',
    name: extractTitle(attr),
    origin_name: extractAltTitles(attr),
    origin_code,
    origin_label,
    demographic: attr.publicationDemographic || '',
    year: attr.year || '',
    status: attr.status === 'completed' ? 'completed' : attr.status === 'hiatus' ? 'hiatus' : 'ongoing',
    thumb_url: proxiedThumb,
    updatedAt: latestChapterOverride?.updatedAt || attr.updatedAt || new Date().toISOString(),
    author: authors.length > 0 ? [...new Set(authors)] : ['Đang cập nhật'],
    category: categories.slice(0, 6),
    content: extractDescription(attr),
    available_langs: attr.availableTranslatedLanguages || ['vi'],
    chaptersLatest,
  };
}

async function fetchLatestVietnameseComics(page = 1, limit = 24) {
  const offset = Math.max(0, (page - 1) * 60);
  const chapRes = await mdFetchJson(
    `/chapter?limit=60&offset=${offset}&translatedLanguage[]=vi&order[readableAt]=desc&contentRating[]=safe&contentRating[]=suggestive`
  );

  const uniqueMangaMap = new Map();
  for (const ch of chapRes.data || []) {
    const attr = ch.attributes || {};
    if (!attr.pages || attr.pages <= 0 || attr.externalUrl || attr.isUnavailable) continue;
    const mangaRel = (ch.relationships || []).find((r) => r.type === 'manga');
    if (!mangaRel || !mangaRel.id) continue;

    if (!uniqueMangaMap.has(mangaRel.id)) {
      uniqueMangaMap.set(mangaRel.id, {
        chapter_name: attr.chapter ? String(attr.chapter) : 'Oneshot',
        chapter_title: attr.title || '',
        chapter_api_data: `/v1/api/chapter/${ch.id}`,
        updatedAt: attr.readableAt || attr.updatedAt || new Date().toISOString(),
      });
    }
    if (uniqueMangaMap.size >= limit) break;
  }

  const mangaIds = Array.from(uniqueMangaMap.keys());
  if (mangaIds.length === 0) {
    return fetchMangaList({ page, limit, orderMode: 'latestUploadedChapter' });
  }

  const params = new URLSearchParams();
  params.set('limit', String(mangaIds.length));
  params.append('includes[]', 'cover_art');
  params.append('includes[]', 'author');
  mangaIds.forEach((id) => params.append('ids[]', id));

  const mangaBatch = await mdFetchJson(`/manga?${params.toString()}`);
  const mangaById = new Map((mangaBatch.data || []).map((m) => [m.id, m]));

  const items = [];
  for (const [mId, latestChapInfo] of uniqueMangaMap.entries()) {
    const m = mangaById.get(mId);
    if (m) {
      items.push(transformMangaItem(m, latestChapInfo));
    }
  }

  return {
    status: 'success',
    data: {
      items,
      params: {
        pagination: {
          totalItems: 6746,
          totalItemsPerPage: limit,
          currentPage: page,
        },
      },
    },
  };
}

async function fetchMangaList({
  page = 1,
  limit = 24,
  status = '',
  tagId = '',
  tagIds = [],
  tagsMode = 'AND',
  origLang = '',
  demographic = '',
  translatedLang = 'vi',
  year = '',
  keyword = '',
  orderMode = 'followedCount',
}) {
  const offset = Math.max(0, (page - 1) * limit);
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  params.append('includes[]', 'cover_art');
  params.append('includes[]', 'author');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');
  params.append('hasAvailableChapters', 'true');

  if (translatedLang && translatedLang !== 'all') {
    params.append('availableTranslatedLanguage[]', translatedLang);
  }
  if (status && status !== 'all') {
    params.append('status[]', status);
  }

  const allTagIds = [...tagIds];
  if (tagId && !allTagIds.includes(tagId)) {
    allTagIds.push(tagId);
  }
  allTagIds.forEach((id) => params.append('includedTags[]', id));
  if (allTagIds.length > 1) {
    params.set('includedTagsMode', tagsMode === 'OR' ? 'OR' : 'AND');
  }

  if (origLang && origLang !== 'all') {
    params.append('originalLanguage[]', origLang);
    if (origLang === 'zh') {
      params.append('originalLanguage[]', 'zh-hk');
    }
  }
  if (demographic && demographic !== 'all') {
    params.append('publicationDemographic[]', demographic);
  }
  if (year && year !== 'all') {
    params.set('year', String(year));
  }
  if (keyword) {
    params.set('title', keyword);
  }

  if (orderMode === 'latestUploadedChapter') {
    params.set('order[latestUploadedChapter]', 'desc');
  } else if (orderMode === 'createdAt') {
    params.set('order[createdAt]', 'desc');
  } else if (orderMode === 'rating') {
    params.set('order[rating]', 'desc');
  } else if (orderMode === 'title') {
    params.set('order[title]', 'asc');
  } else {
    params.set('order[followedCount]', 'desc');
  }

  const data = await mdFetchJson(`/manga?${params.toString()}`);
  const items = (data.data || []).map((m) => transformMangaItem(m));

  return {
    status: 'success',
    data: {
      items,
      params: {
        pagination: {
          totalItems: data.total || items.length,
          totalItemsPerPage: limit,
          currentPage: page,
        },
      },
    },
  };
}

/* ==========================================================================
   MULTI-SOURCE AGGREGATOR (GỘP CẢ 4 KHO TRUYỆN VIỆT: NETTRUYEN + TRUYENQQ/OTRUYEN + CỨU TRUYỆN + MANGADEX)
   ========================================================================== */
function interleaveMultiple(arrays, maxLen = 28) {
  const out = [];
  const max = Math.max(0, ...arrays.map((a) => a.length));
  for (let i = 0; i < max; i++) {
    for (const arr of arrays) {
      if (i < arr.length) {
        out.push(arr[i]);
        if (out.length >= maxLen) return out;
      }
    }
  }
  return out;
}

async function fetchAllVietnameseSourcesCombined({ page = 1, keyword = '' } = {}) {
  const legendMatches = syncEngine.getSyncedList({
    page,
    limit: keyword ? 10 : 8,
    keyword,
    legendsOnly: true,
  })?.data?.items || [];

  const results = await Promise.allSettled([
    fetchNetTruyenList({ page, keyword }),
    fetchCuuTruyenList({ page, perPage: 12, keyword }),
    fetchOTruyenOrTruyenQQList({ page, keyword }),
    keyword
      ? fetchMangaList({ page, limit: 12, keyword, translatedLang: 'vi', orderMode: 'followedCount' })
      : fetchLatestVietnameseComics(page, 12),
  ]);

  const lists = [
    legendMatches,
    ...results.map((r) => (r.status === 'fulfilled' ? r.value?.data?.items || [] : [])),
  ];
  const combined = interleaveMultiple(lists, 24);
  // Deduplicate by slug
  const seen = new Set();
  const deduped = combined.filter((item) => {
    if (!item?.slug || seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });

  return {
    status: 'success',
    data: {
      items: deduped,
      params: {
        pagination: {
          totalItems: 71800,
          totalItemsPerPage: 24,
          currentPage: page,
        },
      },
    },
  };
}

/* ==========================================================================
   UNIFIED DETAIL & CHAPTER ROUTER BY ID PREFIX (nt-, tqq-, ct-, UUID)
   ========================================================================== */
async function fetchMangaDetail(mangaId) {
  const idStr = String(mangaId);

  // 0. Check Local Synchronized Chapter Database
  const syncedComic = syncEngine.getSyncedComic(idStr);
  if (
    syncedComic &&
    syncedComic.isFullDetailLoaded &&
    Array.isArray(syncedComic.chapters) &&
    syncedComic.chapters.length > 0 &&
    Array.isArray(syncedComic.chapters[0]?.server_data) &&
    syncedComic.chapters[0].server_data.length > 0
  ) {
    return { status: 'success', data: { item: syncedComic } };
  }

  let resObj;
  try {
    if (idStr.startsWith('nt-')) {
      resObj = await fetchNetTruyenDetail(idStr);
    } else if (idStr.startsWith('tqq-')) {
      resObj = await fetchTruyenQQDetail(idStr);
    } else if (idStr.startsWith('ct-')) {
      resObj = await fetchCuuTruyenDetail(idStr);
    } else {
      resObj = await fetchMangaDexDetailInternal(idStr);
    }
  } catch (err) {
    if (syncedComic) {
      return { status: 'success', data: { item: syncedComic } };
    }
    throw err;
  }

  // Enrich and auto-save full detail + all chapters into SyncDB!
  if (resObj?.data?.item) {
    const it = resObj.data.item;
    if (syncedComic && (!it.chapters || !it.chapters[0]?.server_data?.length)) {
      it.chapters = syncedComic.chapters;
    }
    it.isFullDetailLoaded = true;
    const chCount = (it.chapters || []).reduce((acc, s) => acc + (s.server_data?.length || 0), 0);
    if (chCount > 0) {
      it.chaptersCount = chCount;
      syncEngine.db.mangas[idStr] = it;
      syncEngine.saveDatabase();
    }
  }
  return resObj;
}

/**
 * Search across ALL other Vietnamese repositories for alternate chapter servers of the same comic
 */
async function findCrossSourceServers(title, currentId) {
  const cleanTitle = String(title || '')
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .trim();
  if (!cleanTitle) return { status: 'success', data: { servers: [] } };

  const curPrefix = String(currentId || '').split('-')[0];
  const tasks = [];

  if (curPrefix !== 'nt') {
    tasks.push(
      fetchNetTruyenList({ page: 1, keyword: cleanTitle })
        .then(async (r) => {
          const hit = r?.data?.items?.[0];
          if (!hit) return null;
          const det = await fetchNetTruyenDetail(hit.slug);
          return det?.data?.item?.chapters?.[0] || null;
        })
        .catch(() => null)
    );
  }

  if (curPrefix !== 'ct') {
    tasks.push(
      fetchCuuTruyenList({ page: 1, perPage: 5, keyword: cleanTitle })
        .then(async (r) => {
          const hit = r?.data?.items?.[0];
          if (!hit) return null;
          const det = await fetchCuuTruyenDetail(hit.slug);
          return det?.data?.item?.chapters?.[0] || null;
        })
        .catch(() => null)
    );
  }

  if (curPrefix !== 'tqq') {
    tasks.push(
      fetchOTruyenOrTruyenQQList({ page: 1, keyword: cleanTitle })
        .then(async (r) => {
          const hit = r?.data?.items?.[0];
          if (!hit) return null;
          const det = await fetchTruyenQQDetail(hit.slug);
          return det?.data?.item?.chapters?.[0] || null;
        })
        .catch(() => null)
    );
  }

  const settled = await Promise.all(tasks);
  const extraServers = settled.filter((srv) => srv && Array.isArray(srv.server_data) && srv.server_data.length > 0);
  return {
    status: 'success',
    data: {
      servers: extraServers,
    },
  };
}

async function fetchMangaDexDetailInternal(idStr) {

  const [mangaRes, viFeedRes, enFeedRes] = await Promise.all([
    mdFetchJson(`/manga/${encodeURIComponent(idStr)}?includes[]=cover_art&includes[]=author&includes[]=artist`),
    mdFetchJson(
      `/manga/${encodeURIComponent(idStr)}/feed?limit=500&translatedLanguage[]=vi&order[chapter]=asc&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`
    ).catch(() => ({ data: [] })),
    mdFetchJson(
      `/manga/${encodeURIComponent(idStr)}/feed?limit=500&translatedLanguage[]=en&order[chapter]=asc&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`
    ).catch(() => ({ data: [] })),
  ]);

  const item = transformMangaItem(mangaRes.data);

  const normalizeChapterFeed = (rawFeed) => {
    const mapByChap = new Map();
    for (const ch of rawFeed || []) {
      const attr = ch.attributes || {};
      if (!attr.pages || attr.pages <= 0 || attr.externalUrl || attr.isUnavailable) continue;

      const chapNum = attr.chapter ? String(attr.chapter) : 'Oneshot';
      const groupRel = (ch.relationships || []).find((r) => r.type === 'scanlation_group');
      const groupName = groupRel?.attributes?.name || '';
      const langTag = attr.translatedLanguage ? `[${attr.translatedLanguage.toUpperCase()}]` : '';
      const titleParts = [attr.title, groupName ? `(${groupName})` : langTag].filter(Boolean);

      const existing = mapByChap.get(chapNum);
      if (!existing || (attr.pages || 0) > (existing.pages || 0)) {
        mapByChap.set(chapNum, {
          chapter_name: chapNum,
          chapter_title: titleParts.join(' '),
          chapter_api_data: `/v1/api/chapter/${ch.id}`,
          pages: attr.pages || 0,
        });
      }
    }
    return Array.from(mapByChap.values());
  };

  const viChapters = normalizeChapterFeed(viFeedRes.data);
  const enChapters = normalizeChapterFeed(enFeedRes.data);

  const servers = [];
  if (viChapters.length > 0) {
    servers.push({
      server_name: `🇻🇳 Tiếng Việt (${viChapters.length} chương)`,
      server_data: viChapters,
    });
  }
  if (enChapters.length > 0) {
    servers.push({
      server_name: `🇬🇧 English (${enChapters.length} chương)`,
      server_data: enChapters,
    });
  }

  if (servers.length === 0) {
    const anyFeedRes = await mdFetchJson(
      `/manga/${encodeURIComponent(idStr)}/feed?limit=300&order[chapter]=asc&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`
    ).catch(() => ({ data: [] }));
    const anyChapters = normalizeChapterFeed(anyFeedRes.data);
    if (anyChapters.length > 0) {
      servers.push({
        server_name: `🌐 Bản Quốc Tế / Raw (${anyChapters.length} chương)`,
        server_data: anyChapters,
      });
    }
  }

  item.chapters = servers;
  return {
    status: 'success',
    data: { item },
  };
}

async function fetchMangaPillChapterPages(mpChapterId) {
  const rawPath = String(mpChapterId).replace(/^mp-/, '').replace('__', '/');
  const url = `https://mangapill.com/chapters/${rawPath}`;
  const html = await cachedFetchText(url, { Referer: 'https://mangapill.com/' });

  const imgs = [...html.matchAll(/data-src=["'](https?:\/\/[^"']+)["']/gi)]
    .map((m) => m[1].trim())
    .filter((u) => u.includes('readdetectiveconan.com') || u.includes('mangap'));

  const chapter_image = imgs.map((rawUrl, idx) => ({
    image_page: idx + 1,
    image_file: `/api/img?url=${encodeURIComponent(rawUrl)}`,
    hd_file: `/api/img?url=${encodeURIComponent(rawUrl)}`,
  }));

  return {
    status: 'success',
    data: {
      domain_cdn: '',
      item: {
        _id: mpChapterId,
        chapter_path: '',
        chapter_image,
      },
    },
  };
}

async function fetchChapterPages(chapterId) {
  const idStr = String(chapterId);
  if (idStr.startsWith('nt-')) {
    return fetchNetTruyenChapterPages(idStr);
  }
  if (idStr.startsWith('tqq-')) {
    return fetchTruyenQQChapterPages(idStr);
  }
  if (idStr.startsWith('ct-')) {
    return fetchCuuTruyenChapterPages(idStr);
  }
  if (idStr.startsWith('mp-')) {
    return fetchMangaPillChapterPages(idStr);
  }

  const res = await mdFetchJson(`/at-home/server/${encodeURIComponent(idStr)}`);
  const baseUrl = (res.baseUrl || 'https://uploads.mangadex.org').replace(/\/+$/, '');
  const hash = res.chapter?.hash || '';
  const dataFiles = res.chapter?.data || [];
  const saverFiles = res.chapter?.dataSaver || [];

  const useSaver = saverFiles.length > 0;
  const files = useSaver ? saverFiles : dataFiles;

  const chapter_image = files.map((fileName, idx) => {
    const saverRaw = useSaver
      ? `${baseUrl}/data-saver/${hash}/${fileName}`
      : `${baseUrl}/data/${hash}/${fileName}`;
    const hdFileName = dataFiles[idx] || fileName;
    const hdRaw = `${baseUrl}/data/${hash}/${hdFileName}`;

    return {
      image_page: idx + 1,
      image_file: `/api/img?url=${encodeURIComponent(saverRaw)}`,
      hd_file: `/api/img?url=${encodeURIComponent(hdRaw)}`,
    };
  });

  return {
    status: 'success',
    data: {
      domain_cdn: '',
      item: {
        _id: idStr,
        chapter_path: '',
        chapter_image,
      },
    },
  };
}

/* ==========================================================================
   UNIVERSAL IMAGE PROXY (MANGADEX, CỨU TRUYỆN, NETTRUYEN BEERCLOUDY, OTRUYEN CDN)
   ========================================================================== */
async function handleImageProxy(targetUrl, req, res) {
  if (!targetUrl || (!targetUrl.startsWith('https://') && !targetUrl.startsWith('http://'))) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid image URL');
    return;
  }

  const cached = imgCache.get(targetUrl);
  if (cached && Date.now() - cached.ts < IMG_TTL_MS) {
    res.writeHead(200, {
      'Content-Type': cached.contentType,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(cached.buffer);
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    let referer = 'https://mangadex.org/';
    let ua = USER_AGENT;

    if (targetUrl.includes('beercloudy.com') || targetUrl.includes('nhattruyen') || targetUrl.includes('nettruyen')) {
      referer = `${NETTRUYEN_BASE}/`;
      ua = BROWSER_UA;
    } else if (targetUrl.includes('truyenqq') || targetUrl.includes('otruyencdn.com') || targetUrl.includes('otruyenapi.com')) {
      referer = `${TRUYENQQ_BASE}/`;
      ua = BROWSER_UA;
    } else if (targetUrl.includes('lrclib.net') || targetUrl.includes('cuutruyen')) {
      referer = 'https://cuutruyen.net/';
      ua = BROWSER_UA;
    } else if (targetUrl.includes('readdetectiveconan.com') || targetUrl.includes('mangapill.com')) {
      referer = 'https://mangapill.com/';
      ua = BROWSER_UA;
    }

    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': ua,
        'Referer': referer,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      res.writeHead(upstream.status, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(`Upstream image error: ${upstream.status}`);
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const arrayBuf = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    if (buffer.length < 3 * 1024 * 1024) {
      if (imgCache.size >= MAX_IMG_CACHE_ITEMS) {
        const oldestKey = imgCache.keys().next().value;
        if (oldestKey) imgCache.delete(oldestKey);
      }
      imgCache.set(targetUrl, { ts: Date.now(), contentType, buffer });
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(buffer);
  } catch (err) {
    clearTimeout(timer);
    res.writeHead(502, {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(`Proxy error: ${err.message}`);
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  });
  res.end(JSON.stringify(payload));
}

function readPostJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLen = 0;
    req.on('data', (chunk) => {
      totalLen += chunk.length;
      if (totalLen > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

async function translateTextFreeBatch({ texts = [], sourceLang = 'auto' }) {
  const sl = sourceLang || 'auto';
  const cleanTexts = (Array.isArray(texts) ? texts : [])
    .map((t) => String(t || '').trim())
    .slice(0, 40);
  if (cleanTexts.length === 0) return [];

  const results = await Promise.all(
    cleanTexts.map(async (txt) => {
      if (!txt) return '';
      try {
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=vi&dt=t&q=${encodeURIComponent(txt)}`;
        const r = await fetch(gUrl, { headers: { 'User-Agent': BROWSER_UA } });
        if (!r.ok) return txt;
        const data = await r.json();
        const translated = Array.isArray(data?.[0])
          ? data[0].map((part) => (Array.isArray(part) ? part[0] : '')).join('')
          : txt;
        return translated || txt;
      } catch (_) {
        return txt;
      }
    })
  );
  return results;
}

async function translateImageWithGemini({ imageUrl = '', apiKey = '', sourceLang = 'auto', comicTitle = '' }) {
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error('Vui lòng nhập Gemini API Key để dùng chế độ Gemini Vision AI.');
  }
  if (!imageUrl) throw new Error('Thiếu URL ảnh trang truyện.');

  let targetUrl = imageUrl;
  if (targetUrl.includes('/api/img?url=')) {
    try {
      targetUrl = decodeURIComponent(targetUrl.split('/api/img?url=')[1].split('&')[0]);
    } catch (_) {}
  } else if (targetUrl.startsWith('/')) {
    targetUrl = `${HOST_BASE}${targetUrl}`;
  }

  let referer = 'https://mangadex.org/';
  let ua = USER_AGENT;
  if (targetUrl.includes('beercloudy.com') || targetUrl.includes('nhattruyen') || targetUrl.includes('nettruyen')) {
    referer = `${NETTRUYEN_BASE}/`;
    ua = BROWSER_UA;
  } else if (targetUrl.includes('truyenqq') || targetUrl.includes('otruyencdn.com')) {
    referer = `${TRUYENQQ_BASE}/`;
    ua = BROWSER_UA;
  } else if (targetUrl.includes('lrclib.net') || targetUrl.includes('cuutruyen')) {
    referer = 'https://cuutruyen.net/';
    ua = BROWSER_UA;
  } else if (targetUrl.includes('readdetectiveconan.com') || targetUrl.includes('mangapill.com')) {
    referer = 'https://mangapill.com/';
    ua = BROWSER_UA;
  }

  const imgRes = await fetch(targetUrl, { headers: { 'User-Agent': ua, 'Referer': referer } });
  if (!imgRes.ok) throw new Error(`Không tải được ảnh nguồn (HTTP ${imgRes.status})`);
  const mimeType = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0];
  const base64Data = Buffer.from(await imgRes.arrayBuffer()).toString('base64');

  const prompt = `Bạn là biên dịch viên truyện tranh chuyên nghiệp (${comicTitle || 'Manga/Manhwa/Manhua'}).
Hãy đọc toàn bộ chữ thoại trong các bong bóng thoại / khung lời dẫn của trang truyện này (ngôn ngữ gốc: ${sourceLang}).
Với mỗi bong bóng thoại, hãy trả về tọa độ bounding box [ymin, xmin, ymax, xmax] theo thang 0-1000, nội dung gốc (orig), và bản dịch Tiếng Việt tự nhiên, đúng ngữ cảnh truyện tranh (vi).
Chỉ trả về JSON hợp lệ theo đúng mẫu sau, không thêm markdown:
{"bubbles":[{"box":[ymin,xmin,ymax,xmax],"orig":"...","vi":"..."}]}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  let gJson = null;
  let lastErr = '';
  for (const model of ['gemini-2.5-flash', 'gemini-2.0-flash']) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
    const gRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (gRes.ok) {
      gJson = await gRes.json();
      break;
    } else {
      lastErr = await gRes.text().catch(() => `HTTP ${gRes.status}`);
    }
  }

  if (!gJson) {
    throw new Error(`Gemini API lỗi: ${lastErr.slice(0, 200)}`);
  }

  const rawText = gJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed?.bubbles) ? parsed.bubbles : [];
}

async function translateImageWithOcrSpace({ imageUrl = '', ocrKey = '', sourceLang = 'eng' }) {
  if (!imageUrl) throw new Error('Thiếu URL ảnh trang truyện.');
  let targetUrl = imageUrl;
  if (targetUrl.includes('/api/img?url=')) {
    try {
      targetUrl = decodeURIComponent(targetUrl.split('/api/img?url=')[1].split('&')[0]);
    } catch (_) {}
  } else if (targetUrl.startsWith('/')) {
    targetUrl = `${HOST_BASE}${targetUrl}`;
  }

  let referer = 'https://mangadex.org/';
  let ua = USER_AGENT;
  if (targetUrl.includes('beercloudy.com') || targetUrl.includes('nhattruyen') || targetUrl.includes('nettruyen')) {
    referer = `${NETTRUYEN_BASE}/`;
    ua = BROWSER_UA;
  } else if (targetUrl.includes('truyenqq') || targetUrl.includes('otruyencdn.com')) {
    referer = `${TRUYENQQ_BASE}/`;
    ua = BROWSER_UA;
  } else if (targetUrl.includes('lrclib.net') || targetUrl.includes('cuutruyen')) {
    referer = 'https://cuutruyen.net/';
    ua = BROWSER_UA;
  } else if (targetUrl.includes('readdetectiveconan.com') || targetUrl.includes('mangapill.com')) {
    referer = 'https://mangapill.com/';
    ua = BROWSER_UA;
  }

  const imgRes = await fetch(targetUrl, { headers: { 'User-Agent': ua, 'Referer': referer } });
  if (!imgRes.ok) throw new Error(`Không tải được ảnh nguồn (HTTP ${imgRes.status})`);
  const mimeType = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0];
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const dataUri = `data:${mimeType};base64,${buf.toString('base64')}`;

  const langMap = { eng: 'eng', jpn: 'jpn', chi_sim: 'chs', kor: 'kor' };
  const ocrLang = langMap[sourceLang] || 'eng';

  const form = new URLSearchParams();
  form.set('apikey', (ocrKey || '').trim() || 'helloworld');
  form.set('base64Image', dataUri);
  form.set('language', ocrLang);
  form.set('isOverlayRequired', 'true');
  form.set('OCREngine', '2');
  form.set('scale', 'true');

  const ocrRes = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!ocrRes.ok) throw new Error(`OCR.space HTTP ${ocrRes.status}`);
  const ocrJson = await ocrRes.json();
  if (ocrJson?.IsErroredOnProcessing) {
    throw new Error(ocrJson.ErrorMessage?.[0] || 'OCR.space không xử lý được ảnh');
  }

  const overlayLines = ocrJson?.ParsedResults?.[0]?.TextOverlay?.Lines || [];
  const parsedLines = overlayLines
    .map((ln) => {
      const words = Array.isArray(ln.Words) ? ln.Words : [];
      if (words.length === 0) return null;
      const x0 = Math.min(...words.map((w) => w.Left || 0));
      const x1 = Math.max(...words.map((w) => (w.Left || 0) + (w.Width || 30)));
      const y0 = ln.MinTop || words[0].Top || 0;
      const y1 = y0 + (ln.MaxHeight || words[0].Height || 20);
      const text = String(ln.LineText || '').trim();
      return { text, x0, y0, x1, y1 };
    })
    .filter((ln) => ln && ln.text.length >= 2 && /[a-zA-Z0-9\u3040-\u30ff\u4e00-\u9faf\uac00-\ud7af]/.test(ln.text));

  if (parsedLines.length === 0) return [];

  // Estimate full image bounds from max coordinates or default 800x1200
  const maxX = Math.max(800, ...parsedLines.map((l) => l.x1 * 1.05));
  const maxY = Math.max(1200, ...parsedLines.map((l) => l.y1 * 1.05));

  parsedLines.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const grouped = [];
  for (const ln of parsedLines) {
    const match = grouped.find((g) => {
      const vGap = ln.y0 - g.y1;
      const hOverlap = Math.min(ln.x1, g.x1) - Math.max(ln.x0, g.x0);
      return vGap >= -10 && vGap <= maxY * 0.035 && hOverlap > -maxX * 0.05;
    });
    if (match && (match.y1 - match.y0) / maxY < 0.22) {
      match.texts.push(ln.text);
      match.x0 = Math.min(match.x0, ln.x0);
      match.y0 = Math.min(match.y0, ln.y0);
      match.x1 = Math.max(match.x1, ln.x1);
      match.y1 = Math.max(match.y1, ln.y1);
    } else {
      grouped.push({ texts: [ln.text], x0: ln.x0, y0: ln.y0, x1: ln.x1, y1: ln.y1 });
    }
  }

  const gSlMap = { eng: 'en', jpn: 'ja', chi_sim: 'zh-CN', kor: 'ko' };
  const texts = grouped.map((g) => g.texts.join(' ').replace(/\s+/g, ' ').trim());
  const translations = await translateTextFreeBatch({ texts, sourceLang: gSlMap[sourceLang] || 'auto' });

  return grouped.map((g, i) => ({
    box: [
      Math.round((g.y0 / maxY) * 1000),
      Math.round((g.x0 / maxX) * 1000),
      Math.round((g.y1 / maxY) * 1000),
      Math.round((g.x1 / maxX) * 1000),
    ],
    orig: texts[i],
    vi: translations[i] || texts[i],
  }));
}

/* ==========================================================================
   HTTP SERVER ROUTER
   ========================================================================== */
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, HOST_BASE);
  const pathname = parsedUrl.pathname;
  const sp = parsedUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const source = sp.get('source') || 'all_vi'; // 'all_vi' | 'nettruyen' | 'otruyen_tqq' | 'cuutruyen' | 'mangadex_vi' | 'mangadex_en'

  try {
    // 1. Image Proxy Endpoint
    if (pathname === '/api/img') {
      const targetUrl = sp.get('url');
      await handleImageProxy(targetUrl, req, res);
      return;
    }

    // 1a. Online Comic Translation Endpoints (Free Google Translate + Gemini Vision AI)
    if (pathname === '/v1/api/translate-text' && req.method === 'POST') {
      const body = await readPostJson(req);
      const translations = await translateTextFreeBatch(body);
      sendJson(res, 200, { status: 'success', data: { translations } });
      return;
    }

    if (pathname === '/v1/api/translate-image' && req.method === 'POST') {
      const body = await readPostJson(req);
      const bubbles = await translateImageWithGemini(body);
      sendJson(res, 200, { status: 'success', data: { bubbles } });
      return;
    }

    if (pathname === '/v1/api/translate-ocr-space' && req.method === 'POST') {
      const body = await readPostJson(req);
      const bubbles = await translateImageWithOcrSpace(body);
      sendJson(res, 200, { status: 'success', data: { bubbles } });
      return;
    }

    // 1b. Crawler & Sync Database Endpoints (/v1/api/sync/status & /v1/api/sync/start)
    if (pathname === '/v1/api/sync/status') {
      sendJson(res, 200, { status: 'success', data: syncEngine.getStatus() });
      return;
    }

    if (pathname === '/v1/api/sync/start') {
      const pagesPerSource = Math.max(1, Math.min(10, parseInt(sp.get('pages') || '2', 10)));
      // Trigger async sync in background without blocking HTTP response
      syncEngine.runFullSync({ pagesPerSource }).catch((e) => console.error('[Sync Error]:', e.message));
      sendJson(res, 200, { status: 'success', data: syncEngine.getStatus() });
      return;
    }

    if (pathname === '/v1/api/cross-servers') {
      const title = sp.get('title') || '';
      const currentId = sp.get('currentId') || '';
      const result = await findCrossSourceServers(title, currentId);
      sendJson(res, 200, result);
      return;
    }

    // 1c. Local Synchronized Database & Legendary Collection Source (source === 'synced_db' || source === 'legends')
    if (
      (source === 'synced_db' || source === 'legends') &&
      (['/v1/api/home', '/v1/api/filter', '/v1/api/tim-kiem'].some((p) => pathname.startsWith(p)) ||
        pathname.startsWith('/v1/api/danh-sach/'))
    ) {
      const keyword = (sp.get('keyword') || '').trim();
      const origin = sp.get('origin') || 'all';
      const author = (sp.get('author') || 'all').trim();
      const status = pathname.includes('hoan-thanh') ? 'completed' : sp.get('status') || 'all';
      sendJson(
        res,
        200,
        syncEngine.getSyncedList({
          page,
          limit: 24,
          source,
          keyword,
          origin,
          status,
          author,
          legendsOnly: source === 'legends',
        })
      );
      return;
    }

    // 2. Advanced Multi-Criteria Filter Endpoint (/v1/api/filter)
    if (pathname === '/v1/api/filter') {
      const keyword = (sp.get('keyword') || '').trim();
      const status = sp.get('status') || '';
      const origin = sp.get('origin') || '';
      const author = (sp.get('author') || 'all').trim();
      const demographic = sp.get('demographic') || '';
      const lang = sp.get('lang') || 'vi';
      const year = sp.get('year') || '';
      const sort = sp.get('sort') || 'latestUploadedChapter';
      const tagsMode = sp.get('tagsMode') || 'AND';
      const rawTags = (sp.get('tags') || '').split(',').map((s) => s.trim()).filter(Boolean);

      if (author && author !== 'all') {
        sendJson(
          res,
          200,
          syncEngine.getSyncedList({
            page,
            limit: 24,
            keyword,
            origin,
            status,
            author,
          })
        );
        return;
      }

      if (source === 'nettruyen') {
        let ntGenre = '';
        if (rawTags.length > 0) {
          const matchedG = GENRES.find((g) => g.slug === rawTags[0]);
          ntGenre = matchedG?.ntSlug || rawTags[0];
        } else if (origin === 'ja') ntGenre = 'manga-112';
        else if (origin === 'ko') ntGenre = 'manhwa-11400';
        else if (origin === 'zh') ntGenre = 'manhua';
        sendJson(res, 200, await fetchNetTruyenList({ page, keyword, genreSlug: ntGenre, status, sort }));
        return;
      }

      if (source === 'otruyen_tqq') {
        sendJson(res, 200, await fetchOTruyenOrTruyenQQList({ page, keyword, origin }));
        return;
      }

      if (source === 'cuutruyen') {
        let ctTag = '';
        if (rawTags.length > 0) {
          const matchedG = GENRES.find((g) => g.slug === rawTags[0]);
          ctTag = matchedG?.ctTag || rawTags[0];
        } else if (status === 'completed') ctTag = 'da-hoan-thanh';
        else if (status === 'ongoing') ctTag = 'dang-tien-hanh';
        else if (origin === 'ja') ctTag = 'manga';
        else if (origin === 'ko') ctTag = 'manhwa';
        else if (origin === 'zh') ctTag = 'manhua';

        const mode = sort === 'followedCount' || sort === 'rating' ? 'top' : 'recently_updated';
        sendJson(res, 200, await fetchCuuTruyenList({ page, perPage: 24, mode, keyword, tagSlug: ctTag }));
        return;
      }

      if (
        source === 'all_vi' &&
        lang === 'vi' &&
        origin === 'all' &&
        status === 'all' &&
        demographic === 'all' &&
        year === 'all' &&
        rawTags.length === 0
      ) {
        sendJson(res, 200, await fetchAllVietnameseSourcesCombined({ page, keyword }));
        return;
      }

      const tagIds = [];
      let effectiveOrigLang = origin;
      rawTags.forEach((slug) => {
        const g = GENRES.find((item) => item.slug === slug);
        if (g) {
          if (g.tagId) tagIds.push(g.tagId);
          if (g.origLang && (!effectiveOrigLang || effectiveOrigLang === 'all')) {
            effectiveOrigLang = g.origLang;
          }
        }
      });

      const effectiveLang = source === 'mangadex_en' ? 'en' : lang;
      const result = await fetchMangaList({
        page,
        limit: 24,
        keyword,
        status,
        tagIds,
        tagsMode,
        origLang: effectiveOrigLang,
        demographic,
        translatedLang: effectiveLang,
        year,
        orderMode: sort,
      });
      sendJson(res, 200, result);
      return;
    }

    // 3. Home Endpoint (/v1/api/home)
    if (pathname === '/v1/api/home') {
      if (source === 'nettruyen') {
        sendJson(res, 200, await fetchNetTruyenList({ page: 1 }));
        return;
      }
      if (source === 'otruyen_tqq') {
        sendJson(res, 200, await fetchOTruyenOrTruyenQQList({ page: 1 }));
        return;
      }
      if (source === 'cuutruyen') {
        sendJson(res, 200, await fetchCuuTruyenList({ page: 1, perPage: 24, mode: 'recently_updated' }));
        return;
      }
      if (source === 'mangadex_vi') {
        sendJson(res, 200, await fetchLatestVietnameseComics(1, 24));
        return;
      }
      if (source === 'mangadex_en') {
        sendJson(res, 200, await fetchMangaList({ page: 1, limit: 24, translatedLang: 'en', orderMode: 'followedCount' }));
        return;
      }
      sendJson(res, 200, await fetchAllVietnameseSourcesCombined({ page: 1 }));
      return;
    }

    // 4. Genres List (/v1/api/the-loai)
    if (pathname === '/v1/api/the-loai') {
      sendJson(res, 200, {
        status: 'success',
        data: {
          items: GENRES.map((g) => ({
            _id: g.slug,
            name: g.name,
            shortName: g.shortName,
            slug: g.slug,
          })),
        },
      });
      return;
    }

    // 5. Comics by Category/Status (/v1/api/danh-sach/:type)
    if (pathname.startsWith('/v1/api/danh-sach/')) {
      const type = decodeURIComponent(pathname.replace('/v1/api/danh-sach/', ''));
      if (source === 'nettruyen') {
        const status = type === 'hoan-thanh' ? 'completed' : type === 'dang-phat-hanh' ? 'ongoing' : 'all';
        const sort = type === 'pho-bien' ? 'followedCount' : 'latestUploadedChapter';
        sendJson(res, 200, await fetchNetTruyenList({ page, status, sort }));
        return;
      }
      if (source === 'otruyen_tqq') {
        sendJson(res, 200, await fetchOTruyenOrTruyenQQList({ page }));
        return;
      }
      if (source === 'cuutruyen') {
        const mode = type === 'pho-bien' ? 'top' : 'recently_updated';
        const tagSlug = type === 'hoan-thanh' ? 'da-hoan-thanh' : type === 'dang-phat-hanh' ? 'dang-tien-hanh' : '';
        sendJson(res, 200, await fetchCuuTruyenList({ page, perPage: 24, mode, tagSlug }));
        return;
      }
      if (type === 'truyen-moi') {
        sendJson(res, 200, source === 'all_vi' ? await fetchAllVietnameseSourcesCombined({ page }) : await fetchLatestVietnameseComics(page, 24));
        return;
      }
      if (type === 'dang-phat-hanh') {
        sendJson(res, 200, await fetchMangaList({ page, limit: 24, status: 'ongoing', orderMode: 'latestUploadedChapter' }));
        return;
      }
      if (type === 'hoan-thanh') {
        sendJson(res, 200, await fetchMangaList({ page, limit: 24, status: 'completed', orderMode: 'followedCount' }));
        return;
      }
      if (type === 'pho-bien' || type === 'sap-ra-mat') {
        sendJson(res, 200, await fetchMangaList({ page, limit: 24, orderMode: 'followedCount' }));
        return;
      }
      sendJson(res, 200, await fetchAllVietnameseSourcesCombined({ page }));
      return;
    }

    // 6. Search Comics (/v1/api/tim-kiem?keyword=...)
    if (pathname === '/v1/api/tim-kiem') {
      const keyword = (sp.get('keyword') || '').trim();
      if (source === 'nettruyen') {
        sendJson(res, 200, await fetchNetTruyenList({ page, keyword }));
        return;
      }
      if (source === 'otruyen_tqq') {
        sendJson(res, 200, await fetchOTruyenOrTruyenQQList({ page, keyword }));
        return;
      }
      if (source === 'cuutruyen') {
        sendJson(res, 200, await fetchCuuTruyenList({ page, perPage: 24, keyword }));
        return;
      }
      sendJson(res, 200, await fetchAllVietnameseSourcesCombined({ page, keyword }));
      return;
    }

    // 7. Comic Detail (/v1/api/truyen-tranh/:id)
    if (pathname.startsWith('/v1/api/truyen-tranh/')) {
      const mangaId = decodeURIComponent(pathname.replace('/v1/api/truyen-tranh/', ''));
      const result = await fetchMangaDetail(mangaId);
      sendJson(res, 200, result);
      return;
    }

    // 8. Chapter Images (/v1/api/chapter/:chapterId)
    if (pathname.startsWith('/v1/api/chapter/')) {
      const chapterId = decodeURIComponent(pathname.replace('/v1/api/chapter/', ''));
      const result = await fetchChapterPages(chapterId);
      sendJson(res, 200, result);
      return;
    }

    // 9. Serve Static Frontend Files
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  } catch (err) {
    console.error('[Server Error]:', pathname, err.message);
    sendJson(res, 500, {
      status: 'error',
      message: err.message,
    });
  }
});

const os = require('os');

function getLocalLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

server.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLocalLanIp();
  console.log(`================================================================`);
  console.log(`🚀 MANGAVERSE VN SERVER v5.5 ĐANG CHẠY:`);
  console.log(`   👉 Máy tính (Local):   http://localhost:${PORT}`);
  console.log(`   👉 Điện thoại (Wi-Fi): http://${lanIp}:${PORT}`);
  console.log(`📚 HỆ THỐNG HỢP NHẤT 5 KHO TRUYỆN + 98,344 CHƯƠNG ĐỒNG BỘ:`);
  console.log(`   1. 🟢 NetTruyen / NhatTruyen Crawler (35,000+ Bộ)`);
  console.log(`   2. 🔵 OTruyen API + TruyenQQ / OTruyen CDN Crawler (25,000+ Bộ)`);
  console.log(`   3. 🟣 Cứu Truyện VN API v2 (5,100+ Bộ Full HD)`);
  console.log(`   4. 🟠 MangaDex VN API v5 (6,746+ Bộ Tiếng Việt)`);
  console.log(`   5. 🇬🇧 MangaPill & MangaDex Global (75,000+ Bộ Tiếng Anh)`);
  console.log(`================================================================`);
});
