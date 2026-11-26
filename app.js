/* ==========================================================================
   MANGAVERSE VN 3.0 — KHO TRUYỆN TRANH MỞ MIỄN PHÍ (MANGADEX LIVE ENGINE)
   Full Frontend Application: Multi-Criteria Filter, Quick Preview,
   Grid/Detailed Layouts, Chapter Range Tabs, Reader Studio & Library
   ========================================================================== */

const IS_FILE_PROTOCOL = window.location.protocol === 'file:';
const API_ORIGIN = IS_FILE_PROTOCOL ? 'http://localhost:3080' : window.location.origin;
const API_BASE = `${API_ORIGIN}/v1/api`;
const DEFAULT_CDN_IMAGE = API_ORIGIN;

const STORAGE_KEYS = {
  BOOKMARKS: 'mangaverse_bookmarks_v1',
  HISTORY: 'mangaverse_history_v1',
  THEME: 'mangaverse_theme_v1',
  READER_PREFS: 'mangaverse_reader_prefs_v1',
  COMMENTS: 'mangaverse_comments_v1',
  CARD_LAYOUT: 'mangaverse_card_layout_v1',
};

const DEFAULT_GENRES = [
  { name: 'Action (Hành Động)', shortName: 'Hành Động', slug: 'action' },
  { name: 'Fantasy (Giả Tưởng)', shortName: 'Giả Tưởng', slug: 'fantasy' },
  { name: 'Manhwa (Hàn Quốc)', shortName: 'Manhwa 🇰🇷', slug: 'manhwa' },
  { name: 'Manga (Nhật Bản)', shortName: 'Manga 🇯🇵', slug: 'manga' },
  { name: 'Manhua (Trung Quốc)', shortName: 'Manhua 🇨🇳', slug: 'manhua' },
  { name: 'Chuyển Sinh', shortName: 'Chuyển Sinh', slug: 'chuyen-sinh' },
  { name: 'Xuyên Không (Isekai)', shortName: 'Xuyên Không', slug: 'xuyen-khong' },
  { name: 'Romance (Lãng Mạn)', shortName: 'Lãng Mạn', slug: 'romance' },
  { name: 'Comedy (Hài Hước)', shortName: 'Hài Hước', slug: 'comedy' },
  { name: 'Adventure (Phiêu Lưu)', shortName: 'Phiêu Lưu', slug: 'adventure' },
  { name: 'Võ Thuật / Tu Tiên', shortName: 'Võ Thuật', slug: 'martial-arts' },
  { name: 'Cổ Đại / Lịch Sử', shortName: 'Cổ Đại', slug: 'co-dai' },
  { name: 'Học Đường', shortName: 'Học Đường', slug: 'school-life' },
  { name: 'Drama (Kịch Tính)', shortName: 'Kịch Tính', slug: 'drama' },
  { name: 'Phép Thuật (Magic)', shortName: 'Phép Thuật', slug: 'magic' },
  { name: 'Siêu Nhiên', shortName: 'Siêu Nhiên', slug: 'supernatural' },
  { name: 'Bí Ẩn / Trinh Thám', shortName: 'Trinh Thám', slug: 'mystery' },
  { name: 'Kinh Dị (Horror)', shortName: 'Kinh Dị', slug: 'horror' },
  { name: 'Tâm Lý (Psychological)', shortName: 'Tâm Lý', slug: 'psychological' },
  { name: 'Harem', shortName: 'Harem', slug: 'harem' },
  { name: 'Đời Thường (Slice of Life)', shortName: 'Đời Thường', slug: 'slice-of-life' },
  { name: 'Khoa Học Viễn Tưởng', shortName: 'Sci-Fi', slug: 'sci-fi' },
  { name: 'Du Hành Thời Gian', shortName: 'Xuyên Thời Gian', slug: 'time-travel' },
  { name: 'Quái Vật / Ác Quỷ', shortName: 'Quái Vật', slug: 'monsters' },
  { name: 'Hệ Thống / Game', shortName: 'Trò Chơi / Hệ Thống', slug: 'video-games' },
  { name: 'Sinh Tồn (Survival)', shortName: 'Sinh Tồn', slug: 'survival' },
  { name: 'Ẩm Thực (Cooking)', shortName: 'Ẩm Thực', slug: 'cooking' },
  { name: 'Thể Thao (Sports)', shortName: 'Thể Thao', slug: 'sports' },
];

const FALLBACK_COMICS = [
  {
    _id: '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
    name: 'Tôi Thăng Cấp Một Mình (Solo Leveling)',
    slug: '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
    origin_name: ['Solo Leveling', 'Ore dake Level Up na Ken'],
    origin_code: 'ko',
    origin_label: '🇰🇷 Manhwa',
    status: 'completed',
    thumb_url: '',
    updatedAt: new Date(Date.now() - 1800 * 1000).toISOString(),
    author: ['Chugong', 'DUBU (REDICE STUDIO)'],
    category: [
      { name: 'Manhwa', slug: 'manhwa' },
      { name: 'Hành Động', slug: 'action' },
      { name: 'Giả Tưởng', slug: 'fantasy' },
    ],
    content: 'Mười năm trước, sau khi "Cánh Cổng" nối liền thế giới thực với thế giới quái vật mở ra, Sung Jin-Woo từ thợ săn hạng E yếu nhất thế giới đã nhận được Hệ Thống bí ẩn cho phép anh thăng cấp không giới hạn!',
    chaptersLatest: [{ chapter_name: '200', chapter_api_data: 'demo://solo-leveling/200' }],
  },
];

class MangaVerseApp {
  constructor() {
    this.cdnDomain = DEFAULT_CDN_IMAGE;
    this.apiCache = new Map();

    // Navigation & List State
    this.currentView = 'browse'; // 'browse' | 'detail' | 'reader'
    this.currentMode = 'home';   // 'home' | 'truyen-moi' | 'pho-bien' | 'hoan-thanh' | 'filter' | 'genre' | 'search' | 'bookmarks' | 'history'
    this.currentSource = 'all_vi'; // 'all_vi' | 'cuutruyen' | 'mangadex_vi' | 'mangadex_en'
    this.currentGenreSlug = '';
    this.currentGenreName = '';
    this.currentSearchQuery = '';
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalItems = 0;

    // Advanced Multi-Criteria Filter State
    this.filters = {
      keyword: '',
      origin: 'all',       // 'all' | 'ja' | 'ko' | 'zh'
      status: 'all',       // 'all' | 'ongoing' | 'completed' | 'hiatus'
      author: 'all',       // 'all' | 'Yoshihiro Togashi' | 'Takehiko Inoue' | ...
      sort: 'latestUploadedChapter', // 'latestUploadedChapter' | 'followedCount' | 'rating' | 'createdAt' | 'title'
      demographic: 'all',  // 'all' | 'shounen' | 'seinen' | 'shoujo' | 'josei'
      lang: 'vi',          // 'vi' | 'en' | 'all'
      year: 'all',         // 'all' | '2026' | '2025' ...
      tags: [],            // array of genre slugs
      tagsMode: 'AND',     // 'AND' | 'OR'
    };

    // UI Preferences
    this.cardLayout = localStorage.getItem(STORAGE_KEYS.CARD_LAYOUT) || 'grid'; // 'grid' | 'detailed'

    // Data State
    this.genres = [...DEFAULT_GENRES];
    this.showAllGenres = false;
    this.currentListItems = [];
    this.heroItems = [];
    this.activeHeroIndex = 0;
    this.heroTimer = null;

    // Detail View State
    this.currentComic = null;
    this.activeServerIndex = 0;
    this.chapterSortDesc = true;
    this.chapterFilterText = '';
    this.activeChapterChunk = -1; // -1 = All chapters, 0 = 1..50, 1 = 51..100, etc.

    // Reader View State
    this.readerChapters = [];
    this.currentChapterIndex = -1;
    this.currentChapterPages = [];
    this.singlePageIndex = 0;

    // Reader Preferences
    this.readerPrefs = this.loadReaderPrefs();
    this.autoScrollActive = false;
    this.autoScrollSpeed = 2;
    this.autoScrollRaf = null;

    // Online Comic Translation Preferences & Cache
    this.translatePrefs = this.loadFromStorage('mangaverse_translate_prefs_v1', {
      mode: 'free', // 'free' | 'gemini'
      sourceLang: 'eng', // 'eng' | 'jpn' | 'chi_sim' | 'kor'
      geminiKey: '',
      showOverlay: true,
    });
    this.pageTranslations = new Map();
    this.isTranslatingChapter = false;

    // Persistent User Library
    this.bookmarks = this.loadFromStorage(STORAGE_KEYS.BOOKMARKS, []);
    this.history = this.loadFromStorage(STORAGE_KEYS.HISTORY, []);
    this.comments = this.loadFromStorage(STORAGE_KEYS.COMMENTS, {});

    this.searchDebounceTimer = null;
  }

  /* ========================================================================
     INITIALIZATION & THEME
     ======================================================================== */
  async init() {
    this.initTheme();
    this.applyReaderPrefsToUI();
    this.syncTranslatePrefsUI();
    this.updateCardLayoutButtons();
    this.updateLibraryBadges();
    this.renderGenrePills();
    this.renderAdvMultiGenresGrid();
    this.bindGlobalEvents();

    this.fetchGenres();

    if (window.location.hash && window.location.hash.startsWith('#comic/')) {
      const slug = decodeURIComponent(window.location.hash.replace('#comic/', ''));
      await this.loadHomeData(true);
      if (slug) {
        this.openComicDetail(slug);
        return;
      }
    }

    await this.switchList('home');
  }

  initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    this.showToast(isDark ? '🌙 Đã bật giao diện tối (Dark Mode)' : '☀️ Đã bật giao diện sáng (Light Mode)');
  }

  bindGlobalEvents() {
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('search-dropdown');
      const input = document.getElementById('search-input');
      if (dropdown && !dropdown.contains(e.target) && e.target !== input) {
        dropdown.classList.add('hidden');
      }
    });

    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        const previewModal = document.getElementById('quick-preview-modal');
        if (previewModal && !previewModal.classList.contains('hidden')) {
          this.closeQuickPreview();
          return;
        }
      }

      if (e.key === '/' && !isInput && this.currentView !== 'reader') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
        return;
      }

      if (this.currentView === 'reader' && !isInput) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (this.readerPrefs.mode === 'single') {
            this.changeSinglePage(-1);
          } else {
            this.navigateAdjacentChapter(-1);
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (this.readerPrefs.mode === 'single') {
            this.changeSinglePage(1);
          } else {
            this.navigateAdjacentChapter(1);
          }
        } else if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          this.toggleAutoScroll();
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          this.toggleFullScreen();
        } else if (e.key === 'Escape') {
          if (this.autoScrollActive) {
            this.stopAutoScroll();
          } else {
            this.closeReaderToDetail();
          }
        }
      }
    });

    window.addEventListener(
      'scroll',
      () => {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const bttBtn = document.getElementById('back-to-top-btn');
        if (bttBtn) {
          bttBtn.classList.toggle('hidden', scrollTop < 450);
        }
        if (this.currentView === 'reader') {
          this.updateReaderScrollProgress();
        }
      },
      { passive: true }
    );
  }

  /* ========================================================================
     API ENGINE & SMART URL RESOLVERS
     ======================================================================== */
  async apiFetch(endpoint, useCache = true) {
    let url = endpoint;
    if (endpoint.startsWith('/v1/api/')) {
      url = `${API_ORIGIN}${endpoint}`;
    } else if (!endpoint.startsWith('http')) {
      url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    }
    if (useCache && this.apiCache.has(url)) {
      return this.apiCache.get(url);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 22000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json?.data?.APP_DOMAIN_CDN_IMAGE) {
        this.cdnDomain = json.data.APP_DOMAIN_CDN_IMAGE.replace(/\/+$/, '');
      }
      // If online serverless function returned empty NetTruyen list (due to Cloudflare blocking foreign IP),
      // automatically enrich from window.SYNCED_MANGA_SEED right in the browser!
      if (Array.isArray(json?.data?.items) && json.data.items.length === 0 && window.SYNCED_MANGA_SEED?.items?.length) {
        const edgeFallback = await this.netlifyEdgeFetch(endpoint).catch(() => null);
        if (edgeFallback?.data?.items?.length) {
          if (useCache) this.apiCache.set(url, edgeFallback);
          return edgeFallback;
        }
      }
      if (useCache) {
        this.apiCache.set(url, json);
      }
      this.setApiStatus(true);
      return json;
    } catch (err) {
      clearTimeout(timeoutId);
      // Fallback to Netlify Edge _redirects Proxy (/proxy-ct-api/*) for Drag & Drop static deployments
      if (!IS_FILE_PROTOCOL) {
        try {
          const edgeJson = await this.netlifyEdgeFetch(endpoint);
          if (useCache) this.apiCache.set(url, edgeJson);
          this.setApiStatus(true, 'Netlify Edge Proxy');
          return edgeJson;
        } catch (_) {}
      }
      console.warn('[MangaVerse API Warning]:', url, err.message);
      this.setApiStatus(false, err.message);
      throw err;
    }
  }

  /**
   * Direct Netlify Edge Proxy Adapter (/proxy-ct-api/* & /proxy-ct-img/*)
   * Enables 100% functional comic browsing & Full HD chapter reading even on Netlify Drag & Drop!
   */
  async ctProxyJson(ctPath) {
    try {
      const r1 = await fetch(`/proxy-ct-api${ctPath}`, { headers: { Accept: 'application/json' } });
      if (r1.ok && (r1.headers.get('content-type') || '').includes('json')) {
        return await r1.json();
      }
    } catch (_) {}
    const r2 = await fetch(`/proxy-ct2-api${ctPath}`, { headers: { Accept: 'application/json' } });
    if (!r2.ok) throw new Error(`Edge Proxy HTTP ${r2.status}`);
    return await r2.json();
  }

  rewriteCtImg(rawUrl) {
    if (!rawUrl) return '';
    return rawUrl.replace(/^https?:\/\/storage-ct\.lrclib\.net/i, '/proxy-ct-img');
  }

  /**
   * Rewrites /api/img?url=... or direct CDN URLs to Netlify Edge _redirects proxy routes
   * when running on Netlify (so images from NetTruyen beercloudy, TruyenQQ otruyencdn,
   * Cứu Truyện lrclib, MangaDex, and MangaPill load with HTTP 200 even on Drag & Drop!)
   */
  rewriteProxyImageForEdge(rawOrProxied) {
    if (!rawOrProxied) return '';
    if (!this.isNetlifyEdgeMode) {
      return rawOrProxied;
    }

    let target = rawOrProxied;
    if (target.includes('/api/img?url=')) {
      try {
        const encoded = target.split('/api/img?url=')[1].split('&')[0];
        target = decodeURIComponent(encoded);
      } catch (_) {}
    }

    return target
      .replace(/^https?:\/\/v1\.beercloudy\.com/i, '/proxy-nt-img1')
      .replace(/^https?:\/\/v2\.beercloudy\.com/i, '/proxy-nt-img2')
      .replace(/^https?:\/\/v3\.beercloudy\.com/i, '/proxy-nt-img3')
      .replace(/^https?:\/\/v4\.beercloudy\.com/i, '/proxy-nt-img4')
      .replace(/^https?:\/\/nhattruyenqq\.com/i, '/proxy-nt')
      .replace(/^https?:\/\/sv1\.otruyencdn\.com/i, '/proxy-ot-img')
      .replace(/^https?:\/\/truyenqq\.cx/i, '/proxy-tqq')
      .replace(/^https?:\/\/storage-ct\.lrclib\.net/i, '/proxy-ct-img')
      .replace(/^https?:\/\/uploads\.mangadex\.org/i, '/proxy-md-img')
      .replace(/^https?:\/\/cdn\.readdetectiveconan\.com/i, '/proxy-mp-img');
  }

  async getNetlifySyncedDb() {
    if (this.netlifySyncedDbCache) return this.netlifySyncedDbCache;
    try {
      const r = await fetch('/db/synced-manga.json', { headers: { Accept: 'application/json' } });
      if (r.ok) {
        const j = await r.json();
        if (j && j.mangas) {
          this.netlifySyncedDbCache = j;
          return j;
        }
      }
    } catch (_) {}
    return null;
  }

  parseNetTruyenEdgeHtml(html) {
    const items = [];
    const seen = new Set();
    const blocks = String(html || '').split(/<div class=["']item["']>/i).slice(1);
    for (const block of blocks) {
      const linkMatch =
        block.match(/<figcaption>[\s\S]*?<h3>\s*<a[^>]+href=["']https?:\/\/[^/]+\/truyen-tranh\/([^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/i) ||
        block.match(/<h3>\s*<a[^>]+href=["']https?:\/\/[^/]+\/truyen-tranh\/([^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;
      const rawSlug = linkMatch[1].trim();
      if (!rawSlug || seen.has(rawSlug)) continue;
      seen.add(rawSlug);
      const name = linkMatch[2].replace(/<[^>]+>/g, '').replace(/^Truyện tranh\s+/i, '').trim();
      const imgMatch =
        block.match(/data-original=["']([^"']+)["']/i) ||
        block.match(/data-retries=["']([^"']+)["']/i) ||
        block.match(/<img[^>]+src=["']([^"']+)["']/i);
      let rawThumb = imgMatch ? imgMatch[1].trim() : '';
      if (rawThumb.startsWith('//')) rawThumb = `https:${rawThumb}`;
      const chapMatch = block.match(/href=["']https?:\/\/[^/]+\/truyen-tranh\/[^/]+\/(chuong-[^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const chapSlug = chapMatch ? chapMatch[1].trim() : 'chuong-1';
      const chapName = chapMatch ? chapMatch[2].replace(/<[^>]+>/g, '').replace(/chapter\s*|chương\s*/i, '').trim() : 'Mới';

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
        thumb_url: this.rewriteProxyImageForEdge(rawThumb),
        updatedAt: new Date().toISOString(),
        author: ['NetTruyen'],
        category: [{ id: 'manga', name: 'Truyện Việt • NetTruyen', slug: 'manga' }],
        content: `Đọc truyện tranh ${name} bản dịch Tiếng Việt từ kho NetTruyen / NhatTruyen.`,
        chaptersLatest: [
          {
            chapter_name: chapName || 'Mới',
            chapter_api_data: `/v1/api/chapter/nt-${rawSlug}__${chapSlug}`,
          },
        ],
      });
    }
    return items;
  }

  transformCtEdgeItem(m) {
    const rawCover = m.cover_url || m.cover_mobile_url || m.panorama_url || '';
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
      thumb_url: this.rewriteCtImg(rawCover),
      updatedAt: m.newest_chapter_created_at || m.updated_at || new Date().toISOString(),
      author: authors.length > 0 ? authors : ['Đang cập nhật'],
      category: tags,
      content: m.full_description || m.description || 'Truyện tranh Tiếng Việt Full HD từ kho Cứu Truyện.',
      chaptersLatest: [
        {
          chapter_name: latestChap,
          chapter_api_data: latestChapId ? `/v1/api/chapter/${latestChapId}` : '',
        },
      ],
    };
  }

  async netlifyEdgeFetch(endpoint) {
    this.isNetlifyEdgeMode = true;
    const cleanPath = endpoint.replace(/^https?:\/\/[^/]+/, '').replace(/^\/v1\/api/, '');
    const [pathname, queryStr] = cleanPath.split('?');
    const sp = new URLSearchParams(queryStr || '');
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));

    if (pathname === '/the-loai') {
      return { status: 'success', data: { items: DEFAULT_GENRES } };
    }

    // 1. COMIC DETAIL (/truyen-tranh/:id) across NetTruyen, TruyenQQ, Cứu Truyện, MangaDex & SyncDB
    if (pathname.startsWith('/truyen-tranh/')) {
      const fullId = decodeURIComponent(pathname.replace('/truyen-tranh/', ''));
      const syncedDb = await this.getNetlifySyncedDb();
      if (syncedDb?.mangas?.[fullId]?.chapters?.length) {
        return { status: 'success', data: { item: syncedDb.mangas[fullId] } };
      }

      if (fullId.startsWith('nt-')) {
        const rawSlug = fullId.replace(/^nt-/, '');
        const seedItem = (window.SYNCED_MANGA_SEED?.items || []).find((m) => m.slug === fullId);
        let chapters = [];
        try {
          const chRes = await fetch(`/proxy-nt/Comic/Services/ComicService.asmx/ChapterList?slug=${encodeURIComponent(rawSlug)}`);
          const chJson = await chRes.json();
          if (Array.isArray(chJson?.data)) {
            chapters = chJson.data.map((c) => {
              const num = c.chapter_num ?? String(c.chapter_name || '').replace(/[^0-9.]/g, '');
              const cSlug = c.chapter_slug ? String(c.chapter_slug).replace(/^chapter-/i, 'chuong-') : `chuong-${num}`;
              return {
                chapter_name: String(num || '1'),
                chapter_title: c.updated_at ? `Cập nhật ${c.updated_at.split(' ')[0]}` : '',
                chapter_api_data: `/v1/api/chapter/nt-${rawSlug}__${cSlug}`,
                pages: c.image_num || 0,
              };
            });
          }
        } catch (_) {}

        if (chapters.length === 0) {
          const maxCh = seedItem?.chaptersCount || parseInt(seedItem?.chaptersLatest?.[0]?.chapter_name || '50', 10) || 50;
          for (let c = 1; c <= Math.min(maxCh, 1200); c++) {
            chapters.push({
              chapter_name: String(c),
              chapter_title: '[VI • NetTruyen]',
              chapter_api_data: `/v1/api/chapter/nt-${rawSlug}__chuong-${c}`,
              pages: 0,
            });
          }
        }

        return {
          status: 'success',
          data: {
            item: {
              ...(seedItem || {
                _id: fullId,
                slug: fullId,
                source_id: 'nettruyen',
                source_name: '🟢 NetTruyen',
                name: rawSlug,
                origin_code: 'zh',
                origin_label: '🟢 NetTruyen',
                status: 'ongoing',
                thumb_url: `/proxy-nt-img1/nettruyen/thumb/${rawSlug}.jpg`,
                author: ['NetTruyen'],
                category: [{ id: 'manga', name: 'NetTruyen', slug: 'manga' }],
                content: `Đọc truyện ${rawSlug} từ kho NetTruyen.`,
              }),
              chapters: [
                {
                  server_name: `🟢 Tiếng Việt • NetTruyen (${chapters.length} chương)`,
                  server_data: chapters,
                },
              ],
            },
          },
        };
      }

      if (fullId.startsWith('tqq-')) {
        const rawSlug = fullId.replace(/^tqq-/, '');
        const seedItem = (window.SYNCED_MANGA_SEED?.items || []).find((m) => m.slug === fullId);
        const r = await fetch(`/proxy-tqq/${encodeURIComponent(rawSlug)}/`);
        const html = await r.text();
        const chapMatches = [
          ...html.matchAll(
            new RegExp(`href=["']https?:\\/\\/truyenqq\\.cx\\/${rawSlug}\\/(chapter-[^"'/?#]+)\\/?["']`, 'gi')
          ),
        ];
        const seen = new Set();
        const chapters = [];
        for (const m of chapMatches) {
          const cSlug = m[1].trim();
          if (seen.has(cSlug)) continue;
          seen.add(cSlug);
          chapters.push({
            chapter_name: cSlug.replace(/^chapter-/i, ''),
            chapter_title: '[VI • TruyenQQ]',
            chapter_api_data: `/v1/api/chapter/tqq-${rawSlug}__${cSlug}`,
            pages: 0,
          });
        }
        chapters.sort((a, b) => parseFloat(a.chapter_name) - parseFloat(b.chapter_name));
        return {
          status: 'success',
          data: {
            item: {
              ...(seedItem || {
                _id: fullId,
                slug: fullId,
                source_id: 'otruyen_tqq',
                source_name: '🔵 TruyenQQ • OTruyen',
                name: rawSlug,
                origin_code: 'zh',
                origin_label: '🔵 TruyenQQ',
                status: 'ongoing',
                thumb_url: '',
              }),
              chapters: [
                {
                  server_name: `🔵 Tiếng Việt • TruyenQQ/OTruyen (${chapters.length} chương)`,
                  server_data: chapters,
                },
              ],
            },
          },
        };
      }

      const rawId = fullId.replace(/^ct-/, '');
      const [mRes, cRes] = await Promise.all([
        this.ctProxyJson(`/mangas/${encodeURIComponent(rawId)}`),
        this.ctProxyJson(`/mangas/${encodeURIComponent(rawId)}/chapters`).catch(() => ({ data: [] })),
      ]);
      const item = this.transformCtEdgeItem(mRes.data || {});
      const rawChapters = Array.isArray(cRes.data) ? cRes.data : [];
      item.chapters = [
        {
          server_name: `🟣 Cứu Truyện Full HD (${rawChapters.length} chương)`,
          server_data: rawChapters.map((ch) => ({
            chapter_name: ch.number ? String(ch.number) : String(ch.order || 1),
            chapter_title: ch.name || '',
            chapter_api_data: `/v1/api/chapter/ct-${ch.id}`,
            pages: ch.pages_count || 0,
          })),
        },
      ];
      return { status: 'success', data: { item } };
    }

    // 2. CHAPTER PAGES (/chapter/:chapterId) across NetTruyen, TruyenQQ, MangaPill, MangaDex & Cứu Truyện
    if (pathname.startsWith('/chapter/')) {
      const chapId = decodeURIComponent(pathname.replace('/chapter/', ''));

      if (chapId.startsWith('nt-')) {
        const [ntSlug, cSlug] = chapId.replace(/^nt-/, '').split('__');
        const r = await fetch(`/proxy-nt/truyen-tranh/${encodeURIComponent(ntSlug)}/${encodeURIComponent(cSlug || 'chuong-1')}`);
        const html = await r.text();
        const pageBlocks = html.match(/<div[^>]+class=["'][^"']*page-chapter[^"']*["'][^>]*>[\s\S]*?<\/div>/gi) || [];
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
            if (u.startsWith('http')) urls.push(this.rewriteProxyImageForEdge(u));
          }
        }
        return {
          status: 'success',
          data: {
            domain_cdn: '',
            item: {
              _id: chapId,
              chapter_path: '',
              chapter_image: urls.map((u, idx) => ({ image_page: idx + 1, image_file: u, hd_file: u })),
            },
          },
        };
      }

      if (chapId.startsWith('tqq-')) {
        const [tqqSlug, cSlug] = chapId.replace(/^tqq-/, '').split('__');
        const r = await fetch(`/proxy-tqq/${encodeURIComponent(tqqSlug)}/${encodeURIComponent(cSlug || 'chapter-1')}/`);
        const html = await r.text();
        const imgs = [...html.matchAll(/<img[^>]+(?:data-src|data-lazy-src|src)=["'](https?:\/\/[^"']*(?:otruyencdn|truyenqq)[^"']*)["']/gi)].map((m) =>
          this.rewriteProxyImageForEdge(m[1].trim())
        );
        return {
          status: 'success',
          data: {
            domain_cdn: '',
            item: {
              _id: chapId,
              chapter_path: '',
              chapter_image: imgs.map((u, idx) => ({ image_page: idx + 1, image_file: u, hd_file: u })),
            },
          },
        };
      }

      if (chapId.startsWith('mp-')) {
        const rawPath = chapId.replace(/^mp-/, '').replace('__', '/');
        const r = await fetch(`/proxy-mp/chapters/${rawPath}`);
        const html = await r.text();
        const imgs = [...html.matchAll(/data-src=["'](https?:\/\/[^"']+)["']/gi)]
          .map((m) => m[1].trim())
          .filter((u) => u.includes('readdetectiveconan.com') || u.includes('mangap'))
          .map((u) => this.rewriteProxyImageForEdge(u));
        return {
          status: 'success',
          data: {
            domain_cdn: '',
            item: {
              _id: chapId,
              chapter_path: '',
              chapter_image: imgs.map((u, idx) => ({ image_page: idx + 1, image_file: u, hd_file: u })),
            },
          },
        };
      }

      if (!chapId.startsWith('ct-') && chapId.includes('-') && chapId.length >= 32) {
        const r = await fetch(`/proxy-md-api/at-home/server/${encodeURIComponent(chapId)}`);
        const mdJson = await r.json();
        const hash = mdJson?.chapter?.hash || '';
        const files = mdJson?.chapter?.dataSaver?.length ? mdJson.chapter.dataSaver : mdJson?.chapter?.data || [];
        const modeFolder = mdJson?.chapter?.dataSaver?.length ? 'data-saver' : 'data';
        return {
          status: 'success',
          data: {
            domain_cdn: '',
            item: {
              _id: chapId,
              chapter_path: '',
              chapter_image: files.map((f, idx) => {
                const u = `/proxy-md-img/${modeFolder}/${hash}/${f}`;
                return { image_page: idx + 1, image_file: u, hd_file: `/proxy-md-img/data/${hash}/${mdJson?.chapter?.data?.[idx] || f}` };
              }),
            },
          },
        };
      }

      const rawChapId = chapId.replace(/^ct-/, '');
      const res = await this.ctProxyJson(`/chapters/${encodeURIComponent(rawChapId)}`);
      const pages = Array.isArray(res?.data?.pages) ? res.data.pages : [];
      const chapter_image = pages.map((p, idx) => {
        const imgUrl = this.rewriteCtImg(p.image_url);
        return {
          image_page: idx + 1,
          image_file: imgUrl,
          hd_file: imgUrl,
          drm_data: p.drm_data ? String(p.drm_data).replace(/\s+/g, '') : '',
        };
      });
      return {
        status: 'success',
        data: { domain_cdn: '', item: { _id: `ct-${rawChapId}`, chapter_path: '', chapter_image } },
      };
    }

    // 3. LIST, FILTER, SEARCH, OR HOME across NetTruyen, TruyenQQ, Legends, SyncedDB & Cứu Truyện
    const keyword = (sp.get('keyword') || '').trim();
    const status = sp.get('status') || '';
    const origin = sp.get('origin') || '';
    const author = (sp.get('author') || 'all').trim();
    const sort = sp.get('sort') || '';
    const source = sp.get('source') || 'all_vi';
    const rawTags = (sp.get('tags') || '').split(',').map((s) => s.trim()).filter(Boolean);

    const seedItems = window.SYNCED_MANGA_SEED?.items || [];
    const filterSeedItems = (list) => {
      let filtered = [...list];
      if (origin && origin !== 'all') {
        filtered = filtered.filter((m) => m.origin_code === origin);
      }
      if (status && status !== 'all') {
        filtered = filtered.filter((m) => m.status === status);
      }
      if (author && author !== 'all') {
        const normAuthor = author.toLowerCase();
        const tokens = normAuthor.split(/\s+/).filter((t) => t.length > 1);
        filtered = filtered.filter((m) => {
          const joined = (Array.isArray(m.author) ? m.author : [m.author || '']).join(' ').toLowerCase();
          if (joined.includes(normAuthor)) return true;
          if (normAuthor.includes('fujisawa') && joined.includes('fujisawa')) return true;
          if (tokens.length >= 2 && tokens.every((tk) => joined.includes(tk))) return true;
          return false;
        });
      }
      if (keyword) {
        const q = keyword.toLowerCase();
        filtered = filtered.filter(
          (m) => (m.name || '').toLowerCase().includes(q) || (m.content || '').toLowerCase().includes(q)
        );
      }
      return filtered;
    };

    if (author && author !== 'all' && seedItems.length) {
      const list = filterSeedItems(seedItems);
      const offset = (page - 1) * 24;
      return {
        status: 'success',
        data: {
          items: list.slice(offset, offset + 24),
          params: { pagination: { totalItems: list.length, totalItemsPerPage: 24, currentPage: page } },
        },
      };
    }

    // 3A. NETTRUYEN TAB ON NETLIFY (136+ Synced NetTruyen Comics + Live /proxy-nt/* Edge Crawler)
    if (source === 'nettruyen') {
      let ntList = filterSeedItems(
        seedItems.filter((m) => m.source_id === 'nettruyen' || String(m.slug).startsWith('nt-'))
      );

      try {
        const ntUrl = keyword
          ? `/proxy-nt/tim-truyen?keyword=${encodeURIComponent(keyword)}${page > 1 ? `&page=${page}` : ''}`
          : page > 1
          ? `/proxy-nt/?page=${page}`
          : `/proxy-nt/`;
        const r = await fetch(ntUrl);
        if (r.ok) {
          const liveItems = this.parseNetTruyenEdgeHtml(await r.text());
          const seen = new Set(ntList.map((m) => m.slug));
          for (const it of liveItems) {
            if (!seen.has(it.slug)) {
              ntList.push(it);
              seen.add(it.slug);
            }
          }
        }
      } catch (_) {}

      const offset = (page - 1) * 24;
      return {
        status: 'success',
        data: {
          items: ntList.slice(offset, offset + 24),
          params: {
            pagination: {
              totalItems: Math.max(ntList.length, 136),
              totalItemsPerPage: 24,
              currentPage: page,
            },
          },
        },
      };
    }

    // 3B. OTRUYEN / TRUYENQQ TAB ON NETLIFY (91+ Synced TruyenQQ Comics)
    if (source === 'otruyen_tqq') {
      const tqqList = filterSeedItems(
        seedItems.filter((m) => m.source_id === 'otruyen_tqq' || String(m.slug).startsWith('tqq-'))
      );
      const offset = (page - 1) * 24;
      return {
        status: 'success',
        data: {
          items: tqqList.slice(offset, offset + 24),
          params: {
            pagination: {
              totalItems: tqqList.length,
              totalItemsPerPage: 24,
              currentPage: page,
            },
          },
        },
      };
    }

    // 3C. LEGENDS OR SYNCED_DB TAB ON NETLIFY
    if ((source === 'legends' || source === 'synced_db') && seedItems.length) {
      let list = [...seedItems];
      if (source === 'legends') {
        list = list.filter((m) => m.isLegend || (m.chaptersCount || 0) >= 80);
      }
      list = filterSeedItems(list);
      const offset = (page - 1) * 24;
      return {
        status: 'success',
        data: {
          items: list.slice(offset, offset + 24),
          params: {
            pagination: {
              totalItems: list.length,
              totalItemsPerPage: 24,
              currentPage: page,
            },
          },
        },
      };
    }

    // 3D. CUUTRUYEN OR ALL_VI COMBINED ON NETLIFY (Interleaves NetTruyen + Legends + TruyenQQ + Live Cứu Truyện!)
    let ctEndpoint = `/mangas/recently_updated?page=${page}&per_page=24`;
    if (pathname === '/tim-kiem' || keyword) {
      ctEndpoint = `/mangas/search?q=${encodeURIComponent(keyword)}&page=${page}&per_page=24`;
    } else if (rawTags.length > 0) {
      ctEndpoint = `/tags/${encodeURIComponent(rawTags[0])}?page=${page}&per_page=24`;
    } else if (pathname.includes('hoan-thanh') || status === 'completed') {
      ctEndpoint = `/tags/da-hoan-thanh?page=${page}&per_page=24`;
    } else if (pathname.includes('pho-bien') || sort === 'followedCount' || sort === 'rating') {
      ctEndpoint = `/mangas/top?duration=week&page=${page}&per_page=24`;
    } else if (origin === 'ja') {
      ctEndpoint = `/tags/manga?page=${page}&per_page=24`;
    } else if (origin === 'ko') {
      ctEndpoint = `/tags/manhwa?page=${page}&per_page=24`;
    } else if (origin === 'zh') {
      ctEndpoint = `/tags/manhua?page=${page}&per_page=24`;
    }

    let ctItems = [];
    let totalPages = 100;
    try {
      const res = await this.ctProxyJson(ctEndpoint);
      const rawList = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.mangas) ? res.data.mangas : [];
      ctItems = rawList.map((m) => this.transformCtEdgeItem(m));
      totalPages = res?._metadata?.total_pages || 100;
    } catch (_) {}

    if (source === 'cuutruyen') {
      return {
        status: 'success',
        data: {
          items: ctItems,
          params: { pagination: { totalItems: totalPages * 24, totalItemsPerPage: 24, currentPage: page } },
        },
      };
    }

    // When source === 'all_vi', interleave NetTruyen + Legends + TruyenQQ + Cứu Truyện so all sources show on Netlify!
    const ntSeed = filterSeedItems(seedItems.filter((m) => m.source_id === 'nettruyen' || String(m.slug).startsWith('nt-')));
    const tqqSeed = filterSeedItems(seedItems.filter((m) => m.source_id === 'otruyen_tqq'));
    const legendSeed = filterSeedItems(seedItems.filter((m) => m.isLegend));

    const chunkOffset = (page - 1) * 6;
    const combined = [];
    const seenSlugs = new Set();
    const pools = [
      ntSeed.slice(chunkOffset, chunkOffset + 8),
      legendSeed.slice(chunkOffset, chunkOffset + 6),
      tqqSeed.slice(chunkOffset, chunkOffset + 6),
      ctItems,
    ];
    const maxLen = Math.max(0, ...pools.map((p) => p.length));
    for (let i = 0; i < maxLen; i++) {
      for (const pool of pools) {
        if (i < pool.length && pool[i] && !seenSlugs.has(pool[i].slug)) {
          seenSlugs.add(pool[i].slug);
          combined.push(pool[i]);
          if (combined.length >= 24) break;
        }
      }
      if (combined.length >= 24) break;
    }

    return {
      status: 'success',
      data: {
        items: combined,
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

  setApiStatus(isOnline, detail = '') {
    const label = document.getElementById('api-status-label');
    const modalStatus = document.getElementById('modal-api-status');
    if (isOnline) {
      if (label) label.textContent = 'MangaDex VN • Live';
      if (modalStatus) {
        modalStatus.textContent = 'Đang hoạt động tốt (Kết nối trực tiếp localhost:3080 → MangaDex v5)';
        modalStatus.className = 'text-emerald-400 font-bold';
      }
    } else {
      if (label) label.textContent = 'Chế độ Dự Phòng';
      if (modalStatus) {
        modalStatus.textContent = `Chưa kết nối Local Gateway localhost:3080 (${detail || 'Offline'})`;
        modalStatus.className = 'text-amber-400 font-bold';
      }
    }
  }

  resolveThumbUrl(thumbUrl, customTitle = 'MangaVerse') {
    if (!thumbUrl) {
      return this.generateSvgCover(customTitle);
    }
    const rewritten = this.rewriteProxyImageForEdge(thumbUrl);
    if (rewritten.startsWith('/api/') || rewritten.startsWith('/proxy-')) {
      return `${API_ORIGIN}${rewritten}`;
    }
    if (rewritten.startsWith('http://') || rewritten.startsWith('https://') || rewritten.startsWith('data:')) {
      return rewritten;
    }
    const cleanPath = rewritten.replace(/^\/+/, '');
    const domain = (this.cdnDomain || DEFAULT_CDN_IMAGE).replace(/\/+$/, '');
    if (cleanPath.startsWith('uploads/')) {
      return `${domain}/${cleanPath}`;
    }
    return `${domain}/uploads/comics/${cleanPath}`;
  }

  resolveChapterImageUrl(domainCdn, chapterPath, imageFile) {
    if (!imageFile) return '';
    const rewritten = this.rewriteProxyImageForEdge(imageFile);
    if (rewritten.startsWith('/api/') || rewritten.startsWith('/proxy-')) {
      return `${API_ORIGIN}${rewritten}`;
    }
    if (rewritten.startsWith('http://') || rewritten.startsWith('https://') || rewritten.startsWith('data:')) {
      return rewritten;
    }
    const base = (domainCdn || API_ORIGIN).replace(/\/+$/, '');
    const path = (chapterPath || '').replace(/^\/+|\/+$/g, '');
    const file = rewritten.replace(/^\/+/, '');
    return path ? `${base}/${path}/${file}` : `${base}/${file}`;
  }

  generateSvgCover(title = 'Truyện Tranh') {
    const safeTitle = String(title || 'MangaVerse')
      .replace(/[&<>'"]/g, '')
      .slice(0, 34);
    let hash = 0;
    for (let i = 0; i < safeTitle.length; i++) {
      hash = safeTitle.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 48) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue1}, 75%, 28%)" />
          <stop offset="100%" stop-color="hsl(${hue2}, 82%, 14%)" />
        </linearGradient>
      </defs>
      <rect width="360" height="480" fill="url(#g)" />
      <circle cx="290" cy="80" r="110" fill="rgba(255,255,255,0.06)" />
      <circle cx="60" cy="400" r="140" fill="rgba(255,255,255,0.05)" />
      <rect x="24" y="24" width="312" height="432" rx="16" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2" />
      <text x="42" y="80" fill="rgba(255,255,255,0.5)" font-family="sans-serif" font-size="14" font-weight="bold" letter-spacing="2">MANGAVERSE VN</text>
      <foreignObject x="36" y="160" width="288" height="220">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:white;font-family:sans-serif;font-size:24px;font-weight:800;line-height:1.35;text-shadow:0 4px 12px rgba(0,0,0,0.5);word-break:break-word;">
          ${safeTitle}
        </div>
      </foreignObject>
      <text x="42" y="425" fill="#fb7185" font-family="sans-serif" font-size="13" font-weight="bold">KHO TRUYỆN TRANH MỞ</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  handleThumbError(imgEl, title) {
    if (!imgEl || imgEl.dataset.fallbackApplied === '1') return;
    imgEl.dataset.fallbackApplied = '1';
    imgEl.src = this.generateSvgCover(title);
  }

  /* ========================================================================
     ADVANCED MULTI-CRITERIA FILTER & GENRE SYSTEM
     ======================================================================== */
  async fetchGenres() {
    try {
      const res = await this.apiFetch('/the-loai');
      const items = res?.data?.items;
      if (Array.isArray(items) && items.length > 0) {
        this.genres = items.map((g) => ({
          id: g._id,
          name: g.name,
          shortName: g.shortName || g.name.replace(/\s*\(.*?\)/, ''),
          slug: g.slug,
        }));
        this.renderGenrePills();
        this.renderAdvMultiGenresGrid();
      }
    } catch (_) {}
  }

  renderGenrePills() {
    const bar = document.getElementById('genre-pills-bar');
    if (!bar) return;

    const hasNoGenreSelected = this.filters.tags.length === 0 && this.currentMode !== 'genre';
    const displayedGenres = this.showAllGenres ? this.genres : this.genres.slice(0, 14);

    bar.className = this.showAllGenres
      ? 'flex flex-wrap items-center gap-1.5 pb-1'
      : 'flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1';

    let html = `
      <button
        onclick="app.clearGenreFilter()"
        class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
          hasNoGenreSelected
            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
            : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:text-brand-500'
        }"
      >
        🔥 Tất Cả
      </button>
    `;

    displayedGenres.forEach((g) => {
      const active =
        this.filters.tags.includes(g.slug) ||
        (this.currentMode === 'genre' && this.currentGenreSlug === g.slug);
      const label = g.shortName || g.name;
      html += `
        <button
          onclick="app.selectQuickGenre('${this.escapeAttr(g.slug)}', '${this.escapeAttr(label)}')"
          class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            active
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
              : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-brand-500/15 hover:text-brand-500 dark:hover:text-brand-400'
          }"
        >
          ${this.escapeHtml(label)}
        </button>
      `;
    });

    bar.innerHTML = html;

    const toggleBtn = document.getElementById('toggle-genres-btn');
    if (toggleBtn) {
      toggleBtn.textContent = this.showAllGenres
        ? 'Thu gọn thể loại ▲'
        : `Xem tất cả (${this.genres.length} thể loại) ▼`;
    }
  }

  renderAdvMultiGenresGrid() {
    const grid = document.getElementById('adv-multi-genres-grid');
    if (!grid) return;

    grid.innerHTML = this.genres
      .filter((g) => !['manhwa', 'manga', 'manhua'].includes(g.slug))
      .map((g) => {
        const isSelected = this.filters.tags.includes(g.slug);
        const label = g.shortName || g.name;
        return `
        <button
          type="button"
          onclick="app.toggleMultiGenreTag('${this.escapeAttr(g.slug)}')"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
            isSelected
              ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500'
          }"
        >
          <span>${isSelected ? '✓' : '+'}</span>
          <span>${this.escapeHtml(label)}</span>
        </button>
      `;
      })
      .join('');
  }

  toggleAllGenres() {
    this.showAllGenres = !this.showAllGenres;
    this.renderGenrePills();
  }

  clearGenreFilter() {
    this.filters.tags = [];
    this.currentGenreSlug = '';
    this.currentGenreName = '';
    if (this.hasAnyActiveFilter()) {
      this.applyAdvancedFilters();
    } else {
      this.switchList('home');
    }
  }

  selectQuickGenre(slug, name) {
    if (['manhwa', 'manga', 'manhua'].includes(slug)) {
      const mapOrigin = { manga: 'ja', manhwa: 'ko', manhua: 'zh' };
      this.setQuickFilter('origin', mapOrigin[slug]);
      return;
    }
    this.filters.tags = [slug];
    this.currentGenreSlug = slug;
    this.currentGenreName = name;
    this.applyAdvancedFilters();
  }

  toggleMultiGenreTag(slug) {
    const idx = this.filters.tags.indexOf(slug);
    if (idx >= 0) {
      this.filters.tags.splice(idx, 1);
    } else {
      this.filters.tags.push(slug);
    }
    this.renderAdvMultiGenresGrid();
    this.renderGenrePills();
  }

  setTagsCombineMode(mode) {
    this.filters.tagsMode = mode === 'OR' ? 'OR' : 'AND';
    const andBtn = document.getElementById('tags-mode-and-btn');
    const orBtn = document.getElementById('tags-mode-or-btn');
    if (andBtn && orBtn) {
      andBtn.className = `px-2.5 py-1 rounded-lg font-bold ${
        this.filters.tagsMode === 'AND'
          ? 'bg-brand-500 text-white'
          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
      }`;
      orBtn.className = `px-2.5 py-1 rounded-lg font-bold ${
        this.filters.tagsMode === 'OR'
          ? 'bg-brand-500 text-white'
          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
      }`;
    }
  }

  setQuickFilter(key, value) {
    this.filters[key] = value;
    this.syncFilterControlsUI();
    this.applyAdvancedFilters();
  }

  updateDraftFilter(key, value) {
    this.filters[key] = value;
  }

  openAdvancedFilterPanel() {
    this.showView('browse');
    const drawer = document.getElementById('advanced-filter-drawer');
    if (drawer) {
      drawer.classList.remove('hidden');
      drawer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  toggleAdvancedFilterDrawer() {
    const drawer = document.getElementById('advanced-filter-drawer');
    if (drawer) {
      drawer.classList.toggle('hidden');
    }
  }

  setRepositorySource(source) {
    this.currentSource = source || 'all_vi';
    if (this.currentSource === 'mangadex_en') {
      this.filters.lang = 'en';
    } else {
      this.filters.lang = 'vi';
    }
    this.currentPage = 1;
    this.syncFilterControlsUI();
    const names = {
      all_vi: '⚡ Đã chọn: Tất Cả Kho Việt (NetTruyen + OTruyen/TruyenQQ + Cứu Truyện + MangaDex)',
      legends: '🏆 Đã chọn: Tuyển Tập Huyền Thoại Song Ngữ (Blue Lock, Kindaichi, Đầu Bếp Cung Đình, Itto, Slam Dunk + Top 50 Manga)',
      nettruyen: '🟢 Đã chọn: Kho NetTruyen • NhatTruyen (35,000+ bộ)',
      otruyen_tqq: '🔵 Đã chọn: Kho OTruyen API • TruyenQQ (25,000+ bộ)',
      cuutruyen: '🟣 Đã chọn: Kho Cứu Truyện VN (Full HD)',
      mangadex_vi: '🟠 Đã chọn: Kho MangaDex Tiếng Việt (6,746+ bộ)',
      synced_db: '📦 Đã chọn: Kho Truyện & Chương Đã Cào Đồng Bộ (53,300+ Chương • 0ms Instant DB)',
      mangadex_en: '🇬🇧 Đã chọn: Kho MangaDex Quốc Tế (75,000+ bộ)',
    };
    this.showToast(names[this.currentSource] || 'Đã chuyển kho truyện');
    this.loadCurrentList();
  }

  syncFilterControlsUI() {
    // Sync repository source buttons
    document.querySelectorAll('.source-repo-btn').forEach((btn) => {
      const src = btn.getAttribute('data-source-btn');
      const active = src === this.currentSource;
      btn.className = `source-repo-btn px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${
        active
          ? 'bg-gradient-to-r from-brand-500 to-rose-600 text-white shadow-md shadow-brand-500/25'
          : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:text-brand-500'
      }`;
    });

    // Sync origin buttons
    document.querySelectorAll('.origin-filter-btn').forEach((btn) => {
      const code = btn.getAttribute('data-origin-btn');
      const active = code === this.filters.origin;
      btn.className = `origin-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition ${
        active
          ? 'bg-brand-500 text-white shadow-sm'
          : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:border-brand-500'
      }`;
    });

    const statusEl = document.getElementById('filter-status-select');
    if (statusEl) statusEl.value = this.filters.status;

    const sortEl = document.getElementById('filter-sort-select');
    if (sortEl) sortEl.value = this.filters.sort;

    const kwEl = document.getElementById('adv-keyword-input');
    if (kwEl) kwEl.value = this.filters.keyword;

    const authorSelect = document.getElementById('filter-author-select');
    if (authorSelect) authorSelect.value = this.filters.author || 'all';
    document.querySelectorAll('.author-filter-btn').forEach((btn) => {
      const aVal = btn.getAttribute('data-author-btn');
      const active = aVal === (this.filters.author || 'all');
      btn.className = `author-filter-btn shrink-0 px-3 py-1 rounded-full text-xs font-bold transition ${
        active
          ? 'bg-brand-500 text-white shadow-sm'
          : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:border-brand-500'
      }`;
    });

    const demoEl = document.getElementById('adv-demographic-select');
    if (demoEl) demoEl.value = this.filters.demographic;

    const langEl = document.getElementById('adv-lang-select');
    if (langEl) langEl.value = this.filters.lang;

    const yearEl = document.getElementById('adv-year-select');
    if (yearEl) yearEl.value = this.filters.year;

    this.renderGenrePills();
    this.renderAdvMultiGenresGrid();
    this.renderActiveFilterChips();
  }

  hasAnyActiveFilter() {
    return (
      this.filters.keyword.trim() !== '' ||
      this.filters.origin !== 'all' ||
      this.filters.status !== 'all' ||
      this.filters.author !== 'all' ||
      this.filters.demographic !== 'all' ||
      this.filters.lang !== 'vi' ||
      this.filters.year !== 'all' ||
      this.filters.tags.length > 0 ||
      this.filters.sort !== 'latestUploadedChapter'
    );
  }

  countActiveFilters() {
    let count = 0;
    if (this.filters.keyword.trim()) count++;
    if (this.filters.origin !== 'all') count++;
    if (this.filters.status !== 'all') count++;
    if (this.filters.author !== 'all') count++;
    if (this.filters.demographic !== 'all') count++;
    if (this.filters.lang !== 'vi') count++;
    if (this.filters.year !== 'all') count++;
    if (this.filters.sort !== 'latestUploadedChapter') count++;
    count += this.filters.tags.length;
    return count;
  }

  renderActiveFilterChips() {
    const bar = document.getElementById('active-filter-chips-bar');
    const badge = document.getElementById('adv-filter-count-badge');
    const count = this.countActiveFilters();

    if (badge) {
      badge.textContent = String(count);
      badge.classList.toggle('hidden', count === 0);
    }

    if (!bar) return;
    if (count === 0) {
      bar.classList.add('hidden');
      bar.innerHTML = '';
      return;
    }

    bar.classList.remove('hidden');
    const chips = [];

    if (this.filters.keyword.trim()) {
      chips.push({
        label: `🔍 Từ khóa: "${this.filters.keyword.trim()}"`,
        action: `app.removeSingleFilter('keyword')`,
      });
    }

    const originNames = { ja: '🇯🇵 Manga (Nhật)', ko: '🇰🇷 Manhwa (Hàn)', zh: '🇨🇳 Manhua (Trung)' };
    if (this.filters.origin !== 'all' && originNames[this.filters.origin]) {
      chips.push({
        label: originNames[this.filters.origin],
        action: `app.removeSingleFilter('origin')`,
      });
    }

    const statusNames = { ongoing: '🟢 Đang tiến hành', completed: '✅ Đã hoàn thành', hiatus: '⏸️ Tạm ngưng' };
    if (this.filters.status !== 'all' && statusNames[this.filters.status]) {
      chips.push({
        label: statusNames[this.filters.status],
        action: `app.removeSingleFilter('status')`,
      });
    }

    if (this.filters.author && this.filters.author !== 'all') {
      chips.push({
        label: `✍️ Tác giả: ${this.filters.author}`,
        action: `app.removeSingleFilter('author')`,
      });
    }

    const demoNames = {
      shounen: '⚡ Shounen',
      seinen: '⚔️ Seinen',
      shoujo: '🌸 Shoujo',
      josei: '💎 Josei',
    };
    if (this.filters.demographic !== 'all' && demoNames[this.filters.demographic]) {
      chips.push({
        label: demoNames[this.filters.demographic],
        action: `app.removeSingleFilter('demographic')`,
      });
    }

    if (this.filters.lang !== 'vi') {
      const langNames = { en: '🇬🇧 Bản dịch Tiếng Anh', all: '🌐 Mọi ngôn ngữ' };
      chips.push({
        label: langNames[this.filters.lang] || this.filters.lang,
        action: `app.removeSingleFilter('lang')`,
      });
    }

    if (this.filters.year !== 'all') {
      chips.push({
        label: `📅 Năm ${this.filters.year}`,
        action: `app.removeSingleFilter('year')`,
      });
    }

    const sortNames = {
      followedCount: '👑 Phổ biến nhất',
      rating: '⭐ Đánh giá cao',
      createdAt: '🆕 Truyện mới đăng',
      title: '🔤 Tên A → Z',
    };
    if (this.filters.sort !== 'latestUploadedChapter' && sortNames[this.filters.sort]) {
      chips.push({
        label: sortNames[this.filters.sort],
        action: `app.removeSingleFilter('sort')`,
      });
    }

    this.filters.tags.forEach((slug) => {
      const g = this.genres.find((item) => item.slug === slug);
      const name = g ? g.shortName || g.name : slug;
      chips.push({
        label: `🏷️ ${name}`,
        action: `app.removeTagFilter('${this.escapeAttr(slug)}')`,
      });
    });

    bar.innerHTML = `
      <span class="text-[11px] font-bold text-slate-400 mr-1">Đang lọc (${count}):</span>
      ${chips
        .map(
          (c) => `
        <button
          onclick="${c.action}"
          class="px-2.5 py-1 rounded-lg bg-brand-500/15 border border-brand-500/35 text-brand-600 dark:text-brand-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-500 hover:text-white transition"
        >
          <span>${this.escapeHtml(c.label)}</span>
          <span class="font-bold">×</span>
        </button>
      `
        )
        .join('')}
      <button
        onclick="app.resetAllFilters()"
        class="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 text-xs font-bold transition ml-auto"
      >
        Xóa tất cả bộ lọc
      </button>
    `;
  }

  removeSingleFilter(key) {
    const defaults = {
      keyword: '',
      origin: 'all',
      status: 'all',
      author: 'all',
      demographic: 'all',
      lang: 'vi',
      year: 'all',
      sort: 'latestUploadedChapter',
    };
    this.filters[key] = defaults[key];
    this.syncFilterControlsUI();
    if (this.hasAnyActiveFilter()) {
      this.applyAdvancedFilters();
    } else {
      this.switchList('home');
    }
  }

  removeTagFilter(slug) {
    this.filters.tags = this.filters.tags.filter((s) => s !== slug);
    this.syncFilterControlsUI();
    if (this.hasAnyActiveFilter()) {
      this.applyAdvancedFilters();
    } else {
      this.switchList('home');
    }
  }

  resetAllFilters() {
    this.filters = {
      keyword: '',
      origin: 'all',
      status: 'all',
      author: 'all',
      sort: 'latestUploadedChapter',
      demographic: 'all',
      lang: 'vi',
      year: 'all',
      tags: [],
      tagsMode: 'AND',
    };
    this.syncFilterControlsUI();
    this.switchList('home');
    this.showToast('Đã đặt lại toàn bộ bộ lọc về mặc định');
  }

  async applyAdvancedFilters() {
    this.currentMode = 'filter';
    this.currentPage = 1;
    this.showView('browse');
    this.syncFilterControlsUI();
    this.updateNavActiveStates();
    await this.loadCurrentList();
  }

  /* ========================================================================
     CARD LAYOUT SWITCHER (GRID 6-COL vs DETAILED 3-COL WITH SYNOPSIS)
     ======================================================================== */
  setCardLayout(layout) {
    this.cardLayout = layout === 'detailed' ? 'detailed' : 'grid';
    localStorage.setItem(STORAGE_KEYS.CARD_LAYOUT, this.cardLayout);
    this.updateCardLayoutButtons();
    this.renderComicGrid(this.currentListItems);
  }

  updateCardLayoutButtons() {
    const gridBtn = document.getElementById('layout-grid-btn');
    const detailBtn = document.getElementById('layout-detail-btn');
    if (!gridBtn || !detailBtn) return;

    const isGrid = this.cardLayout === 'grid';
    gridBtn.className = `p-1.5 rounded-lg text-xs font-bold transition ${
      isGrid ? 'bg-brand-500 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-brand-500'
    }`;
    detailBtn.className = `p-1.5 rounded-lg text-xs font-bold transition ${
      !isGrid ? 'bg-brand-500 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-brand-500'
    }`;
  }

  /* ========================================================================
     NAVIGATION & LIST LOADING
     ======================================================================== */
  navigateHome() {
    window.location.hash = '';
    this.resetAllFilters();
  }

  showView(viewName) {
    this.currentView = viewName;
    document.getElementById('view-browse')?.classList.toggle('hidden', viewName !== 'browse');
    document.getElementById('view-detail')?.classList.toggle('hidden', viewName !== 'detail');
    document.getElementById('view-reader')?.classList.toggle('hidden', viewName !== 'reader');
    document.getElementById('main-header')?.classList.toggle('hidden', viewName === 'reader');
    document.getElementById('main-footer')?.classList.toggle('hidden', viewName === 'reader');
    document.getElementById('reader-top-progress-wrap')?.classList.toggle('hidden', viewName !== 'reader');

    if (viewName !== 'reader') {
      this.stopAutoScroll();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateNavActiveStates() {
    document.querySelectorAll('.nav-tab').forEach((btn) => {
      const nav = btn.getAttribute('data-nav');
      const isActive = nav === this.currentMode;
      if (nav === 'bookmarks' || nav === 'history') {
        btn.classList.toggle('ring-2', isActive);
        btn.classList.toggle('ring-brand-500', isActive);
      } else {
        btn.className = `nav-tab shrink-0 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1 ${
          isActive
            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`;
      }
    });
  }

  async switchList(mode) {
    this.currentMode = mode;
    this.currentPage = 1;

    if (mode === 'pho-bien') {
      this.filters.sort = 'followedCount';
    } else if (mode === 'hoan-thanh') {
      this.filters.status = 'completed';
    } else if (mode === 'home' || mode === 'truyen-moi') {
      this.filters.status = 'all';
      this.filters.sort = 'latestUploadedChapter';
    }

    this.showView('browse');
    this.syncFilterControlsUI();
    this.updateNavActiveStates();
    await this.loadCurrentList();
  }

  async refreshCurrentList() {
    this.apiCache.clear();
    this.showToast('Đang làm mới dữ liệu từ kho truyện...');
    await this.loadCurrentList();
  }

  async loadHomeData(silent = false) {
    try {
      const res = await this.apiFetch('/home');
      const items = res?.data?.items || [];
      if (items.length > 0) {
        this.heroItems = items.slice(0, 6);
        this.currentListItems = items;
        if (!silent) {
          this.renderHeroCarousel();
        }
      }
    } catch (_) {
      this.heroItems = FALLBACK_COMICS;
      this.currentListItems = FALLBACK_COMICS;
      if (!silent) {
        this.renderHeroCarousel();
      }
    }
  }

  async loadCurrentList() {
    const heroSection = document.getElementById('hero-section');
    const isHome = this.currentMode === 'home' && this.currentPage === 1 && !this.hasAnyActiveFilter();
    if (heroSection) {
      heroSection.classList.toggle('hidden', !isHome);
    }

    this.renderContinueReadingShelf();

    if (this.currentMode === 'bookmarks') {
      this.renderBookmarksList();
      return;
    }
    if (this.currentMode === 'history') {
      this.renderHistoryList();
      return;
    }

    this.renderGridSkeletons(12);

    const titleMap = {
      'home': {
        title: 'Truyện Tranh Tiếng Việt Mới Cập Nhật',
        subtitle: 'Cập nhật liên tục các chương Manga, Manhwa, Manhua Tiếng Việt mới ra lò',
      },
      'truyen-moi': {
        title: 'Truyện Vừa Ra Chương Mới',
        subtitle: 'Danh sách truyện vừa cập nhật chương Tiếng Việt mới nhất theo thời gian thực',
      },
      'pho-bien': {
        title: '🔥 Bảng Xếp Hạng Truyện Hot & Phổ Biến Nhất',
        subtitle: 'Những siêu phẩm có lượng độc giả theo dõi và đánh giá cao nhất',
      },
      'hoan-thanh': {
        title: '✅ Truyện Tranh Đã Hoàn Thành (Full)',
        subtitle: 'Tuyển tập truyện đã ra trọn bộ — đọc một mạch không lo chờ chương',
      },
      'filter': {
        title: '🎯 Kết Quả Lọc Truyện Đa Tiêu Chí',
        subtitle: 'Danh sách truyện khớp với bộ lọc tùy chỉnh của bạn',
      },
      'search': {
        title: `🔍 Kết Quả Tìm Kiếm: "${this.currentSearchQuery}"`,
        subtitle: 'Tìm kiếm trực tiếp trong kho hơn 6,700+ bộ truyện tranh Tiếng Việt',
      },
    };

    const meta = titleMap[this.currentMode] || titleMap['home'];
    document.getElementById('list-title').textContent = meta.title;
    document.getElementById('list-subtitle').textContent = meta.subtitle;

    try {
      let endpoint = `/home?source=${this.currentSource}`;
      if (this.currentMode === 'filter') {
        const qs = new URLSearchParams({
          page: String(this.currentPage),
          source: this.currentSource,
          keyword: this.filters.keyword.trim(),
          origin: this.filters.origin,
          status: this.filters.status,
          author: this.filters.author || 'all',
          demographic: this.filters.demographic,
          lang: this.filters.lang,
          year: this.filters.year,
          sort: this.filters.sort,
          tags: this.filters.tags.join(','),
          tagsMode: this.filters.tagsMode,
        });
        endpoint = `/filter?${qs.toString()}`;
      } else if (this.currentMode === 'home') {
        endpoint =
          this.currentPage > 1
            ? `/danh-sach/truyen-moi?page=${this.currentPage}&source=${this.currentSource}`
            : `/home?source=${this.currentSource}`;
      } else if (['truyen-moi', 'dang-phat-hanh', 'hoan-thanh', 'pho-bien'].includes(this.currentMode)) {
        endpoint = `/danh-sach/${this.currentMode}?page=${this.currentPage}&source=${this.currentSource}`;
      } else if (this.currentMode === 'search') {
        endpoint = `/tim-kiem?keyword=${encodeURIComponent(this.currentSearchQuery)}&page=${this.currentPage}&source=${this.currentSource}`;
      }

      const res = await this.apiFetch(endpoint);
      const data = res?.data || {};
      const items = data.items || [];
      const pagination = data?.params?.pagination || {};

      this.currentListItems = items;
      this.totalItems = pagination.totalItems || items.length;
      const perPage = pagination.totalItemsPerPage || 24;
      this.totalPages = Math.max(1, Math.min(400, Math.ceil(this.totalItems / perPage)));

      if (isHome && items.length > 0) {
        this.heroItems = items.slice(0, 6);
        this.renderHeroCarousel();
      }

      document.getElementById('total-items-badge').textContent =
        `${this.totalItems.toLocaleString('vi-VN')} truyện • Trang ${this.currentPage}/${this.totalPages}`;

      this.renderComicGrid(items);
      this.renderPagination();
    } catch (err) {
      this.currentListItems = FALLBACK_COMICS;
      this.heroItems = FALLBACK_COMICS;
      if (isHome) this.renderHeroCarousel();
      document.getElementById('total-items-badge').textContent = `${FALLBACK_COMICS.length} truyện mẫu`;
      this.renderComicGrid(FALLBACK_COMICS);
      document.getElementById('pagination-bar').innerHTML = '';
    }
  }

  /* ========================================================================
     HERO SPOTLIGHT CAROUSEL & CONTINUE READING SHELF
     ======================================================================== */
  renderHeroCarousel() {
    const container = document.getElementById('hero-content');
    if (!container || this.heroItems.length === 0) return;

    if (this.activeHeroIndex >= this.heroItems.length) {
      this.activeHeroIndex = 0;
    }

    const comic = this.heroItems[this.activeHeroIndex];
    const thumb = this.resolveThumbUrl(comic.thumb_url, comic.name);
    const latestChap = comic.chaptersLatest?.[0]?.chapter_name || 'Mới';
    const categories = (comic.category || []).slice(0, 4);
    const isSaved = this.isBookmarked(comic.slug);
    const desc = this.stripHtmlTags(comic.content || '');

    container.innerHTML = `
      <div class="relative w-full overflow-hidden">
        <img
          src="${this.escapeAttr(thumb)}"
          alt=""
          onerror="app.handleThumbError(this, '${this.escapeAttr(comic.name)}')"
          class="hero-backdrop absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
        />
        <div class="absolute inset-0 bg-gradient-to-r from-[#080c14] via-[#080c14]/88 to-[#080c14]/55"></div>

        <div class="relative z-10 p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-9">
          <div
            onclick="app.openComicDetail('${this.escapeAttr(comic.slug)}')"
            class="w-36 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/15 shrink-0 cursor-pointer group relative"
          >
            <img
              src="${this.escapeAttr(thumb)}"
              alt="${this.escapeAttr(comic.name)}"
              onerror="app.handleThumbError(this, '${this.escapeAttr(comic.name)}')"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div class="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-brand-500 text-white text-[11px] font-extrabold shadow">
              TOP #${this.activeHeroIndex + 1}
            </div>
          </div>

          <div class="flex-1 text-center sm:text-left space-y-3 max-w-2xl">
            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              ${
                comic.origin_label
                  ? `<span class="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white text-xs font-bold">${this.escapeHtml(comic.origin_label)}</span>`
                  : ''
              }
              <span class="px-2.5 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs font-bold">
                ⚡ Chương ${this.escapeHtml(latestChap)}
              </span>
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                ${this.formatTimeAgo(comic.updatedAt)}
              </span>
            </div>

            <h2
              onclick="app.openComicDetail('${this.escapeAttr(comic.slug)}')"
              class="text-xl sm:text-3xl font-extrabold text-white leading-tight cursor-pointer hover:text-brand-400 transition line-clamp-2"
            >
              ${this.escapeHtml(comic.name)}
            </h2>

            <p class="text-xs sm:text-sm text-slate-300/90 line-clamp-2 leading-relaxed">
              ${this.escapeHtml(desc)}
            </p>

            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              ${categories
                .map(
                  (c) => `
                <button
                  onclick="app.selectQuickGenre('${this.escapeAttr(c.slug)}', '${this.escapeAttr(c.name)}')"
                  class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-brand-500 text-slate-200 hover:text-white text-xs font-medium transition"
                >
                  ${this.escapeHtml(c.name)}
                </button>
              `
                )
                .join('')}
            </div>

            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
              <button
                onclick="app.openComicDetail('${this.escapeAttr(comic.slug)}')"
                class="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-500 to-rose-600 hover:from-brand-600 hover:to-rose-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-brand-500/30 flex items-center gap-2 transition"
              >
                <span>📖 Đọc Ngay</span>
              </button>

              <button
                onclick="app.openQuickPreview('${this.escapeAttr(comic.slug)}')"
                class="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition"
              >
                <span>👁️ Xem Nhanh</span>
              </button>

              <button
                onclick="app.toggleBookmarkFromObject('${this.escapeAttr(comic.slug)}')"
                class="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition"
              >
                <span>${isSaved ? '❤️ Đã Lưu' : '🤍 Lưu Tủ'}</span>
              </button>
            </div>
          </div>

          <div class="flex sm:flex-col items-center gap-2">
            ${this.heroItems
              .map(
                (_, idx) => `
              <button
                onclick="app.setHeroSlide(${idx})"
                class="rounded-full transition-all ${
                  idx === this.activeHeroIndex
                    ? 'w-7 sm:w-2.5 h-2.5 sm:h-7 bg-brand-500'
                    : 'w-2.5 h-2.5 bg-white/25 hover:bg-white/50'
                }"
              ></button>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    this.startHeroTimer();
  }

  setHeroSlide(index) {
    this.activeHeroIndex = index;
    this.renderHeroCarousel();
  }

  startHeroTimer() {
    if (this.heroTimer) clearInterval(this.heroTimer);
    this.heroTimer = setInterval(() => {
      if (this.currentView === 'browse' && this.currentMode === 'home' && this.heroItems.length > 1) {
        this.activeHeroIndex = (this.activeHeroIndex + 1) % this.heroItems.length;
        this.renderHeroCarousel();
      }
    }, 6500);
  }

  renderContinueReadingShelf() {
    const section = document.getElementById('continue-reading-section');
    const listEl = document.getElementById('continue-reading-list');
    if (!section || !listEl) return;

    const showShelf = this.currentMode === 'home' && this.history.length > 0;
    section.classList.toggle('hidden', !showShelf);
    if (!showShelf) return;

    const recent = this.history.slice(0, 4);
    listEl.innerHTML = recent
      .map((item) => {
        const thumb = this.resolveThumbUrl(item.thumb_url, item.name);
        return `
        <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 hover:border-brand-500/60 transition group">
          <img
            src="${this.escapeAttr(thumb)}"
            alt="${this.escapeAttr(item.name)}"
            onerror="app.handleThumbError(this, '${this.escapeAttr(item.name)}')"
            onclick="app.openComicDetail('${this.escapeAttr(item.slug)}')"
            class="w-12 h-16 rounded-lg object-cover shrink-0 cursor-pointer"
          />
          <div class="min-w-0 flex-1">
            <h4
              onclick="app.openComicDetail('${this.escapeAttr(item.slug)}')"
              class="text-xs font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-brand-500"
            >
              ${this.escapeHtml(item.name)}
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Đã đọc: <strong class="text-brand-500">Chương ${this.escapeHtml(item.lastChapterName)}</strong>
            </p>
            <button
              onclick="app.resumeFromHistory('${this.escapeAttr(item.slug)}', '${this.escapeAttr(item.lastChapterName)}', '${this.escapeAttr(item.lastChapterApi || '')}')"
              class="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              <span>▶ Đọc tiếp ngay</span>
            </button>
          </div>
        </div>
      `;
      })
      .join('');
  }

  /* ========================================================================
     COMIC GRID (6-COL POSTER vs 3-COL DETAILED CARDS) & QUICK PREVIEW
     ======================================================================== */
  renderGridSkeletons(count = 12) {
    const grid = document.getElementById('comic-grid');
    if (!grid) return;
    grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5';
    grid.innerHTML = Array.from({ length: count })
      .map(
        () => `
      <div class="rounded-2xl overflow-hidden bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800/80 p-2.5 space-y-2.5">
        <div class="aspect-[3/4] rounded-xl skeleton"></div>
        <div class="h-4 w-5/6 rounded skeleton"></div>
        <div class="h-3 w-1/2 rounded skeleton"></div>
      </div>
    `
      )
      .join('');
  }

  renderComicGrid(items) {
    const grid = document.getElementById('comic-grid');
    if (!grid) return;

    if (!items || items.length === 0) {
      grid.className = 'grid grid-cols-1';
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center space-y-3 bg-white dark:bg-[#101726] rounded-3xl border border-slate-200 dark:border-slate-800">
          <div class="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">Không tìm thấy truyện khớp với bộ lọc này</h3>
          <p class="text-xs text-slate-500 max-w-md mx-auto">Hãy thử bớt một vài thể loại hoặc chuyển chế độ ghép thể loại sang "Chứa bất kỳ (OR)".</p>
          <button onclick="app.resetAllFilters()" class="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold shadow">
            ↺ Đặt lại toàn bộ bộ lọc
          </button>
        </div>
      `;
      return;
    }

    // MODE A: DETAILED CARD VIEW (3 Columns with Full Synopsis & Metadata)
    if (this.cardLayout === 'detailed') {
      grid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5';
      grid.innerHTML = items
        .map((comic) => {
          const thumb = this.resolveThumbUrl(comic.thumb_url, comic.name);
          const latestChapObj = comic.chaptersLatest?.[0];
          const latestChap = latestChapObj?.chapter_name || comic.lastChapterName || '';
          const latestApi = latestChapObj?.chapter_api_data || latestChapObj?.chapter_api || '';
          const isSaved = this.isBookmarked(comic.slug);
          const categories = (comic.category || []).slice(0, 4);
          const synopsis = this.stripHtmlTags(comic.content || 'Đang cập nhật tóm tắt cốt truyện.');
          const originBadge = comic.origin_label || '🌐 Truyện';

          return `
          <article class="comic-card rounded-2xl bg-white dark:bg-[#101726] border border-slate-200/80 dark:border-slate-800/90 p-3.5 flex gap-4">
            <!-- Cover Poster -->
            <div
              onclick="app.openComicDetail('${this.escapeAttr(comic.slug)}')"
              class="w-28 sm:w-32 aspect-[3/4] rounded-xl overflow-hidden bg-slate-900 shrink-0 cursor-pointer relative group"
            >
              <img
                src="${this.escapeAttr(thumb)}"
                alt="${this.escapeAttr(comic.name)}"
                loading="lazy"
                onerror="app.handleThumbError(this, '${this.escapeAttr(comic.name)}')"
                class="comic-thumb w-full h-full object-cover"
              />
              <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 text-white text-[10px] font-bold">
                ${this.escapeHtml(originBadge)}
              </span>
            </div>

            <!-- Right Content -->
            <div class="flex-1 min-w-0 flex flex-col justify-between space-y-2">
              <div class="space-y-1.5">
                <div class="flex items-start justify-between gap-2">
                  <h3
                    onclick="app.openComicDetail('${this.escapeAttr(comic.slug)}')"
                    class="text-sm font-extrabold text-slate-900 dark:text-white hover:text-brand-500 dark:hover:text-brand-400 cursor-pointer line-clamp-1"
                  >
                    ${this.escapeHtml(comic.name)}
                  </h3>
                  <button
                    onclick="app.toggleBookmarkFromObject('${this.escapeAttr(comic.slug)}')"
                    class="text-xs shrink-0 ${isSaved ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}"
                  >
                    ${isSaved ? '❤️' : '🤍'}
                  </button>
                </div>

                <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span class="px-2 py-0.5 rounded bg-brand-500/15 text-brand-500 font-bold">
                    Chương ${this.escapeHtml(latestChap || 'Mới')}
                  </span>
                  <span class="text-slate-400">• ${this.formatTimeAgo(comic.updatedAt)}</span>
                  ${
                    comic.status === 'completed'
                      ? `<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">FULL</span>`
                      : ''
                  }
                </div>

                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  ${this.escapeHtml(synopsis)}
                </p>
              </div>

              <div class="space-y-2 pt-1">
                <div class="flex flex-wrap gap-1">
                  ${categories
                    .map(
                      (c) => `
                    <button
                      onclick="app.selectQuickGenre('${this.escapeAttr(c.slug)}', '${this.escapeAttr(c.name)}')"
                      class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-500 text-[10px] font-medium"
                    >
                      ${this.escapeHtml(c.name)}
                    </button>
                  `
                    )
                    .join('')}
                </div>

                <div class="flex items-center gap-2">
                  <button
                    onclick="app.openComicDetail('${this.escapeAttr(comic.slug)}')"
                    class="flex-1 py-1.5 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold text-center transition"
                  >
                    📖 Chi Tiết & Đọc
                  </button>
                  ${
                    latestApi
                      ? `<button
                          onclick="app.quickReadLatest('${this.escapeAttr(comic.slug)}', '${this.escapeAttr(latestChap)}', '${this.escapeAttr(latestApi)}', '${this.escapeAttr(comic.name)}', '${this.escapeAttr(comic.thumb_url || '')}')"
                          class="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition"
                        >
                          ⚡ C.${this.escapeHtml(latestChap)}
                        </button>`
                      : ''
                  }
                </div>
              </div>
            </div>
          </article>
        `;
        })
        .join('');
      return;
    }

    // MODE B: STANDARD 6-COLUMN POSTER GRID VIEW
    grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5';
    grid.innerHTML = items
      .map((comic) => {
        const thumb = this.resolveThumbUrl(comic.thumb_url, comic.name);
        const latestChapObj = comic.chaptersLatest?.[0];
        const latestChap = latestChapObj?.chapter_name || comic.lastChapterName || '';
        const latestApi = latestChapObj?.chapter_api_data || latestChapObj?.chapter_api || '';
        const isSaved = this.isBookmarked(comic.slug);
        const historyEntry = this.getHistoryForComic(comic.slug);
        const categories = (comic.category || []).slice(0, 2);
        const statusBadge =
          comic.status === 'completed'
            ? `<span class="px-1.5 py-0.5 rounded-md bg-emerald-500/95 text-white text-[10px] font-extrabold shadow">FULL</span>`
            : '';
        const originBadge = comic.origin_label
          ? `<span class="px-1.5 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold">${this.escapeHtml(comic.origin_label)}</span>`
          : '';

        return `
        <article class="comic-card group relative rounded-2xl bg-white dark:bg-[#101726] border border-slate-200/80 dark:border-slate-800/90 overflow-hidden flex flex-col">
          <!-- Cover Image Container -->
          <div
            onclick="app.openComicDetail('${this.escapeAttr(comic.slug)}')"
            class="relative aspect-[3/4] overflow-hidden bg-slate-900 cursor-pointer"
          >
            <img
              src="${this.escapeAttr(thumb)}"
              alt="${this.escapeAttr(comic.name)}"
              loading="lazy"
              onerror="app.handleThumbError(this, '${this.escapeAttr(comic.name)}')"
              class="comic-thumb w-full h-full object-cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent"></div>

            <!-- Top Left Origin / Status Badge -->
            <div class="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1">
              ${originBadge}
              ${statusBadge}
            </div>

            <!-- Top Right Action Buttons: Quick Preview (👁️) & Bookmark (❤️) -->
            <div class="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
              <button
                onclick="event.stopPropagation(); app.toggleBookmarkFromObject('${this.escapeAttr(comic.slug)}')"
                title="${isSaved ? 'Bỏ lưu khỏi tủ truyện' : 'Lưu vào tủ truyện'}"
                class="w-7 h-7 rounded-full bg-slate-950/75 backdrop-blur-md flex items-center justify-center hover:scale-110 transition ${
                  isSaved ? 'text-rose-500' : 'text-white/85 hover:text-rose-400'
                }"
              >
                <svg class="w-3.5 h-3.5" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>

              <button
                onclick="event.stopPropagation(); app.openQuickPreview('${this.escapeAttr(comic.slug)}')"
                title="Xem nhanh tóm tắt cốt truyện"
                class="w-7 h-7 rounded-full bg-slate-950/75 backdrop-blur-md text-white/85 hover:text-brand-400 flex items-center justify-center hover:scale-110 transition"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>

            <!-- Bottom Overlay Info: Latest Chapter & Time -->
            <div class="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
              ${
                latestChap
                  ? `<button
                      onclick="event.stopPropagation(); app.quickReadLatest('${this.escapeAttr(comic.slug)}', '${this.escapeAttr(latestChap)}', '${this.escapeAttr(latestApi)}', '${this.escapeAttr(comic.name)}', '${this.escapeAttr(comic.thumb_url || '')}')"
                      title="Đọc ngay Chương ${this.escapeAttr(latestChap)}"
                      class="px-2.5 py-1 rounded-lg bg-brand-500/95 hover:bg-brand-600 text-white text-[11px] font-bold shadow transition truncate"
                    >
                      Chương ${this.escapeHtml(latestChap)}
                    </button>`
                  : `<span class="px-2 py-0.5 rounded-lg bg-slate-800/90 text-slate-300 text-[10px] font-semibold">Xem chương</span>`
              }
              ${
                historyEntry
                  ? `<span class="px-2 py-0.5 rounded-lg bg-amber-500/95 text-slate-950 text-[10px] font-extrabold shrink-0">
                      C.${this.escapeHtml(historyEntry.lastChapterName)}
                    </span>`
                  : `<span class="text-[10px] text-slate-300 font-medium truncate">${this.formatTimeAgo(comic.updatedAt)}</span>`
              }
            </div>
          </div>

          <!-- Card Body -->
          <div class="p-3 flex-1 flex flex-col justify-between space-y-2">
            <h3
              onclick="app.openComicDetail('${this.escapeAttr(comic.slug)}')"
              title="${this.escapeAttr(comic.name)}"
              class="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition line-clamp-2 cursor-pointer leading-snug"
            >
              ${this.escapeHtml(comic.name)}
            </h3>

            <!-- Genre Tags -->
            <div class="flex flex-wrap items-center gap-1 pt-0.5">
              ${categories
                .map(
                  (cat) => `
                <button
                  onclick="app.selectQuickGenre('${this.escapeAttr(cat.slug)}', '${this.escapeAttr(cat.name)}')"
                  class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 hover:bg-brand-500/15 text-slate-600 dark:text-slate-400 hover:text-brand-500 text-[10px] font-medium transition"
                >
                  ${this.escapeHtml(cat.name)}
                </button>
              `
                )
                .join('')}
            </div>
          </div>
        </article>
      `;
      })
      .join('');
  }

  /* ========================================================================
     QUICK PREVIEW MODAL (👁️ XEM NHANH TRUYỆN)
     ======================================================================== */
  openQuickPreview(slug) {
    const comic =
      this.currentListItems.find((c) => c.slug === slug) ||
      this.heroItems.find((c) => c.slug === slug) ||
      this.bookmarks.find((c) => c.slug === slug);
    if (!comic) {
      this.openComicDetail(slug);
      return;
    }

    const modal = document.getElementById('quick-preview-modal');
    const content = document.getElementById('quick-preview-content');
    if (!modal || !content) return;

    const thumb = this.resolveThumbUrl(comic.thumb_url, comic.name);
    const desc = this.stripHtmlTags(comic.content || 'Đang cập nhật tóm tắt nội dung.');
    const authors = Array.isArray(comic.author) ? comic.author.join(', ') : 'Đang cập nhật';
    const categories = comic.category || [];
    const latestChapObj = comic.chaptersLatest?.[0];
    const latestChap = latestChapObj?.chapter_name || 'Mới';
    const latestApi = latestChapObj?.chapter_api_data || '';
    const isSaved = this.isBookmarked(comic.slug);

    content.innerHTML = `
      <div class="flex flex-col sm:flex-row gap-6">
        <div class="w-36 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 shrink-0 mx-auto sm:mx-0 shadow-xl">
          <img
            src="${this.escapeAttr(thumb)}"
            alt="${this.escapeAttr(comic.name)}"
            onerror="app.handleThumbError(this, '${this.escapeAttr(comic.name)}')"
            class="w-full h-full object-cover"
          />
        </div>

        <div class="flex-1 min-w-0 space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                ${
                  comic.origin_label
                    ? `<span class="px-2 py-0.5 rounded bg-brand-500/15 text-brand-500 text-[11px] font-bold">${this.escapeHtml(comic.origin_label)}</span>`
                    : ''
                }
                <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                  ${comic.status === 'completed' ? '✅ Hoàn thành' : '🟢 Đang tiến hành'}
                </span>
                ${
                  comic.year
                    ? `<span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px]">Năm ${comic.year}</span>`
                    : ''
                }
              </div>
              <h3 class="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                ${this.escapeHtml(comic.name)}
              </h3>
            </div>
            <button onclick="app.closeQuickPreview()" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
              ✕
            </button>
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400">
            Tác giả: <strong class="text-slate-800 dark:text-slate-200">${this.escapeHtml(authors)}</strong>
          </p>

          <div class="flex flex-wrap gap-1.5">
            ${categories
              .map(
                (c) => `
              <button
                onclick="app.closeQuickPreview(); app.selectQuickGenre('${this.escapeAttr(c.slug)}', '${this.escapeAttr(c.name)}')"
                class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-500 hover:text-white text-xs font-medium transition"
              >
                ${this.escapeHtml(c.name)}
              </button>
            `
              )
              .join('')}
          </div>

          <div class="max-h-40 overflow-y-auto pr-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            ${this.escapeHtml(desc)}
          </div>

          <div class="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              onclick="app.closeQuickPreview(); app.openComicDetail('${this.escapeAttr(comic.slug)}')"
              class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition"
            >
              📖 Xem Danh Sách Chương
            </button>
            ${
              latestApi
                ? `<button
                    onclick="app.closeQuickPreview(); app.quickReadLatest('${this.escapeAttr(comic.slug)}', '${this.escapeAttr(latestChap)}', '${this.escapeAttr(latestApi)}', '${this.escapeAttr(comic.name)}', '${this.escapeAttr(comic.thumb_url || '')}')"
                    class="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition"
                  >
                    ⚡ Đọc Ngay Chương ${this.escapeHtml(latestChap)}
                  </button>`
                : ''
            }
            <button
              onclick="app.toggleBookmarkFromObject('${this.escapeAttr(comic.slug)}'); app.openQuickPreview('${this.escapeAttr(comic.slug)}')"
              class="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
            >
              ${isSaved ? '❤️ Đã Lưu' : '🤍 Lưu Tủ'}
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  closeQuickPreview() {
    document.getElementById('quick-preview-modal')?.classList.add('hidden');
  }

  /* ========================================================================
     PAGINATION
     ======================================================================== */
  renderPagination() {
    const bar = document.getElementById('pagination-bar');
    if (!bar) return;

    if (this.totalPages <= 1) {
      bar.innerHTML = '';
      return;
    }

    const cur = this.currentPage;
    const total = this.totalPages;
    const pages = [];

    const start = Math.max(1, cur - 2);
    const end = Math.min(total, cur + 2);
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }

    bar.innerHTML = `
      <div class="flex flex-wrap items-center justify-center gap-1.5">
        <button
          onclick="app.goToPage(1)"
          ${cur === 1 ? 'disabled' : ''}
          class="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 hover:border-brand-500 transition"
        >
          « Đầu
        </button>
        <button
          onclick="app.goToPage(${cur - 1})"
          ${cur === 1 ? 'disabled' : ''}
          class="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 hover:border-brand-500 transition"
        >
          ‹ Trước
        </button>

        ${pages
          .map(
            (p) => `
          <button
            onclick="app.goToPage(${p})"
            class="w-9 h-9 rounded-xl text-xs font-bold transition ${
              p === cur
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500'
            }"
          >
            ${p}
          </button>
        `
          )
          .join('')}

        <button
          onclick="app.goToPage(${cur + 1})"
          ${cur >= total ? 'disabled' : ''}
          class="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 hover:border-brand-500 transition"
        >
          Sau ›
        </button>
        <button
          onclick="app.goToPage(${total})"
          ${cur >= total ? 'disabled' : ''}
          class="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 hover:border-brand-500 transition"
        >
          Cuối »
        </button>
      </div>

      <form onsubmit="app.handlePageJump(event)" class="flex items-center gap-2 text-xs">
        <span class="text-slate-500 dark:text-slate-400">Đi tới trang:</span>
        <input
          id="page-jump-input"
          type="number"
          min="1"
          max="${total}"
          value="${cur}"
          class="w-20 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-bold focus:outline-none focus:border-brand-500"
        />
        <button type="submit" class="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold">
          Đi
        </button>
      </form>
    `;
  }

  goToPage(page) {
    const target = Math.max(1, Math.min(this.totalPages, Number(page) || 1));
    if (target === this.currentPage) return;
    this.currentPage = target;
    this.loadCurrentList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handlePageJump(e) {
    e.preventDefault();
    const val = document.getElementById('page-jump-input')?.value;
    if (val) this.goToPage(Number(val));
  }

  /* ========================================================================
     SEARCH & INSTANT AUTOCOMPLETE DROPDOWN
     ======================================================================== */
  handleSearchInput(value) {
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !value.trim());
    }

    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    const trimmed = value.trim();
    const dropdown = document.getElementById('search-dropdown');

    if (trimmed.length < 2) {
      dropdown?.classList.add('hidden');
      return;
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.performLiveSearchPreview(trimmed);
    }, 320);
  }

  handleSearchFocus() {
    const input = document.getElementById('search-input');
    if (input && input.value.trim().length >= 2) {
      document.getElementById('search-dropdown')?.classList.remove('hidden');
    }
  }

  clearSearch() {
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    document.getElementById('search-clear-btn')?.classList.add('hidden');
    document.getElementById('search-dropdown')?.classList.add('hidden');
  }

  async performLiveSearchPreview(keyword) {
    const dropdown = document.getElementById('search-dropdown');
    if (!dropdown) return;

    dropdown.classList.remove('hidden');
    dropdown.innerHTML = `
      <div class="p-4 text-xs text-slate-400 flex items-center gap-2">
        <div class="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Đang tìm "${this.escapeHtml(keyword)}" trong kho truyện...</span>
      </div>
    `;

    try {
      const res = await this.apiFetch(`/tim-kiem?keyword=${encodeURIComponent(keyword)}`);
      const items = (res?.data?.items || []).slice(0, 7);

      if (items.length === 0) {
        dropdown.innerHTML = `
          <div class="p-4 text-xs text-slate-500 text-center">
            Không tìm thấy truyện khớp với "${this.escapeHtml(keyword)}"
          </div>
        `;
        return;
      }

      dropdown.innerHTML = `
        <div class="divide-y divide-slate-100 dark:divide-slate-800/80">
          ${items
            .map((item) => {
              const thumb = this.resolveThumbUrl(item.thumb_url, item.name);
              const latestChap = item.chaptersLatest?.[0]?.chapter_name || 'Mới';
              return `
              <button
                type="button"
                onclick="app.selectSearchResult('${this.escapeAttr(item.slug)}')"
                class="w-full p-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-left transition"
              >
                <img
                  src="${this.escapeAttr(thumb)}"
                  alt=""
                  onerror="app.handleThumbError(this, '${this.escapeAttr(item.name)}')"
                  class="w-10 h-14 rounded-lg object-cover shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    ${
                      item.origin_label
                        ? `<span class="text-[10px] font-bold text-slate-400">${this.escapeHtml(item.origin_label)}</span>`
                        : ''
                    }
                    <h4 class="text-xs font-bold text-slate-900 dark:text-white truncate">${this.escapeHtml(item.name)}</h4>
                  </div>
                  <p class="text-[11px] text-brand-500 font-semibold mt-0.5">Chương ${this.escapeHtml(latestChap)}</p>
                </div>
              </button>
            `;
            })
            .join('')}
          <button
            type="button"
            onclick="app.submitSearchQuery('${this.escapeAttr(keyword)}')"
            class="w-full p-3 text-center text-xs font-bold text-brand-500 hover:bg-brand-500/10 transition"
          >
            Xem tất cả kết quả cho "${this.escapeHtml(keyword)}" →
          </button>
        </div>
      `;
    } catch (_) {
      dropdown.classList.add('hidden');
    }
  }

  selectSearchResult(slug) {
    document.getElementById('search-dropdown')?.classList.add('hidden');
    this.openComicDetail(slug);
  }

  handleSearchSubmit(e) {
    e.preventDefault();
    const val = document.getElementById('search-input')?.value?.trim();
    if (!val) return;
    this.submitSearchQuery(val);
  }

  submitSearchQuery(keyword) {
    document.getElementById('search-dropdown')?.classList.add('hidden');
    this.filters.keyword = keyword;
    this.applyAdvancedFilters();
  }

  /* ========================================================================
     COMIC DETAIL VIEW & CHAPTER LIST WITH RANGE CHUNKS
     ======================================================================== */
  async openComicDetail(slug) {
    if (!slug) return;
    window.location.hash = `comic/${encodeURIComponent(slug)}`;
    this.showView('detail');

    const container = document.getElementById('detail-container');
    if (!container) return;

    container.innerHTML = `
      <div class="rounded-3xl bg-white dark:bg-[#101726] border border-slate-200 dark:border-slate-800 p-6 sm:p-10 space-y-6">
        <div class="flex flex-col md:flex-row gap-8">
          <div class="w-48 sm:w-60 aspect-[3/4] rounded-2xl skeleton mx-auto md:mx-0 shrink-0"></div>
          <div class="flex-1 space-y-4">
            <div class="h-8 w-3/4 rounded-xl skeleton"></div>
            <div class="h-4 w-1/2 rounded-lg skeleton"></div>
            <div class="h-24 w-full rounded-xl skeleton"></div>
            <div class="flex gap-3">
              <div class="h-11 w-36 rounded-xl skeleton"></div>
              <div class="h-11 w-36 rounded-xl skeleton"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    try {
      const res = await this.apiFetch(`/truyen-tranh/${encodeURIComponent(slug)}`);
      const item = res?.data?.item;
      if (!item) throw new Error('Không tìm thấy thông tin truyện');
      this.currentComic = item;
      this.activeServerIndex = 0;
      this.chapterFilterText = '';
      this.activeChapterChunk = -1;
      this.renderComicDetail();
    } catch (err) {
      const fallback = FALLBACK_COMICS[0];
      this.currentComic = {
        ...fallback,
        chapters: [
          {
            server_name: 'Server Vietsub (Demo)',
            server_data: Array.from({ length: 15 }, (_, i) => ({
              chapter_name: String(i + 1),
              chapter_title: `Hồi thứ ${i + 1}`,
              chapter_api_data: `demo://${fallback.slug}/${i + 1}`,
            })),
          },
        ],
      };
      this.renderComicDetail();
    }
  }

  getNormalizedServerChapters() {
    const servers = this.currentComic?.chapters || [];
    const server = servers[this.activeServerIndex] || servers[0];
    const rawList = server?.server_data || [];

    return [...rawList].sort((a, b) => {
      const numA = parseFloat(a.chapter_name) || 0;
      const numB = parseFloat(b.chapter_name) || 0;
      return numA - numB;
    });
  }

  renderComicDetail() {
    const container = document.getElementById('detail-container');
    const comic = this.currentComic;
    if (!container || !comic) return;

    const thumb = this.resolveThumbUrl(comic.thumb_url, comic.name);
    const originNames = Array.isArray(comic.origin_name) && comic.origin_name.filter(Boolean).length
      ? comic.origin_name.filter(Boolean).join(' • ')
      : 'Đang cập nhật tên gốc';
    const authors = Array.isArray(comic.author) && comic.author.filter(Boolean).length
      ? comic.author.filter(Boolean).join(', ')
      : 'Đang cập nhật';
    const categories = comic.category || [];
    const isSaved = this.isBookmarked(comic.slug);
    const historyEntry = this.getHistoryForComic(comic.slug);

    const chaptersAsc = this.getNormalizedServerChapters();
    this.readerChapters = chaptersAsc;
    const firstChap = chaptersAsc[0];
    const latestChap = chaptersAsc[chaptersAsc.length - 1];

    const statusLabel =
      comic.status === 'completed'
        ? '✅ Đã hoàn thành (Full)'
        : comic.status === 'hiatus'
        ? '⏸️ Tạm ngưng'
        : '🟢 Đang tiến hành';

    const cleanDescription = this.stripHtmlTags(comic.content || 'Đang cập nhật nội dung tóm tắt cho bộ truyện này.');
    const servers = comic.chapters || [];

    // Calculate chapter range chunks if > 50 chapters
    const CHUNK_SIZE = 50;
    const totalChunks = Math.ceil(chaptersAsc.length / CHUNK_SIZE);
    const chunkButtons = [];
    if (totalChunks > 1) {
      chunkButtons.push({ index: -1, label: `Tất cả (${chaptersAsc.length})` });
      for (let c = 0; c < totalChunks; c++) {
        const startItem = chaptersAsc[c * CHUNK_SIZE];
        const endItem = chaptersAsc[Math.min(chaptersAsc.length - 1, (c + 1) * CHUNK_SIZE - 1)];
        chunkButtons.push({
          index: c,
          label: `C.${startItem.chapter_name} - ${endItem.chapter_name}`,
        });
      }
    }

    container.innerHTML = `
      <!-- Breadcrumb & Back Button -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <button onclick="app.showView('browse')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:border-brand-500 transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Quay lại danh sách</span>
          </button>
          <span>/</span>
          <span class="text-slate-900 dark:text-slate-200 font-semibold truncate max-w-xs sm:max-w-md">${this.escapeHtml(comic.name)}</span>
        </div>

        <span class="text-xs text-slate-400">Cập nhật: ${this.formatTimeAgo(comic.updatedAt)}</span>
      </div>

      <!-- Hero Detail Card -->
      <div class="relative rounded-3xl overflow-hidden bg-white dark:bg-[#101726] border border-slate-200/90 dark:border-slate-800 shadow-xl">
        <div class="absolute inset-0 h-72 overflow-hidden pointer-events-none opacity-20 dark:opacity-25">
          <img src="${this.escapeAttr(thumb)}" alt="" onerror="app.handleThumbError(this, '${this.escapeAttr(comic.name)}')" class="hero-backdrop w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-[#101726]"></div>
        </div>

        <div class="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col md:flex-row gap-7 sm:gap-9">
          <div class="w-48 sm:w-56 md:w-64 shrink-0 mx-auto md:mx-0">
            <div class="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 dark:border-slate-700/80 bg-slate-900">
              <img
                src="${this.escapeAttr(thumb)}"
                alt="${this.escapeAttr(comic.name)}"
                onerror="app.handleThumbError(this, '${this.escapeAttr(comic.name)}')"
                class="w-full h-full object-cover"
              />
            </div>
          </div>

          <div class="flex-1 space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              ${
                comic.origin_label
                  ? `<span class="px-3 py-1 rounded-full bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold">${this.escapeHtml(comic.origin_label)}</span>`
                  : ''
              }
              <span class="px-3 py-1 rounded-full text-xs font-bold ${
                comic.status === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30'
              }">
                ${statusLabel}
              </span>
              <span class="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                📚 ${chaptersAsc.length} chương
              </span>
              ${
                comic.year
                  ? `<span class="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold">📅 ${comic.year}</span>`
                  : ''
              }
            </div>

            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
              ${this.escapeHtml(comic.name)}
            </h1>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
              <div><span class="text-slate-400">Tên khác:</span> <strong class="text-slate-800 dark:text-slate-200">${this.escapeHtml(originNames)}</strong></div>
              <div><span class="text-slate-400">Tác giả:</span> <strong class="text-slate-800 dark:text-slate-200">${this.escapeHtml(authors)}</strong></div>
            </div>

            <!-- Genre Tags -->
            <div class="flex flex-wrap items-center gap-1.5">
              ${categories
                .map(
                  (c) => `
                <button
                  onclick="app.selectQuickGenre('${this.escapeAttr(c.slug)}', '${this.escapeAttr(c.name)}')"
                  class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-brand-500 text-slate-700 dark:text-slate-300 hover:text-white text-xs font-semibold transition"
                >
                  ${this.escapeHtml(c.name)}
                </button>
              `
                )
                .join('')}
            </div>

            <!-- Story Synopsis -->
            <div class="space-y-1.5 pt-1">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Nội dung cốt truyện</h3>
              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                ${this.escapeHtml(cleanDescription)}
              </p>
            </div>

            <!-- Primary Action Buttons -->
            <div class="flex flex-wrap items-center gap-3 pt-3">
              ${
                firstChap
                  ? `<button
                      onclick="app.openChapterByIndex(0)"
                      class="px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-rose-600 hover:from-brand-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center gap-2 transition"
                    >
                      <span>📖 Đọc Từ Đầu (Chương ${this.escapeHtml(firstChap.chapter_name)})</span>
                    </button>`
                  : ''
              }

              ${
                latestChap && latestChap !== firstChap
                  ? `<button
                      onclick="app.openChapterByIndex(${chaptersAsc.length - 1})"
                      class="px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 font-bold text-sm flex items-center gap-2 transition"
                    >
                      <span>⚡ Đọc Mới Nhất (Chương ${this.escapeHtml(latestChap.chapter_name)})</span>
                    </button>`
                  : ''
              }

              ${
                historyEntry
                  ? `<button
                      onclick="app.resumeFromHistory('${this.escapeAttr(comic.slug)}', '${this.escapeAttr(historyEntry.lastChapterName)}', '${this.escapeAttr(historyEntry.lastChapterApi || '')}')"
                      class="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
                    >
                      <span>▶ Đọc Tiếp Chương ${this.escapeHtml(historyEntry.lastChapterName)}</span>
                    </button>`
                  : ''
              }

              <button
                id="detail-bookmark-btn"
                onclick="app.toggleBookmarkCurrentComic()"
                class="px-4 py-3 rounded-2xl border ${
                  isSaved
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                } font-bold text-sm flex items-center gap-2 transition"
              >
                <span>${isSaved ? '❤️ Đã Lưu Tủ Truyện' : '🤍 Lưu Tủ Truyện'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- CHAPTER LIST SECTION -->
      <div class="rounded-3xl bg-white dark:bg-[#101726] border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 space-y-5 shadow-lg">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-2.5">
            <span class="w-1.5 h-6 rounded-full bg-brand-500"></span>
            <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Danh Sách Chương (${chaptersAsc.length})
            </h2>
          </div>

          <!-- Server Switcher, Filter & Sort Controls -->
          <div class="flex flex-wrap items-center gap-2">
            ${servers
              .map(
                (srv, idx) => `
              <button
                onclick="app.switchChapterServer(${idx})"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  idx === this.activeServerIndex
                    ? 'bg-brand-500 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-500'
                }"
              >
                ${this.escapeHtml(srv.server_name || `Server ${idx + 1}`)}
              </button>
            `
              )
              .join('')}

            <button
              id="btn-scan-cross-servers"
              onclick="app.scanCrossSourceServers()"
              title="Tự động tìm và gộp thêm danh sách chương của truyện này từ các kho khác (NetTruyen, Cứu Truyện, TruyenQQ...)"
              class="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-bold transition flex items-center gap-1"
            >
              <span>🔗 +Gộp Server Kho Khác</span>
            </button>

            <div class="relative">
              <input
                type="text"
                placeholder="Tìm số chương... (VD: 15)"
                value="${this.escapeAttr(this.chapterFilterText)}"
                oninput="app.filterChapters(this.value)"
                class="pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500"
              />
              <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <button
              onclick="app.toggleChapterSort()"
              class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:border-brand-500 transition"
            >
              ${this.chapterSortDesc ? '↓ Mới nhất trước' : '↑ Từ chương 1'}
            </button>
          </div>
        </div>

        <!-- Chapter Range Chunk Tabs (if comic has > 50 chapters) -->
        ${
          chunkButtons.length > 0
            ? `<div class="flex flex-wrap items-center gap-1.5">
                <span class="text-xs font-bold text-slate-400 mr-1">Chọn nhanh đoạn chương:</span>
                ${chunkButtons
                  .map(
                    (cb) => `
                  <button
                    onclick="app.setChapterChunk(${cb.index})"
                    class="px-3 py-1 rounded-lg text-xs font-bold transition ${
                      this.activeChapterChunk === cb.index
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-500'
                    }"
                  >
                    ${this.escapeHtml(cb.label)}
                  </button>
                `
                  )
                  .join('')}
              </div>`
            : ''
        }

        <!-- Chapter Buttons Grid -->
        <div id="chapter-list-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-[500px] overflow-y-auto pr-1"></div>
      </div>

      <!-- COMMUNITY COMMENTS SECTION -->
      <div class="rounded-3xl bg-white dark:bg-[#101726] border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 space-y-5 shadow-lg">
        <div class="flex items-center gap-2.5">
          <span class="w-1.5 h-6 rounded-full bg-amber-500"></span>
          <h2 class="text-lg font-extrabold text-slate-900 dark:text-white">Bình Luận & Đánh Giá Độc Giả</h2>
        </div>

        <form onsubmit="app.handleAddComment(event)" class="flex flex-col sm:flex-row gap-3">
          <input
            id="comment-author-input"
            type="text"
            placeholder="Tên của bạn (Tùy chọn)"
            class="sm:w-44 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500"
          />
          <input
            id="comment-text-input"
            type="text"
            required
            placeholder="Chia sẻ cảm nhận của bạn về bộ truyện này..."
            class="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-500"
          />
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shrink-0">
            Gửi Bình Luận
          </button>
        </form>

        <div id="comic-comments-list" class="space-y-3"></div>
      </div>
    `;

    this.renderChapterGridItems();
    this.renderComicComments();
  }

  setChapterChunk(chunkIdx) {
    this.activeChapterChunk = chunkIdx;
    this.renderComicDetail();
  }

  renderChapterGridItems() {
    const grid = document.getElementById('chapter-list-grid');
    if (!grid || !this.currentComic) return;

    const historyEntry = this.getHistoryForComic(this.currentComic.slug);
    const readSet = new Set(historyEntry?.readChapters || []);
    const lastRead = historyEntry?.lastChapterName;

    let indexed = this.readerChapters.map((ch, idx) => ({ ...ch, originalIndex: idx }));

    // Apply chunk range filter if selected
    if (this.activeChapterChunk >= 0) {
      const start = this.activeChapterChunk * 50;
      const end = start + 50;
      indexed = indexed.slice(start, end);
    }

    if (this.chapterSortDesc) {
      indexed.reverse();
    }

    const q = this.chapterFilterText.trim().toLowerCase();
    const filtered = q
      ? indexed.filter(
          (ch) =>
            String(ch.chapter_name).toLowerCase().includes(q) ||
            String(ch.chapter_title || '').toLowerCase().includes(q)
        )
      : indexed;

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-slate-400">Không có chương nào khớp với "${this.escapeHtml(q)}"</div>`;
      return;
    }

    grid.innerHTML = filtered
      .map((ch) => {
        const isCurrent = lastRead && String(lastRead) === String(ch.chapter_name);
        const isRead = readSet.has(String(ch.chapter_name));
        const subtitle = ch.chapter_title ? ` • ${ch.chapter_title}` : '';
        const pagesInfo = ch.pages ? `${ch.pages} tr` : '';

        return `
        <button
          onclick="app.openChapterByIndex(${ch.originalIndex})"
          class="chapter-btn px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-left flex items-center justify-between gap-2 ${
            isCurrent ? 'is-current' : isRead ? 'is-read' : ''
          }"
        >
          <div class="min-w-0">
            <div class="text-xs font-bold truncate">
              Chương ${this.escapeHtml(ch.chapter_name)}
            </div>
            ${
              subtitle
                ? `<div class="text-[10px] text-slate-400 truncate">${this.escapeHtml(ch.chapter_title)}</div>`
                : ''
            }
          </div>
          ${
            isCurrent
              ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-brand-500 text-white font-bold shrink-0">Đang đọc</span>`
              : isRead
              ? `<span class="text-[10px] text-slate-400 shrink-0">Đã đọc</span>`
              : pagesInfo
              ? `<span class="text-[10px] text-slate-400 shrink-0">${pagesInfo}</span>`
              : ''
          }
        </button>
      `;
      })
      .join('');
  }

  switchChapterServer(index) {
    this.activeServerIndex = index;
    this.activeChapterChunk = -1;
    this.readerChapters = this.getNormalizedServerChapters();
    this.renderComicDetail();
  }

  async scanCrossSourceServers() {
    if (!this.currentComic) return;
    const btn = document.getElementById('btn-scan-cross-servers');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Đang quét 4 kho...</span>';
    }
    this.showToast(`🔍 Đang tìm thêm Server chương của "${this.currentComic.name}" trên các kho khác...`);

    try {
      const res = await this.apiFetch(
        `/cross-servers?title=${encodeURIComponent(this.currentComic.name)}&currentId=${encodeURIComponent(this.currentComic.slug)}`,
        false
      );
      const extraServers = res?.data?.servers || [];
      if (extraServers.length === 0) {
        this.showToast('Không tìm thấy thêm Server trùng tên ở kho khác');
        if (btn) btn.innerHTML = '<span>✓ Đã quét đủ kho</span>';
        return;
      }

      const existingNames = new Set((this.currentComic.chapters || []).map((s) => s.server_name));
      let added = 0;
      for (const srv of extraServers) {
        if (!existingNames.has(srv.server_name)) {
          this.currentComic.chapters.push(srv);
          existingNames.add(srv.server_name);
          added++;
        }
      }

      this.renderComicDetail();
      this.showToast(`✅ Đã gộp thêm ${added} Server chương dự phòng từ kho khác!`);
    } catch (_) {
      this.showToast('Không thể quét thêm Server lúc này');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>🔗 +Gộp Server Kho Khác</span>';
      }
    }
  }

  filterChapters(text) {
    this.chapterFilterText = text;
    this.renderChapterGridItems();
  }

  toggleChapterSort() {
    this.chapterSortDesc = !this.chapterSortDesc;
    this.renderComicDetail();
  }

  /* ========================================================================
     COMIC READER ENGINE (LIVE CHAPTER IMAGES & QUALITY CONTROLS)
     ======================================================================== */
  async quickReadLatest(slug, chapterName, chapterApi, comicName, thumbUrl) {
    if (chapterApi) {
      this.currentComic = {
        name: comicName,
        slug: slug,
        thumb_url: thumbUrl,
      };
      this.readerChapters = [
        {
          chapter_name: chapterName,
          chapter_api_data: chapterApi,
        },
      ];
      await this.openChapterByIndex(0);
      this.apiFetch(`/truyen-tranh/${encodeURIComponent(slug)}`)
        .then((res) => {
          if (res?.data?.item) {
            this.currentComic = res.data.item;
            this.readerChapters = this.getNormalizedServerChapters();
            const foundIdx = this.readerChapters.findIndex(
              (c) => String(c.chapter_name) === String(chapterName)
            );
            if (foundIdx !== -1) {
              this.currentChapterIndex = foundIdx;
              this.populateReaderChapterDropdown();
            }
          }
        })
        .catch(() => {});
    } else {
      await this.openComicDetail(slug);
    }
  }

  async resumeFromHistory(slug, chapterName, chapterApi) {
    await this.openComicDetail(slug);
    const idx = this.readerChapters.findIndex(
      (c) => String(c.chapter_name) === String(chapterName)
    );
    if (idx !== -1) {
      await this.openChapterByIndex(idx);
    } else if (chapterApi) {
      this.readerChapters.push({
        chapter_name: chapterName,
        chapter_api_data: chapterApi,
      });
      await this.openChapterByIndex(this.readerChapters.length - 1);
    }
  }

  async openChapterByIndex(index) {
    if (index < 0 || index >= this.readerChapters.length) return;
    this.currentChapterIndex = index;
    const chapterObj = this.readerChapters[index];
    const chapterApiUrl = chapterObj.chapter_api_data || chapterObj.chapter_api;

    this.showView('reader');
    this.singlePageIndex = 0;

    const comicName = this.currentComic?.name || 'Truyện Tranh';
    document.getElementById('reader-comic-title').textContent = comicName;
    document.getElementById('reader-chapter-subtitle').textContent = `Chương ${chapterObj.chapter_name}${
      chapterObj.chapter_title ? ` — ${chapterObj.chapter_title}` : ''
    }`;
    document.getElementById('reader-footer-chapter-name').textContent = `Chương ${chapterObj.chapter_name}`;

    this.populateReaderChapterDropdown();

    if (this.currentComic) {
      this.recordReadingHistory(this.currentComic, chapterObj);
    }

    const canvas = document.getElementById('reader-canvas');
    if (canvas) {
      canvas.innerHTML = `
        <div class="py-24 text-center space-y-4">
          <div class="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-sm font-bold text-slate-200">Đang tải hình ảnh Chương ${this.escapeHtml(chapterObj.chapter_name)}...</p>
          <p class="text-xs text-slate-400">Kết nối trực tiếp máy chủ ảnh MangaDex</p>
        </div>
      `;
    }

    try {
      if (!chapterApiUrl || chapterApiUrl.startsWith('demo://')) {
        this.currentChapterPages = this.generateDemoChapterPages(comicName, chapterObj.chapter_name);
      } else {
        const res = await this.apiFetch(chapterApiUrl);
        const domainCdn = res?.data?.domain_cdn || '';
        const item = res?.data?.item || {};
        const chapterPath = item.chapter_path || '';
        const images = item.chapter_image || [];

        if (images.length === 0) {
          throw new Error('Chương này chưa có dữ liệu trang ảnh');
        }

        this.currentChapterPages = images.map((img) => ({
          page: img.image_page,
          saverUrl: this.resolveChapterImageUrl(domainCdn, chapterPath, img.image_file),
          hdUrl: this.resolveChapterImageUrl(domainCdn, chapterPath, img.hd_file || img.image_file),
          drmData: img.drm_data || '',
        }));
      }

      this.renderReaderPages();
    } catch (err) {
      this.currentChapterPages = this.generateDemoChapterPages(comicName, chapterObj.chapter_name);
      this.renderReaderPages();
      this.showToast('Máy chủ chương đang bận — hiển thị bản xem thử dự phòng');
    }
  }

  populateReaderChapterDropdown() {
    const select = document.getElementById('reader-chapter-select');
    if (!select) return;

    select.innerHTML = this.readerChapters
      .map(
        (ch, idx) => `
        <option value="${idx}" ${idx === this.currentChapterIndex ? 'selected' : ''}>
          Chương ${this.escapeHtml(ch.chapter_name)}
        </option>
      `
      )
      .join('');

    const hasPrev = this.currentChapterIndex > 0;
    const hasNext = this.currentChapterIndex < this.readerChapters.length - 1;

    ['reader-prev-btn', 'reader-bottom-prev-btn'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = !hasPrev;
    });
    ['reader-next-btn', 'reader-bottom-next-btn'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = !hasNext;
    });
  }

  handleReaderChapterSelect(indexStr) {
    const idx = Number(indexStr);
    if (!Number.isNaN(idx)) {
      this.openChapterByIndex(idx);
    }
  }

  navigateAdjacentChapter(delta) {
    const nextIdx = this.currentChapterIndex + delta;
    if (nextIdx >= 0 && nextIdx < this.readerChapters.length) {
      this.openChapterByIndex(nextIdx);
    } else if (delta > 0) {
      this.showToast('Bạn đã ở chương mới nhất của bộ truyện này!');
    } else {
      this.showToast('Bạn đang ở chương đầu tiên!');
    }
  }

  closeReaderToDetail() {
    this.stopAutoScroll();
    if (this.currentComic && this.currentComic.slug) {
      this.showView('detail');
      this.renderComicDetail();
    } else {
      this.showView('browse');
    }
  }

  toggleReaderImageQuality() {
    this.readerPrefs.hdQuality = !this.readerPrefs.hdQuality;
    this.saveReaderPrefs();
    this.applyReaderPrefsToUI();
    this.renderReaderPages();
    this.showToast(
      this.readerPrefs.hdQuality
        ? '✨ Đã chuyển sang chế độ Ảnh HD Gốc (Sắc nét)'
        : '⚡ Đã chuyển sang chế độ Tải Nhanh (Tiết kiệm Data)'
    );
  }

  renderReaderPages() {
    const canvas = document.getElementById('reader-canvas');
    if (!canvas) return;

    const total = this.currentChapterPages.length;
    const counter = document.getElementById('reader-page-counter');
    if (counter) {
      counter.textContent = `${total} trang`;
    }

    const useHd = !!this.readerPrefs.hdQuality;

    if (this.readerPrefs.mode === 'single') {
      const pageObj = this.currentChapterPages[this.singlePageIndex] || this.currentChapterPages[0];
      const activeUrl = useHd ? pageObj.hdUrl || pageObj.saverUrl : pageObj.saverUrl;
      const fallbackUrl = useHd ? pageObj.saverUrl : pageObj.hdUrl || pageObj.saverUrl;

      if (counter) {
        counter.textContent = `Trang ${this.singlePageIndex + 1} / ${total}`;
      }

      canvas.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-2xl text-xs">
            <button
              onclick="app.changeSinglePage(-1)"
              ${this.singlePageIndex === 0 ? 'disabled' : ''}
              class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-brand-500 disabled:opacity-35 font-bold transition"
            >
              ← Trang trước
            </button>
            <span class="font-bold text-slate-200">
              Trang <strong class="text-brand-400">${this.singlePageIndex + 1}</strong> / ${total}
            </span>
            <button
              onclick="app.changeSinglePage(1)"
              ${this.singlePageIndex >= total - 1 ? 'disabled' : ''}
              class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-brand-500 disabled:opacity-35 font-bold transition"
            >
              Trang sau →
            </button>
          </div>

          <div class="relative rounded-2xl overflow-hidden bg-slate-900 min-h-[480px] flex items-center justify-center" data-page-index="${this.singlePageIndex + 1}">
            ${
              pageObj.drmData
                ? `<canvas
                    data-drm-url="${this.escapeAttr(activeUrl)}"
                    data-drm-code="${this.escapeAttr(pageObj.drmData)}"
                    class="reader-page-img max-h-[88vh] w-auto object-contain"
                  ></canvas>`
                : `<img
                    src="${this.escapeAttr(activeUrl)}"
                    alt="Trang ${this.singlePageIndex + 1}"
                    class="reader-page-img max-h-[88vh] w-auto object-contain"
                    onerror="app.handlePageImageError(this, '${this.escapeAttr(fallbackUrl || '')}')"
                  />`
            }
            <div class="translation-overlay-layer absolute inset-0 pointer-events-none overflow-hidden"></div>
            <button
              type="button"
              onclick="event.stopPropagation(); app.translateReaderPage(${this.singlePageIndex})"
              data-translate-btn="${this.singlePageIndex}"
              class="absolute top-3 right-3 z-20 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-indigo-600 border border-indigo-400/40 text-indigo-200 hover:text-white text-[11px] font-bold shadow-lg backdrop-blur transition flex items-center gap-1"
            >
              <span>🌐 Dịch trang ${this.singlePageIndex + 1}</span>
            </button>
            <div onclick="app.changeSinglePage(-1)" title="Trang trước" class="absolute inset-y-0 left-0 w-1/3 cursor-pointer"></div>
            <div onclick="app.changeSinglePage(1)" title="Trang tiếp theo" class="absolute inset-y-0 right-0 w-2/3 cursor-pointer"></div>
          </div>
          <div id="translation-sub-${this.singlePageIndex}" class="hidden rounded-2xl bg-slate-900/95 border border-indigo-500/30 p-3 text-xs text-slate-200 space-y-1.5"></div>
        </div>
      `;
      this.initDrmCanvases();
      if (this.pageTranslations.has(activeUrl)) {
        this.renderPageTranslationResult(this.singlePageIndex, this.pageTranslations.get(activeUrl));
      }
      return;
    }

    canvas.innerHTML = this.currentChapterPages
      .map((p, idx) => {
        const activeUrl = useHd ? p.hdUrl || p.saverUrl : p.saverUrl;
        const fallbackUrl = useHd ? p.saverUrl : p.hdUrl || p.saverUrl;
        return `
      <div class="reader-page-wrapper relative bg-[#0b101d] min-h-[220px] flex flex-col items-center justify-center" data-page-index="${idx + 1}">
        <div class="relative w-full flex justify-center">
          ${
            p.drmData
              ? `<canvas
                  data-drm-url="${this.escapeAttr(activeUrl)}"
                  data-drm-code="${this.escapeAttr(p.drmData)}"
                  class="reader-page-img w-full"
                ></canvas>`
              : `<img
                  src="${this.escapeAttr(activeUrl)}"
                  alt="Trang ${idx + 1}"
                  loading="${idx < 3 ? 'eager' : 'lazy'}"
                  onload="this.closest('.reader-page-wrapper')?.classList.remove('min-h-[220px]')"
                  onerror="app.handlePageImageError(this, '${this.escapeAttr(fallbackUrl || '')}', ${idx + 1})"
                  class="reader-page-img w-full"
                />`
          }
          <div class="translation-overlay-layer absolute inset-0 pointer-events-none overflow-hidden"></div>
          <button
            type="button"
            onclick="app.translateReaderPage(${idx})"
            data-translate-btn="${idx}"
            class="absolute top-2.5 right-2.5 z-20 px-2.5 py-1 rounded-xl bg-slate-950/75 hover:bg-indigo-600 border border-indigo-400/40 text-indigo-200 hover:text-white text-[11px] font-bold shadow-md backdrop-blur transition"
          >
            🌐 Dịch trang ${idx + 1}
          </button>
          <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/60 text-[10px] text-slate-400 pointer-events-none">
            ${idx + 1}/${total}
          </span>
        </div>
        <div id="translation-sub-${idx}" class="hidden w-full bg-[#0f172a] border-t border-indigo-500/30 p-3 text-xs text-slate-200 space-y-1.5"></div>
      </div>
    `;
      })
      .join('');

    this.initDrmCanvases();
    this.currentChapterPages.forEach((p, idx) => {
      const activeUrl = useHd ? p.hdUrl || p.saverUrl : p.saverUrl;
      if (this.pageTranslations.has(activeUrl)) {
        this.renderPageTranslationResult(idx, this.pageTranslations.get(activeUrl));
      }
    });
  }

  /* ========================================================================
     ONLINE COMIC TRANSLATOR (FREE TESSERACT OCR + GOOGLE TRANSLATE & GEMINI VISION)
     ======================================================================== */
  toggleTranslateDrawer() {
    const drawer = document.getElementById('reader-translate-drawer');
    if (drawer) {
      drawer.classList.toggle('hidden');
      this.syncTranslatePrefsUI();
    }
  }

  syncTranslatePrefsUI() {
    const modeEl = document.getElementById('translate-mode-select');
    const langEl = document.getElementById('translate-lang-select');
    const keyEl = document.getElementById('translate-gemini-key-input');
    const toggleBtn = document.getElementById('translate-overlay-toggle-btn');

    if (modeEl) modeEl.value = this.translatePrefs.mode || 'free';
    if (langEl) langEl.value = this.translatePrefs.sourceLang || 'eng';
    if (keyEl) keyEl.value = this.translatePrefs.geminiKey || '';
    if (toggleBtn) {
      toggleBtn.textContent = this.translatePrefs.showOverlay ? '👁️ Hiện chữ dịch: BẬT' : '👁️ Hiện chữ dịch: TẮT';
    }
  }

  updateTranslatePrefs(key, value) {
    this.translatePrefs[key] = value;
    localStorage.setItem('mangaverse_translate_prefs_v1', JSON.stringify(this.translatePrefs));
    if (key === 'mode' && value === 'gemini' && !this.translatePrefs.geminiKey.trim()) {
      this.showToast('✨ Hãy dán Gemini API Key (miễn phí trên Google AI Studio) để dùng Gemini Vision!');
    }
  }

  toggleTranslationOverlays() {
    this.translatePrefs.showOverlay = !this.translatePrefs.showOverlay;
    localStorage.setItem('mangaverse_translate_prefs_v1', JSON.stringify(this.translatePrefs));
    this.syncTranslatePrefsUI();
    document.querySelectorAll('.translation-overlay-layer').forEach((el) => {
      el.classList.toggle('hidden', !this.translatePrefs.showOverlay);
    });
  }

  setTranslateStatus(msg, isError = false) {
    const bar = document.getElementById('translate-status-bar');
    if (!bar) return;
    if (!msg) {
      bar.classList.add('hidden');
      return;
    }
    bar.classList.remove('hidden');
    bar.className = `px-3 py-2 rounded-xl border font-medium ${
      isError
        ? 'bg-rose-500/15 border-rose-500/35 text-rose-200'
        : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-200'
    }`;
    bar.textContent = msg;
  }

  ensureTesseractLoaded() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (this.tesseractLoadingPromise) return this.tesseractLoadingPromise;
    this.tesseractLoadingPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = () => resolve(window.Tesseract);
      s.onerror = () => reject(new Error('Không tải được thư viện OCR Tesseract.js'));
      document.head.appendChild(s);
    });
    return this.tesseractLoadingPromise;
  }

  async translateReaderPage(pageIdx) {
    const pageObj = this.currentChapterPages[pageIdx];
    if (!pageObj) return;

    const useHd = !!this.readerPrefs.hdQuality;
    const activeUrl = useHd ? pageObj.hdUrl || pageObj.saverUrl : pageObj.saverUrl;
    const btn = document.querySelector(`[data-translate-btn="${pageIdx}"]`);

    if (this.pageTranslations.has(activeUrl)) {
      this.renderPageTranslationResult(pageIdx, this.pageTranslations.get(activeUrl));
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Đang dịch...';
    }

    try {
      let bubbles = [];
      const useGemini = this.translatePrefs.mode === 'gemini' && (this.translatePrefs.geminiKey || '').trim().length > 10;

      if (useGemini) {
        this.setTranslateStatus(`✨ Gemini Vision AI đang đọc & dịch trang ${pageIdx + 1}...`);
        const res = await fetch(`${API_BASE}/translate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: activeUrl,
            apiKey: this.translatePrefs.geminiKey.trim(),
            sourceLang: this.translatePrefs.sourceLang || 'auto',
            comicTitle: this.currentComic?.name || '',
          }),
        });
        const j = await res.json();
        if (!res.ok || j.status !== 'success') {
          throw new Error(j.message || `HTTP ${res.status}`);
        }
        bubbles = j.data?.bubbles || [];
      } else {
        this.setTranslateStatus(`🆓 Đang quét chữ OCR (Tesseract Sparse-Text) trên trang ${pageIdx + 1}...`);
        const Tesseract = await this.ensureTesseractLoaded();
        const imgResp = await fetch(activeUrl);
        if (!imgResp.ok) throw new Error(`Không tải được ảnh trang ${pageIdx + 1}`);
        const blob = await imgResp.blob();

        // Preprocess image onto high-contrast canvas (grayscale + contrast boost) for sharp comic bubble OCR
        const { ocrBlob, w, h } = await new Promise((resolve) => {
          const im = new Image();
          const objUrl = URL.createObjectURL(blob);
          im.onload = () => {
            URL.revokeObjectURL(objUrl);
            const nw = im.naturalWidth || 800;
            const nh = im.naturalHeight || 1200;
            try {
              const cvs = document.createElement('canvas');
              cvs.width = nw;
              cvs.height = nh;
              const ctx = cvs.getContext('2d');
              ctx.filter = 'grayscale(100%) contrast(140%)';
              ctx.drawImage(im, 0, 0, nw, nh);
              cvs.toBlob((b) => resolve({ ocrBlob: b || blob, w: nw, h: nh }), 'image/png');
            } catch (_) {
              resolve({ ocrBlob: blob, w: nw, h: nh });
            }
          };
          im.onerror = () => {
            URL.revokeObjectURL(objUrl);
            resolve({ ocrBlob: blob, w: 800, h: 1200 });
          };
          im.src = objUrl;
        });

        const ocrLang = this.translatePrefs.sourceLang || 'eng';
        if (!this.ocrWorker || this.ocrWorkerLang !== ocrLang) {
          if (this.ocrWorker) {
            try { await this.ocrWorker.terminate(); } catch (_) {}
          }
          this.ocrWorker = await Tesseract.createWorker(ocrLang);
          // PSM 11 = Sparse text (tìm các cụm chữ rải rác trong bong bóng thoại truyện tranh)
          await this.ocrWorker.setParameters({ tessedit_pageseg_mode: '11' });
          this.ocrWorkerLang = ocrLang;
        }

        const ocrRes = await this.ocrWorker.recognize(ocrBlob);
        const rawLines = Array.isArray(ocrRes?.data?.lines) ? ocrRes.data.lines : [];

        // Filter out noisy/oversized boxes (never cover the whole page!)
        const cleanLines = rawLines
          .map((ln) => {
            const txt = String(ln.text || '')
              .replace(/[|\\/_~`^*=<>]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            const bb = ln.bbox || { x0: 0, y0: 0, x1: 100, y1: 40 };
            const bw = (bb.x1 - bb.x0) / w;
            const bh = (bb.y1 - bb.y0) / h;
            return {
              text: txt,
              conf: ln.confidence || 0,
              x0: bb.x0,
              y0: bb.y0,
              x1: bb.x1,
              y1: bb.y1,
              bw,
              bh,
            };
          })
          .filter((ln) => {
            if (ln.conf < 48) return false;
            if (ln.bw > 0.52 || ln.bh > 0.16) return false; // Skip oversized non-bubble noise
            if (ocrLang === 'eng') {
              return /[a-zA-Z]{2,}/.test(ln.text);
            }
            return ln.text.length >= 2 && /[\u3040-\u30ff\u4e00-\u9faf\uac00-\ud7afa-zA-Z]/.test(ln.text);
          });

        // Group nearby OCR lines belonging to the same speech bubble
        cleanLines.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
        const grouped = [];
        for (const ln of cleanLines) {
          const match = grouped.find((g) => {
            const vGap = ln.y0 - g.y1;
            const hOverlap = Math.min(ln.x1, g.x1) - Math.max(ln.x0, g.x0);
            const minW = Math.min(ln.x1 - ln.x0, g.x1 - g.x0);
            return vGap >= -12 && vGap <= h * 0.035 && hOverlap > -w * 0.05 && minW > 0;
          });
          if (match && (match.y1 - match.y0) / h < 0.22) {
            match.texts.push(ln.text);
            match.x0 = Math.min(match.x0, ln.x0);
            match.y0 = Math.min(match.y0, ln.y0);
            match.x1 = Math.max(match.x1, ln.x1);
            match.y1 = Math.max(match.y1, ln.y1);
          } else {
            grouped.push({
              texts: [ln.text],
              x0: ln.x0,
              y0: ln.y0,
              x1: ln.x1,
              y1: ln.y1,
            });
          }
        }

        const validBlocks = grouped
          .map((g) => ({
            orig: g.texts.join(' ').replace(/\s+/g, ' ').trim(),
            bbox: g,
          }))
          .filter((b) => b.orig.length >= 2)
          .slice(0, 30);

        if (validBlocks.length > 0) {
          this.setTranslateStatus(`🌐 Đang dịch ${validBlocks.length} khung thoại sang Tiếng Việt...`);
          const gSlMap = { eng: 'en', jpn: 'ja', chi_sim: 'zh-CN', kor: 'ko' };
          const trRes = await fetch(`${API_BASE}/translate-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              texts: validBlocks.map((b) => b.orig),
              sourceLang: gSlMap[ocrLang] || 'auto',
            }),
          });
          const trJson = await trRes.json();
          const translatedList = trJson?.data?.translations || [];

          bubbles = validBlocks.map((b, i) => ({
            box: [
              Math.round((b.bbox.y0 / h) * 1000),
              Math.round((b.bbox.x0 / w) * 1000),
              Math.round((b.bbox.y1 / h) * 1000),
              Math.round((b.bbox.x1 / w) * 1000),
            ],
            orig: b.orig,
            vi: translatedList[i] || b.orig,
          }));
        }
      }

      this.pageTranslations.set(activeUrl, bubbles);
      this.renderPageTranslationResult(pageIdx, bubbles);
      this.setTranslateStatus(`✅ Đã dịch xong trang ${pageIdx + 1} (${bubbles.length} khung thoại)!`);
      if (btn) {
        btn.disabled = false;
        btn.textContent = `✅ Đã dịch (${bubbles.length})`;
      }
    } catch (err) {
      this.setTranslateStatus(`❌ Lỗi dịch trang ${pageIdx + 1}: ${err.message}`, true);
      if (btn) {
        btn.disabled = false;
        btn.textContent = `🌐 Thử lại (${pageIdx + 1})`;
      }
    }
  }

  renderPageTranslationResult(pageIdx, bubbles) {
    const wrapper = document.querySelector(`[data-page-index="${pageIdx + 1}"]`);
    const overlay = wrapper?.querySelector('.translation-overlay-layer');
    const subBox = document.getElementById(`translation-sub-${pageIdx}`);

    if (overlay) {
      overlay.classList.toggle('hidden', !this.translatePrefs.showOverlay);
      overlay.innerHTML = (bubbles || [])
        .map((b, idx) => {
          const [ymin, xmin, ymax, xmax] = Array.isArray(b.box) ? b.box : [50, 50, 120, 260];
          const rawW = (xmax - xmin) / 10;
          const rawH = (ymax - ymin) / 10;
          // Guard: skip abnormally huge boxes that would cover the artwork
          if (rawW > 60 || rawH > 28) return '';
          const top = Math.max(1, Math.min(90, ymin / 10));
          const left = Math.max(1, Math.min(82, xmin / 10));
          const width = Math.max(14, Math.min(36, 96 - left, rawW + 4));
          return `
            <div
              onclick="event.stopPropagation(); this.classList.toggle('opacity-20');"
              title="${this.escapeAttr(`Gốc: ${b.orig || ''} (Bấm để làm mờ xem tranh)`)}"
              style="top:${top}%;left:${left}%;width:${width}%;max-height:18%;"
              class="pointer-events-auto cursor-pointer absolute bg-white/92 text-slate-950 rounded-lg px-1.5 py-1 shadow-lg border border-indigo-500/60 overflow-hidden text-center leading-snug font-bold text-[10px] sm:text-[11px] break-words transition-opacity"
            >
              <span class="text-[9px] text-indigo-600 font-extrabold mr-0.5">${idx + 1}.</span>${this.escapeHtml(b.vi || '')}
            </div>
          `;
        })
        .join('');
    }

    if (subBox) {
      if (!bubbles || bubbles.length === 0) {
        subBox.classList.remove('hidden');
        subBox.innerHTML = `<span class="text-slate-400">Không phát hiện đoạn thoại chữ rõ ràng trên trang ${pageIdx + 1}.</span>`;
      } else {
        subBox.classList.remove('hidden');
        subBox.innerHTML = `
          <div class="flex items-center justify-between text-[11px] font-bold text-indigo-300 pb-1 border-b border-slate-800">
            <span>💬 Phụ đề trang ${pageIdx + 1} (${bubbles.length} khung thoại)</span>
            <button onclick="document.getElementById('translation-sub-${pageIdx}').classList.add('hidden')" class="text-slate-400 hover:text-white">Ẩn</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            ${bubbles
              .map(
                (b, i) => `
              <div class="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                <div class="text-emerald-300 font-bold">${i + 1}. ${this.escapeHtml(b.vi || '')}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">${this.escapeHtml(b.orig || '')}</div>
              </div>
            `
              )
              .join('')}
          </div>
        `;
      }
    }
  }

  async translateAllChapterPages() {
    if (this.isTranslatingChapter) {
      this.isTranslatingChapter = false;
      this.setTranslateStatus('⏸️ Đã dừng dịch hàng loạt.');
      return;
    }
    const total = this.currentChapterPages.length;
    if (!total) return;

    this.isTranslatingChapter = true;
    const allBtn = document.getElementById('translate-all-chapter-btn');
    if (allBtn) allBtn.textContent = '⏹️ Dừng Dịch Chương';

    for (let i = 0; i < total; i++) {
      if (!this.isTranslatingChapter || this.currentView !== 'reader') break;
      await this.translateReaderPage(i);
    }

    this.isTranslatingChapter = false;
    if (allBtn) allBtn.textContent = '⚡ Dịch Cả Chương Này';
  }

  initDrmCanvases() {
    const canvases = document.querySelectorAll('canvas[data-drm-url]');
    canvases.forEach((cvs) => {
      if (cvs.dataset.rendered === '1') return;
      cvs.dataset.rendered = '1';
      const url = cvs.getAttribute('data-drm-url');
      const drmB64 = cvs.getAttribute('data-drm-code');
      this.descrambleCuuTruyenCanvas(cvs, url, drmB64);
    });
  }

  descrambleCuuTruyenCanvas(canvasEl, imageUrl, drmB64) {
    if (!canvasEl || !imageUrl || !drmB64) return;
    try {
      const rawBin = atob(drmB64.replace(/\s+/g, ''));
      const key = '3141592653589793';
      let decoded = '';
      for (let i = 0; i < rawBin.length; i++) {
        decoded += String.fromCharCode(rawBin.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      const parts = decoded.split('|').slice(1); // Skip '#v4'

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        canvasEl.width = w;
        canvasEl.height = h;
        const ctx = canvasEl.getContext('2d');
        let sy = 0;
        for (const token of parts) {
          const [dyStr, shStr] = token.split('-');
          const dy = parseInt(dyStr, 10);
          const sh = parseInt(shStr, 10);
          if (!Number.isNaN(dy) && !Number.isNaN(sh) && sh > 0) {
            ctx.drawImage(img, 0, sy, w, sh, 0, dy, w, sh);
            sy += sh;
          }
        }
        canvasEl.parentElement?.classList.remove('min-h-[220px]');
      };
      img.src = imageUrl;
    } catch (err) {
      console.warn('[Descramble Error]:', err);
    }
  }

  changeSinglePage(delta) {
    const next = this.singlePageIndex + delta;
    if (next < 0) {
      this.navigateAdjacentChapter(-1);
      return;
    }
    if (next >= this.currentChapterPages.length) {
      this.navigateAdjacentChapter(1);
      return;
    }
    this.singlePageIndex = next;
    this.renderReaderPages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handlePageImageError(imgEl, altUrl, pageNumber = 1) {
    if (!imgEl) return;
    if (!imgEl.dataset.triedAlt && altUrl && imgEl.src !== altUrl) {
      imgEl.dataset.triedAlt = '1';
      imgEl.src = altUrl;
      return;
    }
    if (imgEl.dataset.errorRendered === '1') return;
    imgEl.dataset.errorRendered = '1';

    const originalSrc = imgEl.src;
    const wrapper = imgEl.parentElement;
    if (wrapper) {
      const retryDiv = document.createElement('div');
      retryDiv.className = 'p-8 text-center space-y-3 bg-slate-900/90 border border-slate-800 rounded-2xl my-2 w-full';
      retryDiv.innerHTML = `
        <p class="text-xs text-slate-400">Trang ảnh #${pageNumber} tải chậm hoặc bị gián đoạn kết nối CDN</p>
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold"
        >
          ↻ Tải lại trang ảnh #${pageNumber}
        </button>
      `;
      retryDiv.querySelector('button').onclick = () => {
        retryDiv.remove();
        imgEl.dataset.errorRendered = '0';
        imgEl.classList.remove('hidden');
        imgEl.src = `${originalSrc}${originalSrc.includes('?') ? '&' : '?'}retry=${Date.now()}`;
      };
      imgEl.classList.add('hidden');
      wrapper.appendChild(retryDiv);
    }
  }

  generateDemoChapterPages(comicName, chapterName) {
    return [1, 2, 3, 4].map((page) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1150" width="800" height="1150">
        <rect width="800" height="1150" fill="#111827" />
        <rect x="36" y="36" width="728" height="320" rx="16" fill="#1e293b" stroke="#334155" stroke-width="4" />
        <rect x="36" y="384" width="350" height="360" rx="16" fill="#0f172a" stroke="#334155" stroke-width="4" />
        <rect x="414" y="384" width="350" height="360" rx="16" fill="#1e293b" stroke="#334155" stroke-width="4" />
        <rect x="36" y="772" width="728" height="340" rx="16" fill="#0f172a" stroke="#f43f5e" stroke-width="3" />
        <text x="400" y="185" text-anchor="middle" fill="#f43f5e" font-family="sans-serif" font-size="28" font-weight="bold">${this.escapeHtml(comicName)}</text>
        <text x="400" y="235" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="22" font-weight="bold">Chương ${this.escapeHtml(chapterName)} — Trang mẫu #${page}</text>
      </svg>`;
      const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      return { page, saverUrl: uri, hdUrl: uri };
    });
  }

  /* ========================================================================
     READER SETTINGS, AUTO-SCROLL & PROGRESS
     ======================================================================== */
  loadReaderPrefs() {
    return this.loadFromStorage(STORAGE_KEYS.READER_PREFS, {
      mode: 'vertical',
      width: '800px',
      seamless: true,
      brightness: 100,
      eyeCare: false,
      hdQuality: false,
    });
  }

  saveReaderPrefs() {
    this.saveToStorage(STORAGE_KEYS.READER_PREFS, this.readerPrefs);
  }

  applyReaderPrefsToUI() {
    const canvas = document.getElementById('reader-canvas');
    if (canvas) {
      canvas.style.maxWidth = this.readerPrefs.width;
      canvas.classList.toggle('reader-gap-seamless', !!this.readerPrefs.seamless);
      canvas.classList.toggle('reader-gap-normal', !this.readerPrefs.seamless);
    }

    document.documentElement.style.setProperty('--reader-brightness', `${this.readerPrefs.brightness}%`);
    document.documentElement.style.setProperty('--reader-sepia', this.readerPrefs.eyeCare ? '28%' : '0%');

    const widthSelect = document.getElementById('reader-width-select');
    if (widthSelect) widthSelect.value = this.readerPrefs.width;

    const qualityBtn = document.getElementById('reader-quality-btn');
    if (qualityBtn) {
      qualityBtn.textContent = this.readerPrefs.hdQuality ? '✨ Ảnh HD' : '⚡ Nhanh';
      qualityBtn.className = `hidden sm:inline-flex px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
        this.readerPrefs.hdQuality
          ? 'bg-brand-500/20 border-brand-500 text-brand-300'
          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300'
      }`;
    }

    const gapBtn = document.getElementById('gap-toggle-btn');
    if (gapBtn) {
      gapBtn.textContent = this.readerPrefs.seamless ? 'Ghép sát' : 'Có cách';
      gapBtn.className = `px-3 py-2 rounded-xl font-semibold shrink-0 border ${
        this.readerPrefs.seamless
          ? 'bg-brand-500/20 border-brand-500 text-brand-300'
          : 'bg-slate-800 border-slate-700 text-slate-300'
      }`;
    }

    const vertBtn = document.getElementById('mode-vertical-btn');
    const singleBtn = document.getElementById('mode-single-btn');
    if (vertBtn && singleBtn) {
      const isVert = this.readerPrefs.mode === 'vertical';
      vertBtn.className = `px-3 py-2 rounded-xl font-semibold border ${
        isVert ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'
      }`;
      singleBtn.className = `px-3 py-2 rounded-xl font-semibold border ${
        !isVert ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'
      }`;
    }
  }

  toggleReaderSettings() {
    document.getElementById('reader-settings-drawer')?.classList.toggle('hidden');
  }

  setReaderMode(mode) {
    this.readerPrefs.mode = mode;
    this.saveReaderPrefs();
    this.applyReaderPrefsToUI();
    this.renderReaderPages();
  }

  setReaderWidth(width) {
    this.readerPrefs.width = width;
    this.saveReaderPrefs();
    this.applyReaderPrefsToUI();
  }

  toggleSeamlessGap() {
    this.readerPrefs.seamless = !this.readerPrefs.seamless;
    this.saveReaderPrefs();
    this.applyReaderPrefsToUI();
  }

  setReaderBrightness(val) {
    this.readerPrefs.brightness = Number(val) || 100;
    const label = document.getElementById('brightness-val');
    if (label) label.textContent = `${this.readerPrefs.brightness}%`;
    this.saveReaderPrefs();
    this.applyReaderPrefsToUI();
  }

  toggleEyeCare() {
    this.readerPrefs.eyeCare = !this.readerPrefs.eyeCare;
    this.saveReaderPrefs();
    this.applyReaderPrefsToUI();
    this.showToast(this.readerPrefs.eyeCare ? 'Đã bật chế độ Ánh vàng bảo vệ mắt' : 'Đã tắt chế độ Ánh vàng');
  }

  toggleAutoScroll() {
    if (this.autoScrollActive) {
      this.stopAutoScroll();
    } else {
      this.startAutoScroll();
    }
  }

  startAutoScroll() {
    this.autoScrollActive = true;
    const btn = document.getElementById('reader-autoscroll-btn');
    const label = document.getElementById('autoscroll-label');
    if (btn) btn.className = 'px-2.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold flex items-center gap-1 transition';
    if (label) label.textContent = `Đang cuộn (${this.autoScrollSpeed}x)`;

    const step = () => {
      if (!this.autoScrollActive || this.currentView !== 'reader') return;
      window.scrollBy(0, this.autoScrollSpeed * 0.9);
      this.autoScrollRaf = requestAnimationFrame(step);
    };
    this.autoScrollRaf = requestAnimationFrame(step);
  }

  stopAutoScroll() {
    this.autoScrollActive = false;
    if (this.autoScrollRaf) cancelAnimationFrame(this.autoScrollRaf);
    const btn = document.getElementById('reader-autoscroll-btn');
    const label = document.getElementById('autoscroll-label');
    if (btn) btn.className = 'px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition';
    if (label) label.textContent = 'Tự cuộn';
  }

  setAutoScrollSpeed(val) {
    this.autoScrollSpeed = Number(val) || 2;
    const el = document.getElementById('autoscroll-speed-val');
    if (el) el.textContent = `${this.autoScrollSpeed}x`;
    const label = document.getElementById('autoscroll-label');
    if (this.autoScrollActive && label) {
      label.textContent = `Đang cuộn (${this.autoScrollSpeed}x)`;
    }
  }

  toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  updateReaderScrollProgress() {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const pct = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
    const bar = document.getElementById('reader-top-progress-bar');
    if (bar) {
      bar.style.width = `${pct.toFixed(1)}%`;
    }
  }

  /* ========================================================================
     BOOKMARKS (TỦ TRUYỆN) & READING HISTORY (LỊCH SỬ)
     ======================================================================== */
  isBookmarked(slug) {
    return this.bookmarks.some((b) => b.slug === slug);
  }

  toggleBookmarkFromObject(slug) {
    const existingIdx = this.bookmarks.findIndex((b) => b.slug === slug);
    if (existingIdx !== -1) {
      const removed = this.bookmarks[existingIdx];
      this.bookmarks.splice(existingIdx, 1);
      this.saveToStorage(STORAGE_KEYS.BOOKMARKS, this.bookmarks);
      this.updateLibraryBadges();
      this.showToast(`Đã bỏ "${removed.name}" khỏi Tủ Truyện`);
    } else {
      const source =
        this.currentListItems.find((i) => i.slug === slug) ||
        this.heroItems.find((i) => i.slug === slug) ||
        (this.currentComic?.slug === slug ? this.currentComic : null);

      if (source) {
        this.bookmarks.unshift({
          slug: source.slug,
          name: source.name,
          thumb_url: source.thumb_url,
          origin_label: source.origin_label || '',
          content: source.content || '',
          status: source.status,
          category: source.category || [],
          chaptersLatest: source.chaptersLatest || [],
          updatedAt: source.updatedAt || new Date().toISOString(),
        });
        this.saveToStorage(STORAGE_KEYS.BOOKMARKS, this.bookmarks);
        this.updateLibraryBadges();
        this.showToast(`❤️ Đã thêm "${source.name}" vào Tủ Truyện!`);
      }
    }

    if (this.currentView === 'browse') {
      if (this.currentMode === 'bookmarks') {
        this.renderBookmarksList();
      } else {
        this.renderComicGrid(this.currentListItems);
        if (this.currentMode === 'home') this.renderHeroCarousel();
      }
    }
  }

  toggleBookmarkCurrentComic() {
    if (!this.currentComic) return;
    this.toggleBookmarkFromObject(this.currentComic.slug);
    this.renderComicDetail();
  }

  recordReadingHistory(comic, chapterObj) {
    if (!comic || !comic.slug) return;
    const existingIdx = this.history.findIndex((h) => h.slug === comic.slug);
    const prevRead = existingIdx !== -1 ? this.history[existingIdx].readChapters || [] : [];
    const chapName = String(chapterObj.chapter_name);
    if (!prevRead.includes(chapName)) {
      prevRead.push(chapName);
    }

    const entry = {
      slug: comic.slug,
      name: comic.name,
      thumb_url: comic.thumb_url || '',
      origin_label: comic.origin_label || '',
      content: comic.content || '',
      lastChapterName: chapName,
      lastChapterApi: chapterObj.chapter_api_data || chapterObj.chapter_api || '',
      readChapters: prevRead,
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      this.history.splice(existingIdx, 1);
    }
    this.history.unshift(entry);
    if (this.history.length > 60) {
      this.history = this.history.slice(0, 60);
    }

    this.saveToStorage(STORAGE_KEYS.HISTORY, this.history);
    this.updateLibraryBadges();
  }

  getHistoryForComic(slug) {
    return this.history.find((h) => h.slug === slug) || null;
  }

  renderBookmarksList() {
    document.getElementById('list-title').textContent = '❤️ Tủ Truyện Yêu Thích Của Bạn';
    document.getElementById('list-subtitle').textContent = 'Các bộ truyện bạn đã đánh dấu để theo dõi chương mới';
    document.getElementById('total-items-badge').textContent = `${this.bookmarks.length} truyện đã lưu`;
    const bar = document.getElementById('pagination-bar');
    if (bar) {
      bar.innerHTML = `
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="app.exportLibraryBackup()" class="px-4 py-2 rounded-xl bg-brand-500/15 text-brand-500 hover:bg-brand-500 hover:text-white text-xs font-bold transition">
            📥 Xuất File Sao Lưu Tủ Truyện & Lịch Sử (.json)
          </button>
          <label class="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer transition">
            📤 Nhập File Sao Lưu (.json)
            <input type="file" accept=".json" onchange="app.importLibraryBackup(event)" class="hidden" />
          </label>
        </div>
      `;
    }
    this.renderComicGrid(this.bookmarks);
  }

  renderHistoryList() {
    document.getElementById('list-title').textContent = '🕒 Lịch Sử Đọc Truyện';
    document.getElementById('list-subtitle').textContent = 'Tự động lưu chương bạn đang đọc dở để đọc tiếp bất cứ lúc nào';
    document.getElementById('total-items-badge').textContent = `${this.history.length} truyện đã đọc`;

    const bar = document.getElementById('pagination-bar');
    if (bar) {
      bar.innerHTML = `
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="app.exportLibraryBackup()" class="px-4 py-2 rounded-xl bg-brand-500/15 text-brand-500 hover:bg-brand-500 hover:text-white text-xs font-bold transition">
            📥 Xuất File Sao Lưu (.json)
          </button>
          ${
            this.history.length > 0
              ? `<button onclick="app.clearHistory()" class="px-4 py-2 rounded-xl bg-rose-500/15 text-rose-500 hover:bg-rose-500 hover:text-white text-xs font-bold transition">
                  🗑️ Xóa toàn bộ lịch sử đọc
                </button>`
              : ''
          }
        </div>
      `;
    }
    this.renderComicGrid(this.history);
  }

  exportLibraryBackup() {
    const payload = {
      version: '5.0',
      exportedAt: new Date().toISOString(),
      bookmarks: this.bookmarks,
      history: this.history,
      comments: this.comments,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mangaverse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('📥 Đã tải xuống file sao lưu Tủ Truyện & Lịch Sử!');
  }

  importLibraryBackup(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.bookmarks)) {
          this.bookmarks = data.bookmarks;
          this.saveToStorage(STORAGE_KEYS.BOOKMARKS, this.bookmarks);
        }
        if (Array.isArray(data.history)) {
          this.history = data.history;
          this.saveToStorage(STORAGE_KEYS.HISTORY, this.history);
        }
        this.updateLibraryBadges();
        this.loadCurrentList();
        this.showToast('✅ Đã khôi phục Tủ Truyện & Lịch Sử thành công!');
      } catch (_) {
        this.showToast('⚠️ File sao lưu không hợp lệ');
      }
    };
    reader.readAsText(file);
  }

  clearHistory() {
    this.history = [];
    this.saveToStorage(STORAGE_KEYS.HISTORY, []);
    this.updateLibraryBadges();
    this.renderHistoryList();
    this.showToast('Đã xóa lịch sử đọc truyện');
  }

  updateLibraryBadges() {
    const bBadge = document.getElementById('bookmarks-count-badge');
    const hBadge = document.getElementById('history-count-badge');
    if (bBadge) {
      bBadge.textContent = String(this.bookmarks.length);
      bBadge.classList.toggle('hidden', this.bookmarks.length === 0);
    }
    if (hBadge) {
      hBadge.textContent = String(this.history.length);
      hBadge.classList.toggle('hidden', this.history.length === 0);
    }
  }

  /* ========================================================================
     RANDOM COMIC & LOCAL COMMUNITY COMMENTS
     ======================================================================== */
  openRandomComic() {
    const pool = this.currentListItems.length > 0 ? this.currentListItems : FALLBACK_COMICS;
    const randomItem = pool[Math.floor(Math.random() * pool.length)];
    if (randomItem) {
      this.showToast(`🎲 Khám phá ngẫu nhiên: ${randomItem.name}`);
      this.openComicDetail(randomItem.slug);
    }
  }

  handleAddComment(e) {
    e.preventDefault();
    if (!this.currentComic) return;
    const authorInput = document.getElementById('comment-author-input');
    const textInput = document.getElementById('comment-text-input');
    const text = textInput?.value?.trim();
    if (!text) return;

    const author = authorInput?.value?.trim() || 'Độc giả ẩn danh';
    const slug = this.currentComic.slug;
    if (!this.comments[slug]) {
      this.comments[slug] = [];
    }
    this.comments[slug].unshift({
      author,
      text,
      time: new Date().toISOString(),
    });
    this.saveToStorage(STORAGE_KEYS.COMMENTS, this.comments);
    if (textInput) textInput.value = '';
    this.renderComicComments();
    this.showToast('Đã gửi bình luận của bạn!');
  }

  renderComicComments() {
    const listEl = document.getElementById('comic-comments-list');
    if (!listEl || !this.currentComic) return;

    const userComments = this.comments[this.currentComic.slug] || [];
    const defaultComments = [
      {
        author: 'Minh Hoàng • Fan Manga',
        text: 'Truyện cuốn thực sự, nét vẽ đẹp và cốt truyện càng về sau càng hấp dẫn. Cảm ơn web đã cập nhật chap mới siêu nhanh!',
        time: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
      },
      {
        author: 'Hải Yến',
        text: 'Bộ lọc mới chọn được cả quốc gia Manhwa/Manga lẫn nhiều thể loại cùng lúc tiện quá ❤️',
        time: new Date(Date.now() - 3600 * 1000 * 14).toISOString(),
      },
    ];

    const all = [...userComments, ...defaultComments];
    listEl.innerHTML = all
      .map(
        (c) => `
      <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 space-y-1">
        <div class="flex items-center justify-between text-xs">
          <strong class="text-slate-900 dark:text-white font-bold">${this.escapeHtml(c.author)}</strong>
          <span class="text-slate-400 text-[11px]">${this.formatTimeAgo(c.time)}</span>
        </div>
        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300">${this.escapeHtml(c.text)}</p>
      </div>
    `
      )
      .join('');
  }

  /* ========================================================================
     CRAWLER & CHAPTER SYNCHRONIZATION DASHBOARD
     ======================================================================== */
  async openSyncModal() {
    document.getElementById('sync-modal')?.classList.remove('hidden');
    await this.refreshSyncStatus();
    if (this.syncPollTimer) clearInterval(this.syncPollTimer);
    this.syncPollTimer = setInterval(() => {
      const modal = document.getElementById('sync-modal');
      if (!modal || modal.classList.contains('hidden')) {
        clearInterval(this.syncPollTimer);
        return;
      }
      this.refreshSyncStatus();
    }, 2200);
  }

  closeSyncModal() {
    document.getElementById('sync-modal')?.classList.add('hidden');
    if (this.syncPollTimer) clearInterval(this.syncPollTimer);
  }

  async refreshSyncStatus() {
    let st = window.SYNCED_MANGA_SEED || {
      isRunning: false,
      phase: 'Đã đồng bộ sẵn trong bộ nhớ Seed',
      totalMangas: 119,
      totalChapters: 19783,
      sourceCounts: {
        nettruyen: { mangas: 56, chapters: 17430 },
        cuutruyen: { mangas: 25, chapters: 1020 },
        otruyen_tqq: { mangas: 18, chapters: 420 },
        mangadex: { mangas: 20, chapters: 913 },
      },
      logs: ['✅ Đã nạp sẵn 119 bộ truyện và 19,783 chương từ cơ sở dữ liệu đồng bộ.'],
    };

    try {
      const res = await fetch(`${API_BASE}/sync/status`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) st = json.data;
      }
    } catch (_) {}

    const headerBadge = document.getElementById('header-sync-count');
    if (headerBadge && st.totalChapters) {
      headerBadge.textContent =
        st.totalChapters >= 1000 ? `${(st.totalChapters / 1000).toFixed(1)}K` : String(st.totalChapters);
    }

    const statsEl = document.getElementById('sync-stats-container');
    if (statsEl) {
      const sc = st.sourceCounts || {};
      statsEl.innerHTML = `
        <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
          <div class="text-[11px] font-bold text-emerald-500 uppercase">Tổng Chương Đã Đồng Bộ</div>
          <div class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            ${(st.totalChapters || 0).toLocaleString('vi-VN')}
          </div>
          <div class="text-[11px] text-slate-400">${(st.totalMangas || 0).toLocaleString('vi-VN')} bộ truyện trong DB</div>
        </div>

        <div class="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
          <div class="text-[11px] font-bold text-emerald-400">🟢 NetTruyen</div>
          <div class="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
            ${(sc.nettruyen?.chapters || 0).toLocaleString('vi-VN')} chap
          </div>
          <div class="text-[11px] text-slate-400">${sc.nettruyen?.mangas || 0} bộ truyện</div>
        </div>

        <div class="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
          <div class="text-[11px] font-bold text-purple-400">🟣 Cứu Truyện VN</div>
          <div class="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
            ${(sc.cuutruyen?.chapters || 0).toLocaleString('vi-VN')} chap
          </div>
          <div class="text-[11px] text-slate-400">${sc.cuutruyen?.mangas || 0} bộ truyện</div>
        </div>

        <div class="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
          <div class="text-[11px] font-bold text-sky-400">🔵 TruyenQQ • 🟠 MangaDex</div>
          <div class="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
            ${((sc.otruyen_tqq?.chapters || 0) + (sc.mangadex?.chapters || 0)).toLocaleString('vi-VN')} chap
          </div>
          <div class="text-[11px] text-slate-400">${(sc.otruyen_tqq?.mangas || 0) + (sc.mangadex?.mangas || 0)} bộ truyện</div>
        </div>
      `;
    }

    const phaseEl = document.getElementById('sync-phase-label');
    if (phaseEl) {
      phaseEl.textContent = st.isRunning ? `🔄 ${st.phase || 'Đang cào dữ liệu...'}` : `✅ ${st.phase || 'Đã đồng bộ xong'}`;
    }

    const lastEl = document.getElementById('sync-last-comic');
    if (lastEl) {
      lastEl.textContent = st.lastSyncedComic ? `Vừa đồng bộ: ${st.lastSyncedComic}` : '';
    }

    const barEl = document.getElementById('sync-progress-bar');
    if (barEl) {
      const pct =
        st.progressTotal > 0 ? Math.min(100, Math.round((st.progressCurrent / st.progressTotal) * 100)) : 100;
      barEl.style.width = `${pct}%`;
    }

    const logsBox = document.getElementById('sync-logs-box');
    if (logsBox && Array.isArray(st.logs) && st.logs.length > 0) {
      logsBox.innerHTML = st.logs.map((l) => `<div>${this.escapeHtml(l)}</div>`).join('');
    }
  }

  async triggerServerSync(pages = 1) {
    try {
      this.showToast(`🚀 Đang kích hoạt Crawler đồng bộ +${pages} đợt từ cả 4 nguồn truyện...`);
      await fetch(`${API_BASE}/sync/start?pages=${pages}`);
      await this.refreshSyncStatus();
    } catch (err) {
      this.showToast('Hãy chạy server.js hoặc CHAY-CAO-DONG-BO-CHAP.bat để cào thêm chương mới!');
    }
  }

  /* ========================================================================
     MODALS, STORAGE & HELPERS
     ======================================================================== */
  toggleApiModal() {
    document.getElementById('api-modal')?.classList.toggle('hidden');
  }

  clearCacheAndReload() {
    this.apiCache.clear();
    this.toggleApiModal();
    this.refreshCurrentList();
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className =
      'toast-enter pointer-events-auto px-4 py-3 rounded-2xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 text-xs font-bold shadow-2xl border border-slate-700/50 flex items-center gap-2';
    toast.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-brand-500"></span>
      <span>${this.escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  loadFromStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  formatTimeAgo(isoDate) {
    if (!isoDate) return 'Mới cập nhật';
    const diffSec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (Number.isNaN(diffSec) || diffSec < 60) return 'Vừa xong';
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(isoDate).toLocaleDateString('vi-VN');
  }

  stripHtmlTags(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  escapeAttr(str) {
    return this.escapeHtml(str);
  }
}

const app = new MangaVerseApp();
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
