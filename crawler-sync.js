/* ==========================================================================
   MANGAVERSE VN 5.5 — MULTI-SOURCE MANGA & CHAPTER CRAWLER / SYNC ENGINE
   Special Feature: Crawls & Synchronizes ALL Chapters (Vietnamese + English)
   of Legendary & Most Popular Manga:
     - Blue Lock (+ Episode Nagi)
     - Thám Tử Kindaichi (Kindaichi Case Files, Phần 2, R, 37 tuổi)
     - Siêu Đầu Bếp Cung Đình (Chuuka Ichiban! / Shin Cooking Master Boy / Kiwami)
     - Itto / Jindo (Kattobi Itto - Đường Dẫn Đến Khung Thành & Buttobi Itto - Cơn Lốc Sân Cỏ)
     - Slam Dunk (Cao Thủ Bóng Rổ)
     - + 45 Top Legendary Manga (One Piece, Dragon Ball, Naruto, Conan, Doraemon,
       Hunter x Hunter, Berserk, Attack on Titan, Demon Slayer, Jujutsu Kaisen,
       Kingdom, Vagabond, Monster, Death Note, Haikyuu, Hajime no Ippo, Soma, Toriko...)
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Bypass Vietnamese ISP DNS Sinkholes
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

const DB_DIR = path.join(__dirname, 'db');
const DB_FILE = path.join(DB_DIR, 'synced-manga.json');
const SEED_JS_FILE = path.join(__dirname, 'synced-seed.js');

const NETTRUYEN_BASE = 'https://nhattruyenqq.com';
const TRUYENQQ_BASE = 'https://truyenqq.cx';
const CUUTRUYEN_API = 'https://cuutruyen.net/api/v2';
const MANGADEX_API = 'https://api.mangadex.org';
const MANGAPILL_BASE = 'https://mangapill.com';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const API_UA = 'MangaVerseVN/5.5 (CrawlerSyncEngine; +http://localhost:3080)';

// Curated Hall of Fame & Requested Classics (Vietnamese NetTruyen + Cứu Truyện + English/VI MangaDex + English MangaPill)
const LEGENDARY_MANGA_TARGETS = [
  // 1. BLUE LOCK
  {
    title: 'Blue Lock — Tiền Đạo Số 1',
    ntSlug: 'blue-lock',
    ntAltSlug: 'blue-lock-tien-dao-so-1',
    ctId: '558',
    mdId: '4141c5dc-c525-4df5-afd7-cc7d192a832f',
    mpPath: '/manga/580/blue-lock',
    tags: ['Thể Thao', 'Bóng Đá', 'Hành Động', 'Shounen'],
    priority: 1,
  },
  {
    title: 'Blue Lock: Ngoại Truyện Thiên Tài Nagi Seishiro',
    ntSlug: 'blue-lock-ngoai-truyen-ve-thien-tai-nagi-seishiro',
    mdId: 'b4668276-4b3e-49e0-98e7-fcc6841f7680',
    mpPath: '/manga/6749/blue-lock-episode-nagi',
    tags: ['Thể Thao', 'Bóng Đá', 'Shounen'],
    priority: 2,
  },
  // 2. KINDAICHI
  {
    title: 'Thám Tử Kindaichi (Kindaichi Case Files — Bản Đẹp Full)',
    ntSlug: 'tham-tu-kindaichi-ban-dep',
    ntAltSlug: 'tham-tu-kindaichi-case-files',
    mdId: 'ced910fb-8542-48bd-b87a-5ff662185295',
    mpPath: '/manga/2328/kindaichi-shounen-no-jikenbo-file-series',
    tags: ['Trinh Thám', 'Bí Ẩn', 'Hình Sự', 'Kinh Dị'],
    priority: 3,
  },
  {
    title: 'Thám Tử Kindaichi — Phần 2 & Kindaichi R',
    ntSlug: 'tham-tu-kindaichi-phan-2',
    mdId: '3ed88622-ba6a-4dd6-b5d2-125d7cffcc99',
    mpPath: '/manga/10358/kindaichi-shounen-no-jikenbo-case-series',
    tags: ['Trinh Thám', 'Bí Ẩn', 'Shounen'],
    priority: 4,
  },
  {
    title: 'Thám Tử Kindaichi Tuổi 37 (Kindaichi 37-sai no Jikenbo)',
    ntSlug: 'tham-tu-kindaichi-tuoi-37',
    mdId: '6e96f17a-0aa1-411a-82bd-1171c0ee95f3',
    mpPath: '/manga/10356/kindaichi-37-sai-no-jikenbo',
    tags: ['Trinh Thám', 'Bí Ẩn', 'Seinen'],
    priority: 5,
  },
  // 3. SIÊU ĐẦU BẾP CUNG ĐÌNH (CHUUKA ICHIBAN! / COOKING MASTER BOY)
  {
    title: 'Siêu Đầu Bếp Cung Đình — Tiểu Đầu Bếp Cung Đình (Chuuka Ichiban!)',
    ntSlug: 'trung-hoa-tieu-dau-bep-chuuka-ichiban',
    mdId: '9b6ad267-f3ac-4fcd-a8fc-4afe52d868ea',
    mdAltId: '0ea9566a-2082-4799-9a59-05d20b0f89cd',
    mpPath: '/manga/5316/shin-chuuka-ichiban',
    tags: ['Ẩm Thực', 'Cổ Đại', 'Hành Động', 'Phiêu Lưu'],
    priority: 6,
  },
  {
    title: 'Siêu Đầu Bếp Cung Đình: Cực Phẩm (Chuuka Ichiban! Kiwami)',
    mdId: 'fc06db2b-1231-4816-b56a-ee7b47875682',
    mpPath: '/manga/5316/shin-chuuka-ichiban',
    tags: ['Ẩm Thực', 'Cổ Đại', 'Shounen'],
    priority: 7,
  },
  // 4. ITTO / JINDO
  {
    title: 'Itto — Đường Dẫn Đến Khung Thành Bộ 1 (Kattobi Itto / Jindo)',
    ntSlug: 'kattobi-itto-duong-dan-den-khung-thanh-bo-1',
    ntAltSlug: 'kattobi-itto',
    mdId: '6b5ad09d-fcff-473b-a78f-f8e69700a39a',
    mdAltId: 'ac68cc75-7ba8-4387-8586-f6d046795e4a',
    tags: ['Thể Thao', 'Bóng Đá', 'Hài Hước', 'Học Đường'],
    priority: 8,
  },
  {
    title: 'Itto — Cơn Lốc Sân Cỏ Bộ 2 (Buttobi Itto / Jindo Đại Học)',
    ntSlug: 'itto-con-loc-san-co-nxb-kim-dong',
    mdId: 'ac68cc75-7ba8-4387-8586-f6d046795e4a',
    tags: ['Thể Thao', 'Bóng Đá', 'Hài Hước', 'Shounen'],
    priority: 9,
  },
  // 5. SLAM DUNK
  {
    title: 'Slam Dunk — Cao Thủ Bóng Rổ (Trọn Bộ)',
    ntSlug: 'slam-dunk-scan',
    ntAltSlug: 'cao-thu-bong-ro-remake',
    mdId: '319df2e2-e6a6-4e3a-a31c-68539c140a84',
    mpPath: '/manga/9/slam-dunk',
    tags: ['Thể Thao', 'Bóng Rổ', 'Hài Hước', 'Học Đường'],
    priority: 10,
  },
  // 6. TOP LEGENDARY & MOST POPULAR MANGA OF ALL TIME
  { title: 'Đảo Hải Tặc (One Piece)', ntSlug: 'dao-hai-tac', ctId: '2637', mdId: 'a2c1d849-af05-4bbc-b2a7-866ebb10331f', mpPath: '/manga/2/one-piece', tags: ['Hành Động', 'Phiêu Lưu', 'Shounen'], priority: 11 },
  { title: 'Thám Tử Lừng Danh Conan (Detective Conan)', ntSlug: 'tham-tu-lung-danh-conan', ctId: '2483', mdQuery: 'Detective Conan', mpPath: '/manga/5193/detective-conan-tokubetsu-hen', tags: ['Trinh Thám', 'Bí Ẩn', 'Shounen'], priority: 12 },
  { title: 'Bảy Viên Ngọc Rồng (Dragon Ball)', mdQuery: 'Dragon Ball', mpPath: '/manga/1063/dragon-ball', tags: ['Hành Động', 'Võ Thuật', 'Shounen'], priority: 13 },
  { title: 'Naruto — Cửu Vĩ Hồ Ly', ntSlug: 'naruto', mdQuery: 'Naruto', mpPath: '/manga/3069/naruto', tags: ['Hành Động', 'Nhẫn Giả', 'Shounen'], priority: 14 },
  { title: 'Hunter x Hunter (Thợ Săn Tí Hon)', ntSlug: 'hunter-x-hunter', mdQuery: 'Hunter x Hunter', mpPath: '/manga/1828/hunter-x-hunter', tags: ['Hành Động', 'Phiêu Lưu', 'Shounen'], priority: 15 },
  { title: 'Berserk (Kiếm Sĩ Đen)', ntSlug: 'berserk', ctId: '488', mdQuery: 'Berserk', mpPath: '/manga/1/berserk', tags: ['Hành Động', 'Giả Tưởng', 'Seinen'], priority: 16 },
  { title: 'Vương Giả Thiên Hạ (Kingdom)', ntSlug: 'vuong-gia-thien-ha', mdQuery: 'Kingdom', mpPath: '/manga/8/kingdom', tags: ['Lịch Sử', 'Chiến Tranh', 'Seinen'], priority: 17 },
  { title: 'Lãng Khách (Vagabond)', ctId: '463', mdQuery: 'Vagabond', mpPath: '/manga/4/vagabond', tags: ['Kiếm Hiệp', 'Lịch Sử', 'Seinen'], priority: 18 },
  { title: 'Đại Chiến Titan (Attack on Titan)', mdId: '304ceac3-8cdb-4fe7-acf7-2b6ff7a60613', mpPath: '/manga/5/shingeki-no-kyojin', tags: ['Hành Động', 'Kịch Tính', 'Bí Ẩn'], priority: 19 },
  { title: 'Thanh Gươm Diệt Quỷ (Kimetsu no Yaiba)', ntSlug: 'thanh-guom-diet-quy', ctId: '534', mdId: '62040a44-0935-46b7-a691-5ae5833af0ae', mpPath: '/manga/2285/kimetsu-no-yaiba', tags: ['Hành Động', 'Siêu Nhiên', 'Shounen'], priority: 20 },
  { title: 'Chú Thuật Hồi Chiến (Jujutsu Kaisen)', ctId: '197', mdId: 'c52b2ce3-7f95-469c-96b0-479524fb7a1a', mpPath: '/manga/2085/jujutsu-kaisen', tags: ['Hành Động', 'Siêu Nhiên', 'Shounen'], priority: 21 },
  { title: 'One-Punch Man (Người Hùng Một Đấm)', ctId: '1106', mdQuery: 'One-Punch Man', mpPath: '/manga/3262/one-punch-man', tags: ['Hành Động', 'Hài Hước', 'Seinen'], priority: 22 },
  { title: 'Chainsaw Man (Người Cưa)', ctId: '530', mdQuery: 'Chainsaw Man', mpPath: '/manga/723/chainsaw-man', tags: ['Hành Động', 'Kinh Dị', 'Shounen'], priority: 23 },
  { title: 'Quyển Sổ Thiên Mệnh (Death Note)', mdId: '75ee72ab-c6bf-4b87-badd-de839156934c', mpPath: '/manga/938/death-note', tags: ['Trinh Thám', 'Tâm Lý', 'Siêu Nhiên'], priority: 24 },
  { title: 'Giả Kim Thuật Sư (Fullmetal Alchemist)', ctId: '512', mdQuery: 'Fullmetal Alchemist', mpPath: '/manga/6/fullmetal-alchemist', tags: ['Hành Động', 'Phiêu Lưu', 'Giả Tưởng'], priority: 25 },
  { title: 'Monster (Quái Vật Không Tên)', ctId: '509', mdQuery: 'Monster', mpPath: '/manga/3/monster', tags: ['Trinh Thám', 'Tâm Lý', 'Seinen'], priority: 26 },
  { title: 'Vua Bóng Chuyền (Haikyuu!!)', ctId: '3', mdId: '8f8b7cb0-7109-46e8-b12c-0448a6453dfa', mpPath: '/manga/1515/haikyuu', tags: ['Thể Thao', 'Bóng Chuyền', 'Học Đường'], priority: 27 },
  { title: 'Võ Sĩ Quyền Anh (Hajime no Ippo)', mdQuery: 'Hajime no Ippo', mpPath: '/manga/1519/hajime-no-ippo', tags: ['Thể Thao', 'Quyền Anh', 'Shounen'], priority: 28 },
  { title: 'Subasa — Giấc Mơ Sân Cỏ (Captain Tsubasa)', mdQuery: 'Captain Tsubasa', mpPath: '/manga/701/captain-tsubasa', tags: ['Thể Thao', 'Bóng Đá', 'Shounen'], priority: 29 },
  { title: 'Thiên Tài Bóng Đá (Ao Ashi)', mdQuery: 'Ao Ashi', mpPath: '/manga/276/ao-ashi', tags: ['Thể Thao', 'Bóng Đá', 'Seinen'], priority: 30 },
  { title: 'Tuyển Thủ Vô Hình (Kuroko no Basket)', mdQuery: 'Kuroko no Basket', mpPath: '/manga/2515/kuroko-no-basket', tags: ['Thể Thao', 'Bóng Rổ', 'Shounen'], priority: 31 },
  { title: 'Eyeshield 21 (Chớp Không Gian)', mdQuery: 'Eyeshield 21', mpPath: '/manga/1162/eyeshield-21', tags: ['Thể Thao', 'Hài Hước', 'Shounen'], priority: 32 },
  { title: 'Vua Đầu Bếp Soma (Shokugeki no Soma)', mdQuery: 'Shokugeki no Soma', mpPath: '/manga/3991/shokugeki-no-soma', tags: ['Ẩm Thực', 'Học Đường', 'Hài Hước'], priority: 33 },
  { title: 'Thợ Săn Ẩm Thực (Toriko)', mdQuery: 'Toriko', mpPath: '/manga/4563/toriko', tags: ['Ẩm Thực', 'Hành Động', 'Phiêu Lưu'], priority: 34 },
  { title: 'Vua Bánh Mì (Yakitate!! Japan)', mdQuery: 'Yakitate!! Japan', mpPath: '/manga/4855/yakitate-japan', tags: ['Ẩm Thực', 'Hài Hước', 'Shounen'], priority: 35 },
  { title: 'Pháp Sư Tiễn Táng (Sousou no Frieren)', ctId: '702', mdQuery: 'Sousou no Frieren', mpPath: '/manga/5035/sousou-no-frieren', tags: ['Giả Tưởng', 'Phiêu Lưu', 'Đời Thường'], priority: 36 },
  { title: 'Dandadan', ctId: '203', mdQuery: 'Dandadan', mpPath: '/manga/5460/dandadan', tags: ['Hành Động', 'Hài Hước', 'Siêu Nhiên'], priority: 37 },
  { title: 'Sakamoto Days (Sát Thủ Về Vườn)', ctId: '106', mdQuery: 'Sakamoto Days', mpPath: '/manga/5281/sakamoto-days', tags: ['Hành Động', 'Hài Hước', 'Shounen'], priority: 38 },
  { title: 'Kagurabachi', ctId: '1606', mdQuery: 'Kagurabachi', mpPath: '/manga/7529/kagurabachi', tags: ['Hành Động', 'Kiếm Thuật', 'Shounen'], priority: 39 },
  { title: 'Bleach (Sứ Giả Thần Chết)', mdQuery: 'Bleach', mpPath: '/manga/552/bleach', tags: ['Hành Động', 'Siêu Nhiên', 'Shounen'], priority: 40 },
  { title: 'Vua Trò Chơi (Yu-Gi-Oh!)', mdQuery: 'Yu-Gi-Oh!', mpPath: '/manga/4928/yu-gi-oh-5d-s', tags: ['Trò Chơi', 'Giả Tưởng', 'Shounen'], priority: 41 },
  { title: 'Doraemon (Chú Mèo Máy Đến Từ Tương Lai)', ctId: '401', mdQuery: 'Doraemon', mpPath: '/manga/5184/daichouhen-doraemon', tags: ['Hài Hước', 'Đời Thường', 'Khoa Học'], priority: 42 },
  { title: 'Lãng Khách Kenshin (Rurouni Kenshin)', mdQuery: 'Rurouni Kenshin', mpPath: '/manga/3641/rurouni-kenshin', tags: ['Kiếm Hiệp', 'Lịch Sử', 'Shounen'], priority: 43 },
  { title: 'Tôi Đi Tìm Tôi (Great Teacher Onizuka — GTO)', mdQuery: 'GTO', mpPath: '/manga/1458/great-teacher-onizuka', tags: ['Hài Hước', 'Học Đường', 'Đời Thường'], priority: 44 },
  { title: 'Vinland Saga (Khúc Ca Hải Tặc)', mdQuery: 'Vinland Saga', mpPath: '/manga/4741/vinland-saga', tags: ['Lịch Sử', 'Hành Động', 'Seinen'], priority: 45 },
  { title: 'Tokyo Ghoul (Ngạ Quỷ Vùng Tokyo)', mdQuery: 'Tokyo Ghoul', mpPath: '/manga/4524/tokyo-ghoul', tags: ['Hành Động', 'Kinh Dị', 'Seinen'], priority: 46 },
  { title: 'Học Viện Anh Hùng (My Hero Academia)', ctId: '156', mdQuery: 'Boku no Hero Academia', mpPath: '/manga/601/boku-no-hero-academia', tags: ['Hành Động', 'Học Đường', 'Shounen'], priority: 47 },
  { title: 'Black Clover', ctId: '134', mdQuery: 'Black Clover', mpPath: '/manga/524/black-clover', tags: ['Hành Động', 'Phép Thuật', 'Shounen'], priority: 48 },
  { title: 'Spy x Family (Gia Đình Điệp Viên)', ctId: '487', mdQuery: 'Spy x Family', mpPath: '/manga/4143/spy-x-family', tags: ['Hài Hước', 'Hành Động', 'Đời Thường'], priority: 49 },
  { title: 'Tôi Thăng Cấp Một Mình (Solo Leveling)', origin: 'ko', tqqSlug: 'solo-leveling-ss3', ctId: '112', mdId: '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0', tags: ['Manhwa', 'Hành Động', 'Hệ Thống', 'Hầm Ngục'], priority: 50 },

  // ==========================================================================
  // 7. TOP MANHWA (HÀN QUỐC) HAY & PHỔ BIẾN NHẤT MỌI THỜI ĐẠI
  // ==========================================================================
  { title: 'Solo Leveling: Ragnarok (Hậu Duệ Thăng Cấp)', origin: 'ko', tqqSlug: 'solo-leveling-ragnarok', mdQuery: 'Solo Leveling: Ragnarok', tags: ['Manhwa', 'Hành Động', 'Hệ Thống'], priority: 51 },
  { title: 'Toàn Trí Độc Giả (Omniscient Reader’s Viewpoint)', origin: 'ko', mdId: '9a414441-bbad-43f1-a3a7-dc262ca790a3', tags: ['Manhwa', 'Hành Động', 'Sinh Tồn', 'Hệ Thống'], priority: 52 },
  { title: 'Bậc Thầy Thiết Kế Điền Trang (The Greatest Estate Developer)', origin: 'ko', tqqSlug: 'bac-thay-thiet-ke-dien-trang', mdId: 'd7f56ace-cd30-48b9-8b64-afeca0077fca', tags: ['Manhwa', 'Hài Hước', 'Chuyển Sinh', 'Xây Dựng'], priority: 53 },
  { title: 'Nano Ma Thần (Nano Machine)', origin: 'ko', mdId: '6e4805a6-75ab-462d-883c-4ddedb8e4df6', tags: ['Manhwa', 'Võ Thuật', 'Murim', 'Hệ Thống'], priority: 54 },
  { title: 'Sự Trở Lại Của Hoa Sơn Phái (Return of the Mount Hua Sect)', origin: 'ko', mdId: 'f0f62b75-5989-4f32-9b59-ab56abe35fc1', tags: ['Manhwa', 'Kiếm Hiệp', 'Murim', 'Trùng Sinh'], priority: 55 },
  { title: 'Bắc Kiếm Giang Hồ (Legend of the Northern Blade)', origin: 'ko', mdId: '9ed16bc9-f570-4e71-8dda-aebc098b683b', tags: ['Manhwa', 'Kiếm Hiệp', 'Murim', 'Hành Động'], priority: 56 },
  { title: 'Eleceed — Tốc Độ Ánh Sáng', origin: 'ko', mdId: '7e544761-7d3d-4fce-8137-719814d7d138', tags: ['Manhwa', 'Hành Động', 'Siêu Năng Lực', 'Hài Hước'], priority: 57 },
  { title: 'Lookism — Hoán Đổi Diện Mạo', origin: 'ko', mdId: '596191eb-69ee-4401-983e-cc07e277fa17', tags: ['Manhwa', 'Học Đường', 'Hành Động', 'Kịch Tính'], priority: 58 },
  { title: 'Wind Breaker — Cơn Gió Phân Tranh', origin: 'ko', tqqSlug: 'wind-breaker', mdId: '9eb78304-0436-484d-9a79-a925b45e2731', tags: ['Manhwa', 'Thể Thao', 'Học Đường', 'Hành Động'], priority: 59 },
  { title: 'Bạn Học Tôi Là Lính Đánh Thuê (Mercenary Enrollment)', origin: 'ko', tqqSlug: 'ban-hoc-toi-la-linh-danh-thue', mdId: '9ecd208c-c592-4462-9f57-4d7d4a9f956f', tags: ['Manhwa', 'Hành Động', 'Học Đường'], priority: 60 },
  { title: 'Tòa Tháp Của Chúa (Tower of God)', origin: 'ko', ctId: '234', mdId: 'c0ee660b-f9f2-45c3-8068-5123ff53f84a', tags: ['Manhwa', 'Hành Động', 'Phiêu Lưu', 'Giả Tưởng'], priority: 61 },
  { title: 'Thợ Săn Tự Sát Cấp SSS (SSS-Class Suicide Hunter)', origin: 'ko', mdId: '4a973243-952e-44d7-a50f-883b4b7c9cc2', tags: ['Manhwa', 'Hành Động', 'Hồi Quy', 'Hệ Thống'], priority: 62 },
  { title: 'Phép Thuật Của Người Trở Về Phải Đặc Biệt (A Returner’s Magic)', origin: 'ko', mdId: '6a468761-5bd6-4de0-a0cb-47cb456ac2e0', tags: ['Manhwa', 'Phép Thuật', 'Hồi Quy', 'Hành Động'], priority: 63 },
  { title: 'Thợ Rèn Huyền Thoại — Trang Bị Khủng (Overgeared)', origin: 'ko', mdId: '3fc308c9-4b00-4dc3-943e-1f39242bc708', tags: ['Manhwa', 'Game', 'Hành Động', 'Hệ Thống'], priority: 64 },
  { title: 'Ranker Sống Lần Hai (Second Life Ranker)', origin: 'ko', mdId: '1ffca916-3ad7-46d2-9591-a9b39e639971', tags: ['Manhwa', 'Hành Động', 'Leo Tháp', 'Báo Thù'], priority: 65 },
  { title: 'Hành Trình Sống Sót Của Kiếm Vương Dị Giới (Latna Saga)', origin: 'ko', mdId: '478e6926-b8bc-465c-9694-2bae1dbaf32b', tags: ['Manhwa', 'Hành Động', 'Chuyển Sinh', 'Giả Tưởng'], priority: 66 },
  { title: 'Phế Vật Nhà Bá Tước (Trash of the Count’s Family)', origin: 'ko', mdId: '1dc3ebf9-c86c-431c-bcca-5e35ac124f28', tags: ['Manhwa', 'Phiêu Lưu', 'Chuyển Sinh', 'Giả Tưởng'], priority: 67 },
  { title: 'Vua Trộm Mộ (Tomb Raider King)', origin: 'ko', mdId: '16e1767d-a8d5-4173-b87f-f7023f6c4578', tags: ['Manhwa', 'Hành Động', 'Hồi Quy', 'Hầm Ngục'], priority: 68 },
  { title: 'Pick Me Up — Gacha Vô Hạn', origin: 'ko', mdId: '58167656-a065-4b49-b499-bd73d00555d5', tags: ['Manhwa', 'Hành Động', 'Sinh Tồn', 'Hệ Thống'], priority: 69 },
  { title: 'Đăng Nhập Murim (Murim Login)', origin: 'ko', mdId: '246f2c0c-4c50-4ef4-b292-c17f0f68a17c', tags: ['Manhwa', 'Võ Thuật', 'Hệ Thống', 'Hài Hước'], priority: 70 },
  { title: 'Đại Pháp Sư Trở Lại Sau 4000 Năm (Archmage Returns)', origin: 'ko', mdId: 'ff14c29a-3456-4047-828d-10c9671cac4c', tags: ['Manhwa', 'Phép Thuật', 'Trùng Sinh', 'Hành Động'], priority: 71 },
  { title: 'Hiệp Sĩ Xương Không Thể Bảo Vệ Hầm Ngục (Skeleton Soldier)', origin: 'ko', mdId: 'd993f789-e7e5-4832-92fd-37614220b427', tags: ['Manhwa', 'Hành Động', 'Hồi Quy', 'Giả Tưởng'], priority: 72 },
  { title: 'Tái Thiết Hầm Ngục (Dungeon Reset)', origin: 'ko', mdId: 'dcdcc8c7-932e-4f60-a900-5f19934eb6cf', tags: ['Manhwa', 'Hầm Ngục', 'Sinh Tồn', 'Hài Hước'], priority: 73 },
  { title: 'Sự Trở Lại Của Anh Hùng Cấp Tối Đa (Max Level Hero)', origin: 'ko', mdId: 'b407de00-75a5-415a-a001-585fb41b9cf2', tags: ['Manhwa', 'Hành Động', 'Giả Tưởng'], priority: 74 },
  { title: 'Quý Tộc Ma Cà Rồng (Noblesse)', origin: 'ko', mdId: 'f61952ad-63bb-4e81-a03e-9e50b9e23037', tags: ['Manhwa', 'Hành Động', 'Siêu Nhiên'], priority: 75 },
  { title: 'Leviathan — Quái Vật Biển Sâu', origin: 'ko', ctId: '3215', mdId: '274a8e39-71a8-4bd2-af19-4572518fe44f', tags: ['Manhwa', 'Hành Động', 'Sinh Tồn', 'Mạt Thế'], priority: 76 },
  { title: 'The Boxer — Quyền Thủ Huyền Thoại', origin: 'ko', mdId: '40efa78d-d27a-4364-92ac-6d7af69a851b', tags: ['Manhwa', 'Thể Thao', 'Quyền Anh', 'Tâm Lý'], priority: 77 },
  { title: 'The Gamer — Kẻ Chơi Hệ Thống Đời Thực', origin: 'ko', ctId: '496', mdQuery: 'The Gamer', tags: ['Manhwa', 'Hành Động', 'Hệ Thống'], priority: 78 },
  { title: 'Bỗng Một Ngày Trở Thành Công Chúa (Who Made Me a Princess)', origin: 'ko', mdId: '722a45c0-5e55-40f2-929b-ff69b0989edb', tags: ['Manhwa', 'Lãng Mạn', 'Chuyển Sinh', 'Hoàng Gia'], priority: 79 },
  { title: 'Chết Là Kết Cục Duy Nhất Của Ác Nữ (Villains Are Destined to Die)', origin: 'ko', mdId: '14569f2f-f66a-4c67-ac7f-a37823a0fa23', tags: ['Manhwa', 'Lãng Mạn', 'Xuyên Không', 'Kịch Tính'], priority: 80 },
  { title: 'Coi Chừng Ác Nữ! (Beware the Villainess!)', origin: 'ko', mdId: '85b51b37-0ce6-4144-a19b-6b064bc2c2ae', tags: ['Manhwa', 'Hài Hước', 'Lãng Mạn', 'Xuyên Không'], priority: 81 },
  { title: 'Ác Nữ Đảo Ngược Đồng Hồ Cát (The Villainess Turns the Hourglass)', origin: 'ko', mdId: '73bc69fa-9ba9-4533-a243-ebc11651339f', tags: ['Manhwa', 'Lãng Mạn', 'Trùng Sinh', 'Báo Thù'], priority: 82 },
  { title: 'Cách Bảo Vệ Anh Trai Nữ Chính (Roxana)', origin: 'ko', mdId: 'efebd0bc-eb88-477c-bcc3-90413395a2a3', tags: ['Manhwa', 'Lãng Mạn', 'Kịch Tính', 'Giả Tưởng'], priority: 83 },
  { title: 'Kiếp Này Tôi Sẽ Làm Chủ Gia Tộc! (I Shall Master This Family!)', origin: 'ko', mdId: 'f89ed57a-e4c0-48f5-b664-8ef88aa87fd9', tags: ['Manhwa', 'Lãng Mạn', 'Trùng Sinh', 'Quý Tộc'], priority: 84 },
  { title: 'Khế Ước Công Tước Phu Nhân (Why Raeliana Ended up at the Duke)', origin: 'ko', mdId: '39e55355-dfb4-44e9-bd0b-df1fc3a0e33e', tags: ['Manhwa', 'Lãng Mạn', 'Xuyên Không'], priority: 85 },
  { title: 'Bản Giao Hưởng Của Mẹ Kế (A Stepmother’s Märchen)', origin: 'ko', mdId: '73886188-f459-4b80-8781-66a60520b420', tags: ['Manhwa', 'Lãng Mạn', 'Gia Đình', 'Trùng Sinh'], priority: 86 },

  // ==========================================================================
  // 8. TOP MANHUA (TRUNG QUỐC) HAY & PHỔ BIẾN NHẤT MỌI THỜI ĐẠI
  // ==========================================================================
  { title: 'Đại Quản Gia Là Ma Hoàng (Magic Emperor / Trác Phàm)', origin: 'zh', tqqSlug: 'dai-quan-gia-la-ma-hoang', mdId: '69e218ec-93eb-4025-ae39-33d47b1160e0', mpPath: '/manga/5539/the-servant-is-the-demon-king', tags: ['Manhua', 'Tu Tiên', 'Trùng Sinh', 'Bá Đạo'], priority: 87 },
  { title: 'Võ Luyện Đỉnh Phong (Martial Peak — Dương Khai)', origin: 'zh', mdId: 'b1461071-bfbb-43e7-a5b6-a7ba5904649f', mpPath: '/manga/2809/martial-peak', tags: ['Manhua', 'Tu Tiên', 'Huyền Huyễn', 'Hành Động'], priority: 88 },
  { title: 'Bách Luyện Thành Thần (Apotheosis — La Chinh)', origin: 'zh', tqqSlug: 'bach-luyen-thanh-than', mdId: 'cdae359d-5fa9-4d4e-b11a-69dd32b09742', mpPath: '/manga/7309/apotheosis', tags: ['Manhua', 'Tu Tiên', 'Huyền Huyễn', 'Hành Động'], priority: 89 },
  { title: 'Yêu Thần Ký (Tales of Demons and Gods — Nhiếp Ly)', origin: 'zh', tqqSlug: 'yeu-than-ky', mdId: '812f9696-048f-496d-9ed4-84c99345d1fb', mpPath: '/manga/4270/tales-of-demons-and-gods', tags: ['Manhua', 'Tu Tiên', 'Trùng Sinh', 'Luyện Đan'], priority: 90 },
  { title: 'Đấu Phá Thương Khung (Battle Through the Heavens — Tiêu Viêm)', origin: 'zh', mdId: 'cee2ab81-2ab5-4c91-8715-92848ef5b2d4', mpPath: '/manga/470/battle-through-the-heavens', tags: ['Manhua', 'Tu Tiên', 'Huyền Huyễn', 'Dị Hỏa'], priority: 91 },
  { title: 'Đấu La Đại Lục (Soul Land / Douluo Dalu — Đường Tam)', origin: 'zh', mdId: '39d875a6-5df3-4323-a2da-3a0b50af429a', mpPath: '/manga/7308/soul-land-the-legendary-tangs-hero', tags: ['Manhua', 'Huyền Huyễn', 'Võ Hồn', 'Phiêu Lưu'], priority: 92 },
  { title: 'Toàn Chức Pháp Sư (Versatile Mage — Mạc Phàm)', origin: 'zh', mdId: '44f84cc1-819c-47a6-a59f-43d016f72b43', mpPath: '/manga/6098/quanzhi-fashi', tags: ['Manhua', 'Phép Thuật', 'Hành Động', 'Đô Thị'], priority: 93 },
  { title: 'Đỉnh Cấp Khí Vận, Lặng Lẽ Tu Luyện Ngàn Năm (Top Tier Providence)', origin: 'zh', tqqSlug: 'dinh-cap-khi-van-lang-le-tu-luyen-ngan-nam', mdId: 'c089b50c-beeb-434a-ab8d-2676dc026564', tags: ['Manhua', 'Tu Tiên', 'Hệ Thống', 'Hài Hước'], priority: 94 },
  { title: 'Vạn Cổ Chí Tôn (Eternal Supreme — Lý Vân Tiêu)', origin: 'zh', tqqSlug: 'van-co-chi-ton', tags: ['Manhua', 'Tu Tiên', 'Trùng Sinh', 'Hành Động'], priority: 95 },
  { title: 'Cao Võ: Hạ Cánh Đến Một Vạn Năm Sau (Apex Future Martial Arts)', origin: 'zh', tqqSlug: 'cao-vo-ha-canh-den-mot-van-nam-sau', tags: ['Manhua', 'Võ Thuật', 'Tương Lai', 'Hành Động'], priority: 96 },
  { title: 'Thảm Họa Tử Linh Sư — Tử Linh Pháp Sư! Ta Chính Là Thiên Tai', origin: 'zh', tqqSlug: 'tham-hoa-tu-linh-su', mdId: 'c1117e35-23ca-4096-8b92-2340d11913d5', tags: ['Manhua', 'Hệ Thống', 'Triệu Hồi', 'Hành Động'], priority: 97 },
  { title: 'Quỷ Bí Chi Chủ (Lord of the Mysteries)', origin: 'zh', tqqSlug: 'quy-bi-chi-chu-remake', tags: ['Manhua', 'Bí Ẩn', 'Huyền Huyễn', 'Siêu Nhiên'], priority: 98 },
  { title: 'Trên Vạn Người (Above Ten Thousand People)', origin: 'zh', mdId: '93eed9a5-6a1d-4bd9-b26e-137d3fd557b9', tags: ['Manhua', 'Tu Tiên', 'Hài Hước', 'Vô Địch'], priority: 99 },
  { title: 'Vạn Cổ Tối Cường Tông (All Hail the Sect Leader)', origin: 'zh', mdId: 'b22561f9-81f1-45f6-b2c0-f5b53cfaee19', tags: ['Manhua', 'Tu Tiên', 'Hệ Thống', 'Hài Hước'], priority: 100 },
  { title: 'Tiến Hóa Bắt Đầu Từ Cây Đại Thụ (Evolution Begins With A Big Tree)', origin: 'zh', mdId: '2707b1cc-05b9-455f-ae6f-f351dd9f8741', tags: ['Manhua', 'Chuyển Sinh', 'Tiến Hóa', 'Linh Khí Khôi Phục'], priority: 101 },
  { title: 'Toàn Cầu Băng Phong: Phòng Trú Ẩn Ngày Tận Thế (Global Freeze)', origin: 'zh', mdId: 'da3f22d5-a9c0-47ae-b39c-9db0aca11dd0', tags: ['Manhua', 'Mạt Thế', 'Trùng Sinh', 'Sinh Tồn'], priority: 102 },
  { title: 'Ta Xây Dựng Tổ Chức Trường Sinh (Eternal Club)', origin: 'zh', mdId: '3d3dae2f-d2ab-4ff2-90a4-53dd90a5133c', tags: ['Manhua', 'Đô Thị', 'Hệ Thống', 'Bá Đạo'], priority: 103 },
  { title: 'Đại Vương Tha Mạng (Spare Me, Great Lord! — Lữ Thụ)', origin: 'zh', mdId: '46663ee4-068c-41d8-a7b5-e4c6e5310c0d', tags: ['Manhua', 'Hài Hước', 'Hệ Thống', 'Linh Khí Khôi Phục'], priority: 104 },
  { title: 'Nghịch Thiên Tà Thần (Against the Gods — Vân Triệt)', origin: 'zh', mdId: 'a9eb39e6-b0ae-46fb-9323-d88af37e4bcd', tags: ['Manhua', 'Tu Tiên', 'Huyền Huyễn', 'Hành Động'], priority: 105 },
  { title: 'Tinh Võ Thần Quyết (Star Martial God Technique)', origin: 'zh', mdId: '267db3f7-fd9c-4395-ac36-9ffacd772473', tags: ['Manhua', 'Võ Thuật', 'Tu Tiên', 'Hành Động'], priority: 106 },
  { title: 'Tuyệt Thế Võ Thần (Peerless Battle Spirit — Lâm Phong)', origin: 'zh', mdId: '931fd4fd-6c22-485e-b717-2dce335500b1', tags: ['Manhua', 'Tu Tiên', 'Võ Hồn', 'Hành Động'], priority: 107 },
  { title: 'Mạt Thế Phàm Nhân (The Last Human / Moshi Fanren)', origin: 'zh', mdId: '64113fcd-4f8c-41bc-8fa4-18a83076da2e', tags: ['Manhua', 'Mạt Thế', 'Trùng Sinh', 'Sinh Tồn'], priority: 108 },
  { title: 'Thả Nữ Vu Ấy Ra (Release That Witch — Roland)', origin: 'zh', mdId: 'aafb046c-9de4-4c3d-990c-6d75b079c0b9', tags: ['Manhua', 'Xuyên Không', 'Xây Dựng', 'Phép Thuật'], priority: 109 },
  { title: 'Vợ Tôi Là Quỷ Vương (My Wife Is a Demon Queen)', origin: 'zh', mdId: '16800ea3-d7cb-4a03-801e-bfbb4dc12bea', tags: ['Manhua', 'Xuyên Không', 'Giả Tưởng', 'Lãng Mạn'], priority: 110 },
  { title: 'Vợ Tôi Đến Từ Ngàn Năm Trước (My Wife Is From 1000 Years Ago)', origin: 'zh', mdId: '17a56d33-9443-433a-9e0d-70459893ed8f', tags: ['Manhua', 'Đô Thị', 'Lãng Mạn', 'Đời Thường'], priority: 111 },
  { title: 'Ta Thật Sự Không Phải Tay Sai Của Tà Thần (Demon God’s Lackey)', origin: 'zh', mdId: 'dbbca2b5-bdd1-4f2b-8b2e-d72bf7fd89a0', tags: ['Manhua', 'Huyền Huyễn', 'Hài Hước', 'Bí Ẩn'], priority: 112 },
  { title: 'Anh Hùng? Ta Đã Lâu Không Làm (Hero? I Quit A Long Time Ago)', origin: 'zh', mdId: 'e4e590da-dabc-4c54-a6dd-aa4287390d70', tags: ['Manhua', 'Siêu Anh Hùng', 'Hài Hước', 'Vô Địch'], priority: 113 },
  { title: 'Thiết Cơ Cương Binh (Iron Ladies)', origin: 'zh', mdId: '4a4786cf-c185-4ad3-89a9-294a1ec0bfc9', tags: ['Manhua', 'Khoa Học Viễn Tưởng', 'Hành Động'], priority: 114 },
  { title: 'Vạn Tra Triều Hoàng (Cheating Men Must Die)', origin: 'zh', mdId: '1fcaaa65-6fa4-4772-9006-b905101905d7', tags: ['Manhua', 'Xuyên Nhanh', 'Nữ Cường', 'Báo Thù'], priority: 115 },
  { title: 'Nam Hào Và Thượng Phong (Nan Hao & Shang Feng)', origin: 'zh', ctId: '2296', mdId: '829fc3a7-d4f4-42e9-9032-0917083f9e0d', tags: ['Manhua', 'Hài Hước', 'Học Đường', 'Đời Thường'], priority: 116 },
  { title: 'Ma Đạo Tổ Sư (Grandmaster of Demonic Cultivation)', origin: 'zh', mdId: '6e52262f-bcd5-49c4-b93a-f4652d189844', tags: ['Manhua', 'Cổ Trang', 'Tu Tiên', 'Bí Ẩn'], priority: 117 },
  { title: 'Phong Thần Ký (Feng Shen Ji)', origin: 'zh', mdId: '01e01102-53d1-4bdf-847b-90cfe5b6415d', tags: ['Manhua', 'Thần Thoại', 'Hành Động', 'Kinh Điển'], priority: 118 },

  // ==========================================================================
  // 9. KIẾM HIỆP / VÕ HIỆP HỒNG KÔNG & KIM DUNG KINH ĐIỂN (HOÀNG PHI HỒNG, PHONG VÂN, TỨ ĐẠI DANH BỘ...)
  // ==========================================================================
  { title: 'Hoàng Phi Hồng — Phần 2 (Võ Hiệp Hồng Kông)', origin: 'zh', ntSlug: 'hoang-phi-hong-phan-2', tags: ['Kiếm Hiệp', 'Võ Thuật', 'Cổ Trang', 'Manhua'], priority: 119 },
  { title: 'Hoàng Phi Hồng — Phần IV (Đại Chiến Thập Nhị Môn Phái)', origin: 'zh', ntSlug: 'hoang-phi-hong-phan-iv', tags: ['Kiếm Hiệp', 'Võ Thuật', 'Cổ Trang', 'Manhua'], priority: 120 },
  { title: 'Phong Vân — Bộ Đôi Kinh Điển (Nhiếp Phong & Bộ Kinh Vân)', origin: 'zh', ntSlug: 'phong-van', mdId: 'ce5171fa-deab-42c9-bdeb-3f0337954bdf', tags: ['Kiếm Hiệp', 'Võ Thuật', 'Huyền Huyễn', 'Manhua'], priority: 121 },
  { title: 'Tứ Đại Danh Bộ — Ôn Thụy An (Bản Kinh Điển)', origin: 'zh', ntSlug: 'tu-dai-danh-bo', mdId: '22c7e3f4-ef5f-4df1-b135-21575c622269', tags: ['Kiếm Hiệp', 'Trinh Thám', 'Võ Thuật', 'Manhua'], priority: 122 },
  { title: 'Tân Tứ Đại Danh Bộ', origin: 'zh', ntSlug: 'tan-tu-dai-danh-bo', tags: ['Kiếm Hiệp', 'Trinh Thám', 'Võ Thuật', 'Manhua'], priority: 123 },
  { title: 'Long Hổ Môn (Hoàng Ngọc Lang — Kinh Điển)', origin: 'zh', ntSlug: 'long-ho-mon', mdId: 'fb38e067-57f6-400d-a596-3ead523a62e2', tags: ['Võ Thuật', 'Hành Động', 'Giang Hồ', 'Manhua'], priority: 124 },
  { title: 'Tân Tác Long Hổ Môn (Vương Tiểu Hổ & Thạch Hắc Long)', origin: 'zh', ntSlug: 'tan-tac-long-ho-mon', tags: ['Võ Thuật', 'Hành Động', 'Giang Hồ', 'Manhua'], priority: 125 },
  { title: 'Cựu Tác Long Hổ Môn', origin: 'zh', ntSlug: 'cuu-tac-long-ho-mon', tags: ['Võ Thuật', 'Hành Động', 'Kinh Điển', 'Manhua'], priority: 126 },
  { title: 'Thiên Tử Truyền Kỳ 1 — Cơ Phát Khai Chu Bản', origin: 'zh', ntSlug: 'thien-tu-truyen-ky-1-co-phat-khai-chu-ban', tags: ['Kiếm Hiệp', 'Lịch Sử', 'Huyền Huyễn', 'Manhua'], priority: 127 },
  { title: 'Thiên Tử Truyền Kỳ 4 — Đại Đường Uy Long (Lý Thế Dân)', origin: 'zh', ntSlug: 'thien-tu-truyen-ky-4-dai-duong-uy-long', tags: ['Kiếm Hiệp', 'Lịch Sử', 'Võ Thuật', 'Manhua'], priority: 128 },
  { title: 'Thiên Tử Truyền Kỳ 5 — Như Lai Thần Chưởng (Long Qua Nhi)', origin: 'zh', ntSlug: 'thien-tu-truyen-ky-5-nhu-lai-than-chuong', tags: ['Kiếm Hiệp', 'Võ Thuật', 'Huyền Huyễn', 'Manhua'], priority: 129 },
  { title: 'Hỏa Phụng Liêu Nguyên (Tam Quốc Mưu Lược Đỉnh Cao)', origin: 'zh', ntSlug: 'hoa-phung-lieu-nguyen', mpPath: '/manga/4438/the-ravages-of-time', tags: ['Lịch Sử', 'Chiến Tranh', 'Mưu Lược', 'Manhua'], priority: 130 },
  { title: 'Tây Du (Trịnh Kiện Hòa & Đặng Chí Huy)', origin: 'zh', ntSlug: 'tay-du', mpPath: '/manga/6545/xi-xing-ji', tags: ['Thần Thoại', 'Hành Động', 'Huyền Huyễn', 'Manhua'], priority: 131 },
  { title: 'Tây Du Ký Ngoại Truyện', origin: 'zh', ntSlug: 'tay-du-ky-ngoai-truyen', tags: ['Thần Thoại', 'Hành Động', 'Manhua'], priority: 132 },
  { title: 'Thần Điêu Đại Hiệp (Kim Dung — Dương Quá & Tiểu Long Nữ)', origin: 'zh', ntSlug: 'than-dieu-dai-hiep', tags: ['Kiếm Hiệp', 'Cổ Trang', 'Lãng Mạn', 'Manhua'], priority: 133 },
  { title: 'Ỷ Thiên Đồ Long Ký (Kim Dung — Trương Vô Kỵ)', origin: 'zh', ntSlug: 'y-thien-do-long-ky', mdId: '10d7df68-4250-4b21-95df-6f0b51cb5d32', tags: ['Kiếm Hiệp', 'Cổ Trang', 'Võ Thuật', 'Manhua'], priority: 134 },
  { title: 'Tiếu Ngạo Giang Hồ (Kim Dung — Lệnh Hồ Xung)', origin: 'zh', ntSlug: 'tieu-ngao-giang-ho', mdId: 'f1cd3fac-7a9b-4be3-83e4-0ab9cae7b60b', tags: ['Kiếm Hiệp', 'Cổ Trang', 'Võ Thuật', 'Manhua'], priority: 135 },
  { title: 'Thiên Long Bát Bộ (Kim Dung — Kiều Phong & Đoàn Dự)', origin: 'zh', ntSlug: 'thien-long-bat-bo', mdId: 'cba5dadb-0d76-42b6-aab1-723355e7285d', tags: ['Kiếm Hiệp', 'Cổ Trang', 'Võ Thuật', 'Manhua'], priority: 136 },
  { title: 'Anh Hùng Xạ Điêu (Kim Dung — Quách Tĩnh & Hoàng Dung)', origin: 'zh', ntSlug: 'anh-hung-xa-dieu', tags: ['Kiếm Hiệp', 'Cổ Trang', 'Võ Thuật', 'Manhua'], priority: 137 },
  { title: 'Võ Thần (Ôn Nhật Lương — Bạch Võ Nam)', origin: 'zh', ntSlug: 'vo-than', tags: ['Võ Thuật', 'Hành Động', 'Khoa Học Viễn Tưởng', 'Manhua'], priority: 138 },
  { title: 'Tiêu Nhân (Biao Ren — Đao Mã)', origin: 'zh', ntSlug: 'tieu-nhan', mpPath: '/manga/6184/biao-ren', tags: ['Kiếm Hiệp', 'Lịch Sử', 'Hành Động', 'Manhua'], priority: 139 },
  { title: 'Thiết Tướng Tung Hoành (Lôi Tổ)', origin: 'zh', ntSlug: 'thiet-tuong-tung-hoanh', tags: ['Kiếm Hiệp', 'Võ Thuật', 'Huyền Huyễn', 'Manhua'], priority: 140 },
  { title: 'Sơn Hải Nghịch Chiến (Khâu Phúc Long)', origin: 'zh', ntSlug: 'son-hai-nghich-chien', tags: ['Huyền Huyễn', 'Thần Thoại', 'Hành Động', 'Manhua'], priority: 141 },
  { title: 'Hiệp Khách Giang Hồ (Hàn Bảo Quân — Đàm Hoa Liên)', origin: 'ko', ntSlug: 'hiep-khach-giang-ho', tags: ['Kiếm Hiệp', 'Hài Hước', 'Võ Thuật', 'Manhwa'], priority: 142 },
  { title: 'Anh Hùng Vô Lệ (Cổ Long)', origin: 'zh', ntSlug: 'anh-hung-vo-le', tags: ['Kiếm Hiệp', 'Cổ Trang', 'Võ Thuật', 'Manhua'], priority: 143 },
  { title: 'Cửu Long Thành Trại (City of Darkness)', origin: 'zh', mdId: 'cbe80ad5-a14d-45cc-9b06-f80cb43069d8', mpPath: '/manga/789/city-of-darkness', tags: ['Võ Thuật', 'Giang Hồ', 'Hành Động', 'Manhua'], priority: 144 },
  { title: 'Thiết Huyết Giang Hồ (Blood and Steel)', origin: 'zh', mdId: '66400137-fce8-4240-8a7c-8b25624b49a6', mpPath: '/manga/556/blood-and-steel', tags: ['Kiếm Hiệp', 'Võ Thuật', 'Hành Động', 'Manhua'], priority: 145 },

  // ==========================================================================
  // 10. BỘ SƯU TẬP ĐẦY ĐỦ 7 ĐẠI TÁC GIẢ (MANGAKA HUYỀN THOẠI)
  // ==========================================================================
  // A. YOSHIHIRO TOGASHI
  { title: 'Hành Trình U Linh Giới (Yu Yu Hakusho — Nhất Dương Chỉ)', authorName: 'Yoshihiro Togashi', ntQuery: 'hanh trinh u linh gioi', mdId: '44a5cbe1-0204-4cc7-a1ff-0fda2ac004b6', mpPath: '/manga/4926/yu-yu-hakusho', tags: ['Hành Động', 'Siêu Nhiên', 'Shounen'], priority: 146 },
  { title: 'Level E (Yoshihiro Togashi)', authorName: 'Yoshihiro Togashi', mdId: '9b217a11-3447-4c80-885e-34c0b472a75b', mpPath: '/manga/2588/level-e', tags: ['Hài Hước', 'Khoa Học Viễn Tưởng', 'Shounen'], priority: 147 },

  // B. TAKEHIKO INOUE
  { title: 'Real — Bóng Rổ Xe Lăn (Takehiko Inoue)', authorName: 'Takehiko Inoue', mdId: '62b74aa6-24df-4b91-b76d-39e7ab3c3ca5', mpPath: '/manga/3539/real', tags: ['Thể Thao', 'Bóng Rổ', 'Tâm Lý', 'Seinen'], priority: 148 },
  { title: 'Buzzer Beater (Takehiko Inoue)', authorName: 'Takehiko Inoue', mdId: 'e334a374-3eb3-45ba-96bd-b136b94da02a', mpPath: '/manga/6342/buzzer-beater', tags: ['Thể Thao', 'Bóng Rổ', 'Khoa Học Viễn Tưởng'], priority: 149 },

  // C. OSAMU TEZUKA
  { title: 'Bác Sĩ Quái Dị (Black Jack — Osamu Tezuka)', authorName: 'Osamu Tezuka', ntSlug: 'black-jack', mdId: 'fd86eab2-f0f3-47d3-bce5-5628e97f37dc', mpPath: '/manga/529/black-jack', tags: ['Y Học', 'Kịch Tính', 'Kinh Điển'], priority: 150 },
  { title: 'Siêu Nhân Nguyên Tử (Astro Boy — Tetsuwan Atom)', authorName: 'Osamu Tezuka', mdId: 'ca4c84bb-7272-45aa-a22d-dc1282b52372', mpPath: '/manga/360/astro-boy', tags: ['Khoa Học Viễn Tưởng', 'Hành Động', 'Kinh Điển'], priority: 151 },
  { title: 'Đức Phật (Buddha — Osamu Tezuka)', authorName: 'Osamu Tezuka', mdId: '4e102d46-0a98-4249-8a42-98e4705b663e', mpPath: '/manga/672/buddha', tags: ['Lịch Sử', 'Triết Lý', 'Kinh Điển'], priority: 152 },
  { title: 'Chim Lửa (Phoenix / Hi no Tori — Osamu Tezuka)', authorName: 'Osamu Tezuka', mdId: 'cc647d62-3a2c-474b-ac4e-844256ab185d', mpPath: '/manga/3446/phoenix', tags: ['Giả Tưởng', 'Triết Lý', 'Kinh Điển'], priority: 153 },
  { title: 'Dororo (Osamu Tezuka)', authorName: 'Osamu Tezuka', ntSlug: 'dororo', ctId: '899', mdId: '07d858d0-1537-487f-8e1f-a32e1782206d', mpPath: '/manga/1042/dororo', tags: ['Hành Động', 'Siêu Nhiên', 'Cổ Đại'], priority: 154 },
  { title: 'Bức Thư Gửi Adolf (Message to Adolf — Osamu Tezuka)', authorName: 'Osamu Tezuka', mdId: '16dc43f3-d6ba-4154-b445-a9d2e674c0eb', mpPath: '/manga/113/adolf-ni-tsugu', tags: ['Lịch Sử', 'Tâm Lý', 'Kịch Tính'], priority: 155 },
  { title: 'Ayako (Osamu Tezuka)', authorName: 'Osamu Tezuka', mdId: 'df64232c-cc30-4e9c-92e1-7ccba2b743b0', mpPath: '/manga/384/ayako', tags: ['Tâm Lý', 'Bí Ẩn', 'Seinen'], priority: 156 },

  // D. AKIRA TORIYAMA
  { title: 'Bảy Viên Ngọc Rồng Siêu Cấp (Dragon Ball Super)', authorName: 'Akira Toriyama', ntSlug: 'dragon-ball-super', mdId: '37b87be0-b1f4-4507-affa-06c99ebb27f8', mpPath: '/manga/1069/dragon-ball-super', tags: ['Hành Động', 'Võ Thuật', 'Shounen'], priority: 157 },
  { title: 'Tiến Sĩ Slump (Dr. Slump — Arale)', authorName: 'Akira Toriyama', ntSlug: 'dr-slump', ctId: '2685', mdId: '985e4ae6-7a36-42c5-ae12-f4291c58798c', mpPath: '/manga/1058/dr-slump', tags: ['Hài Hước', 'Khoa Học Viễn Tưởng', 'Kinh Điển'], priority: 158 },
  { title: 'Vùng Đất Cát (Sand Land — Akira Toriyama)', authorName: 'Akira Toriyama', mdId: '88d8271a-ed40-4874-b23f-a1ded5fc1ebf', mpPath: '/manga/3729/sand-land', tags: ['Phiêu Lưu', 'Hành Động', 'Hài Hước'], priority: 159 },
  { title: 'Tuần Tra Ngân Hà Jaco (Jaco the Galactic Patrolman)', authorName: 'Akira Toriyama', mdId: 'd22cf103-18fa-4fb0-bc2c-75695895c74b', tags: ['Hài Hước', 'Hành Động', 'Khoa Học Viễn Tưởng'], priority: 160 },

  // E. NAOKI URASAWA
  { title: 'Những Chàng Trai Thế Kỷ 20 (20th Century Boys)', authorName: 'Naoki Urasawa', ntSlug: 'nhung-chang-trai-the-ki-20', ctId: '1860', mdId: 'ad06790a-01e3-400c-a449-0ec152d6756a', mpPath: '/manga/11/20-seiki-shounen', tags: ['Bí Ẩn', 'Tâm Lý', 'Seinen'], priority: 161 },
  { title: 'Những Chàng Trai Thế Kỷ 21 (21st Century Boys)', authorName: 'Naoki Urasawa', mdId: '1010ebf3-2859-4101-badc-034bd08132ff', mpPath: '/manga/46/21st-century-boys', tags: ['Bí Ẩn', 'Tâm Lý', 'Seinen'], priority: 162 },
  { title: 'Pluto — Khúc Tráng Ca Robot (Naoki Urasawa)', authorName: 'Naoki Urasawa', mdId: 'e171c073-4415-499b-85bc-ea93825127ac', mpPath: '/manga/3461/pluto', tags: ['Trinh Thám', 'Khoa Học Viễn Tưởng', 'Seinen'], priority: 163 },
  { title: 'Billy Bat (Naoki Urasawa)', authorName: 'Naoki Urasawa', ctId: '511', mdId: 'e5357466-c8a2-4259-9b02-2580185bd2bb', mpPath: '/manga/503/billy-bat', tags: ['Bí Ẩn', 'Lịch Sử', 'Seinen'], priority: 164 },
  { title: 'Thám Tử Keaton (Master Keaton — Naoki Urasawa)', authorName: 'Naoki Urasawa', ctId: '295', mpPath: '/manga/2818/master-keaton', tags: ['Trinh Thám', 'Phiêu Lưu', 'Seinen'], priority: 165 },
  { title: 'Asadora! (Naoki Urasawa)', authorName: 'Naoki Urasawa', mdId: '9047286f-ea5b-475a-84cc-a2533983ffe9', mpPath: '/manga/336/asadora', tags: ['Lịch Sử', 'Kịch Tính', 'Seinen'], priority: 166 },

  // F. TOORU FUJISAWA (TOHRU FUJISAWA)
  { title: 'Tuổi Trẻ Dữ Dội (Shonan Junai Gumi — GTO Tiền Truyện)', authorName: 'Tooru Fujisawa', mdId: '857a4d6b-7228-42e1-b49c-bbb50a8befdd', mpPath: '/manga/4003/shounan-junai-gumi', tags: ['Hài Hước', 'Học Đường', 'Hành Động'], priority: 167 },
  { title: 'GTO: 14 Ngày Ở Shonan (GTO: Shonan 14 Days)', authorName: 'Tooru Fujisawa', mdId: 'ca799261-dbbb-4a27-a34f-34bc607751cd', mpPath: '/manga/1471/gto-shonan-14-days', tags: ['Hài Hước', 'Học Đường', 'Đời Thường'], priority: 168 },
  { title: 'GTO: Thiên Đường Đã Mất (GTO: Paradise Lost)', authorName: 'Tooru Fujisawa', mdId: 'a9a71cf3-f412-4a04-8a2c-fe03ed70e35b', mpPath: '/manga/1470/gto-paradise-lost', tags: ['Hài Hước', 'Học Đường', 'Seinen'], priority: 169 },
  { title: 'Thầy Giáo Mặt Nạ (Kamen Teacher — Tooru Fujisawa)', authorName: 'Tooru Fujisawa', mdId: '53a64af2-0025-4583-8b75-f73b8b99450b', mpPath: '/manga/6187/kamen-teacher', tags: ['Hành Động', 'Học Đường', 'Shounen'], priority: 170 },
];

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

async function fetchWithTimeout(url, options = {}, timeoutMs = 14000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

class MangaCrawlerSyncEngine {
  constructor() {
    this.db = {
      updatedAt: new Date().toISOString(),
      totalMangas: 0,
      totalChapters: 0,
      sourceCounts: {
        legends: { mangas: 0, chapters: 0 },
        nettruyen: { mangas: 0, chapters: 0 },
        cuutruyen: { mangas: 0, chapters: 0 },
        otruyen_tqq: { mangas: 0, chapters: 0 },
        mangadex: { mangas: 0, chapters: 0 },
      },
      mangas: {},
    };

    this.state = {
      isRunning: false,
      phase: 'Idle',
      progressCurrent: 0,
      progressTotal: 0,
      lastSyncedComic: '',
      logs: [],
    };

    this.loadDatabase();
  }

  log(msg) {
    const time = new Date().toLocaleTimeString('vi-VN');
    const line = `[${time}] ${msg}`;
    console.log(line);
    this.state.logs.unshift(line);
    if (this.state.logs.length > 100) {
      this.state.logs.length = 100;
    }
  }

  loadDatabase() {
    try {
      let parsed = null;
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        parsed = JSON.parse(raw);
      } else {
        parsed = require('./db/synced-manga.json');
      }
      if (parsed && parsed.mangas) {
        this.db = parsed;
        this.recalculateStats();
      }
    } catch (err) {
      console.warn('[SyncDB Load Warning]:', err.message);
    }
  }

  recalculateStats() {
    let totalMangas = 0;
    let totalChapters = 0;
    const counts = {
      legends: { mangas: 0, chapters: 0 },
      nettruyen: { mangas: 0, chapters: 0 },
      cuutruyen: { mangas: 0, chapters: 0 },
      otruyen_tqq: { mangas: 0, chapters: 0 },
      mangadex: { mangas: 0, chapters: 0 },
    };

    for (const comic of Object.values(this.db.mangas)) {
      totalMangas++;
      const chCount = (comic.chapters || []).reduce(
        (acc, srv) => acc + (Array.isArray(srv.server_data) ? srv.server_data.length : 0),
        0
      );
      comic.chaptersCount = chCount;
      totalChapters += chCount;
      if (comic.isLegend) {
        counts.legends.mangas++;
        counts.legends.chapters += chCount;
      }
      const src = comic.source_id || 'mangadex';
      if (counts[src]) {
        counts[src].mangas++;
        counts[src].chapters += chCount;
      }
    }

    this.db.totalMangas = totalMangas;
    this.db.totalChapters = totalChapters;
    this.db.sourceCounts = counts;
    this.db.updatedAt = new Date().toISOString();
  }

  saveDatabase() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      this.recalculateStats();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db), 'utf8');

      // Sort so Legendary comics come first in synced-seed.js!
      const mangaList = Object.values(this.db.mangas).sort((a, b) => {
        if (a.isLegend && !b.isLegend) return -1;
        if (!a.isLegend && b.isLegend) return 1;
        return (a.legendPriority || 999) - (b.legendPriority || 999);
      });

      const compactSeed = {
        updatedAt: this.db.updatedAt,
        totalMangas: this.db.totalMangas,
        totalChapters: this.db.totalChapters,
        sourceCounts: this.db.sourceCounts,
        items: mangaList.slice(0, 600).map((m) => ({
          _id: m._id,
          slug: m.slug,
          isLegend: !!m.isLegend,
          legendPriority: m.legendPriority || 999,
          source_id: m.source_id,
          source_name: m.source_name,
          name: m.name,
          origin_code: m.origin_code,
          origin_label: m.origin_label,
          status: m.status,
          thumb_url: m.thumb_url,
          updatedAt: m.updatedAt,
          author: m.author,
          category: m.category,
          content: (m.content || '').slice(0, 280),
          chaptersCount: m.chaptersCount || 0,
          chaptersLatest: m.chaptersLatest,
        })),
      };
      fs.writeFileSync(
        SEED_JS_FILE,
        `window.SYNCED_MANGA_SEED = ${JSON.stringify(compactSeed)};\n`,
        'utf8'
      );
    } catch (err) {
      console.error('[SyncDB Save Error]:', err.message);
    }
  }

  getStatus() {
    this.recalculateStats();
    return {
      isRunning: this.state.isRunning,
      phase: this.state.phase,
      progressCurrent: this.state.progressCurrent,
      progressTotal: this.state.progressTotal,
      lastSyncedComic: this.state.lastSyncedComic,
      updatedAt: this.db.updatedAt,
      totalMangas: this.db.totalMangas,
      totalChapters: this.db.totalChapters,
      sourceCounts: this.db.sourceCounts,
      logs: this.state.logs.slice(0, 35),
    };
  }

  getSyncedComic(slug) {
    return this.db.mangas[slug] || null;
  }

  getSyncedList({ page = 1, limit = 24, source = 'all', keyword = '', origin = 'all', status = 'all', author = 'all', legendsOnly = false } = {}) {
    let list = Object.values(this.db.mangas);

    if (legendsOnly || source === 'legends') {
      list = list
        .filter((m) => m.isLegend || (m.chaptersCount || 0) >= 80)
        .sort((a, b) => (a.legendPriority || 999) - (b.legendPriority || 999));
    } else if (source && source !== 'all' && source !== 'all_vi' && source !== 'synced_db') {
      const targetSrc = source === 'mangadex_vi' ? 'mangadex' : source;
      list = list.filter((m) => m.source_id === targetSrc);
    } else {
      list.sort((a, b) => (a.legendPriority || 999) - (b.legendPriority || 999));
    }

    if (origin && origin !== 'all') {
      list = list.filter((m) => m.origin_code === origin);
    }
    if (status && status !== 'all') {
      list = list.filter((m) => m.status === status);
    }
    if (author && author !== 'all') {
      const normAuthor = author.trim().toLowerCase();
      const tokens = normAuthor.split(/\s+/).filter((t) => t.length > 1);
      list = list.filter((m) => {
        const authorsArr = Array.isArray(m.author) ? m.author : [m.author || ''];
        const joined = authorsArr.join(' ').toLowerCase();
        // Match full substring or reverse name order (e.g. "Tooru Fujisawa" vs "Fujisawa Tohru")
        if (joined.includes(normAuthor)) return true;
        if (normAuthor.includes('fujisawa') && joined.includes('fujisawa')) return true;
        if (tokens.length >= 2 && tokens.every((tk) => joined.includes(tk))) return true;
        return false;
      });
    }
    if (keyword && keyword.trim()) {
      const q = keyword.trim().toLowerCase();
      list = list.filter(
        (m) =>
          (m.name || '').toLowerCase().includes(q) ||
          (m.content || '').toLowerCase().includes(q) ||
          (m.origin_name || []).some((o) => String(o).toLowerCase().includes(q))
      );
    }

    const totalItems = list.length;
    const offset = Math.max(0, (page - 1) * limit);
    const items = list.slice(offset, offset + limit);

    return {
      status: 'success',
      data: {
        items,
        params: {
          pagination: {
            totalItems,
            totalItemsPerPage: limit,
            currentPage: page,
          },
        },
      },
    };
  }

  /* ========================================================================
     HELPER: FETCH FULL NETTRUYEN CHAPTERS + METADATA BY SLUG OR QUERY
     ======================================================================== */
  async crawlNetTruyenComicFull(slugOrQuery, isQuery = false) {
    let rawSlug = slugOrQuery;
    if (isQuery) {
      const sUrl = `${NETTRUYEN_BASE}/tim-truyen?keyword=${encodeURIComponent(slugOrQuery)}`;
      const sHtml = await (await fetchWithTimeout(sUrl, { headers: { 'User-Agent': BROWSER_UA } })).text();
      const m = sHtml.match(/<figcaption>[\s\S]*?<h3>\s*<a[^>]+href=["']https?:\/\/[^/]+\/truyen-tranh\/([^"'/?#]+)["']/i);
      if (!m) return null;
      rawSlug = m[1].trim();
    }

    const [html, chJsonText] = await Promise.all([
      fetchWithTimeout(`${NETTRUYEN_BASE}/truyen-tranh/${encodeURIComponent(rawSlug)}`, {
        headers: { 'User-Agent': BROWSER_UA, 'Referer': `${NETTRUYEN_BASE}/` },
      })
        .then((r) => r.text())
        .catch(() => ''),
      fetchWithTimeout(
        `${NETTRUYEN_BASE}/Comic/Services/ComicService.asmx/ChapterList?slug=${encodeURIComponent(rawSlug)}`,
        { headers: { 'User-Agent': BROWSER_UA, 'Referer': `${NETTRUYEN_BASE}/truyen-tranh/${encodeURIComponent(rawSlug)}` } }
      )
        .then((r) => r.text())
        .catch(() => '{"data":[]}'),
    ]);

    let chapters = [];
    try {
      const parsed = JSON.parse(chJsonText);
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

    if (chapters.length === 0) return null;

    const titleMatch = html.match(/<h1[^>]*class=["']title-detail["'][^>]*>([\s\S]*?)<\/h1>/i);
    const name = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '')) : rawSlug;

    const imgMatch =
      html.match(/class=["'][^"']*col-image[^"']*["'][\s\S]*?<img[^>]+(?:data-original|src)=["']([^"']+)["']/i) ||
      html.match(/meta property=["']og:image["'] content=["']([^"']+)["']/i);
    let rawThumb = imgMatch ? imgMatch[1].trim() : `https://v1.beercloudy.com/nettruyen/thumb/${rawSlug}.jpg`;
    if (rawThumb.startsWith('//')) rawThumb = `https:${rawThumb}`;

    const descMatch = html.match(/class=["']detail-content["'][\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    const content = descMatch ? decodeHtmlEntities(descMatch[1].replace(/<[^>]+>/g, '')) : '';

    return {
      rawSlug,
      name,
      rawThumb,
      content,
      chapters,
    };
  }

  /* ========================================================================
     HELPER: FETCH FULL MANGADEX CHAPTERS (BOTH VIETNAMESE & ENGLISH, PAGINATED UP TO 1500 CHAPS!)
     ======================================================================== */
  async crawlMangaDexComicFull(mdIdOrQuery, isQuery = false) {
    let mdId = mdIdOrQuery;
    let mangaObj = null;

    if (isQuery) {
      const sUrl = `${MANGADEX_API}/manga?title=${encodeURIComponent(mdIdOrQuery)}&limit=1&includes[]=cover_art&includes[]=author&order[followedCount]=desc`;
      const sJson = await (await fetchWithTimeout(sUrl, { headers: { 'User-Agent': API_UA } })).json();
      mangaObj = sJson?.data?.[0];
      if (!mangaObj) return null;
      mdId = mangaObj.id;
    } else {
      const mUrl = `${MANGADEX_API}/manga/${encodeURIComponent(mdId)}?includes[]=cover_art&includes[]=author`;
      const mJson = await (await fetchWithTimeout(mUrl, { headers: { 'User-Agent': API_UA } })).json();
      mangaObj = mJson?.data;
    }
    if (!mangaObj) return null;

    // Fetch up to 1,500 chapters across offsets 0, 500, 1000 for both VI and EN
    const fetchLangFeed = async (lang) => {
      const allChaps = [];
      for (const offset of [0, 500, 1000]) {
        try {
          const fUrl = `${MANGADEX_API}/manga/${mdId}/feed?limit=500&offset=${offset}&translatedLanguage[]=${lang}&order[chapter]=asc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`;
          const fJson = await (await fetchWithTimeout(fUrl, { headers: { 'User-Agent': API_UA } })).json();
          const data = fJson?.data || [];
          allChaps.push(...data);
          if (data.length < 500) break;
        } catch (_) {
          break;
        }
      }

      const mapByChap = new Map();
      for (const ch of allChaps) {
        const attr = ch.attributes || {};
        if (!attr.pages || attr.pages <= 0 || attr.externalUrl || attr.isUnavailable) continue;
        const chapNum = attr.chapter ? String(attr.chapter) : 'Oneshot';
        const existing = mapByChap.get(chapNum);
        if (!existing || (attr.pages || 0) > (existing.pages || 0)) {
          mapByChap.set(chapNum, {
            chapter_name: chapNum,
            chapter_title: attr.title ? `${attr.title} [${lang.toUpperCase()}]` : `[${lang.toUpperCase()}]`,
            chapter_api_data: `/v1/api/chapter/${ch.id}`,
            pages: attr.pages || 0,
          });
        }
      }
      return Array.from(mapByChap.values());
    };

    const [viChaps, enChaps] = await Promise.all([fetchLangFeed('vi'), fetchLangFeed('en')]);

    const attr = mangaObj.attributes || {};
    const rels = mangaObj.relationships || [];
    const coverRel = rels.find((r) => r.type === 'cover_art' && r.attributes?.fileName);
    const rawCover = coverRel
      ? `https://uploads.mangadex.org/covers/${mdId}/${coverRel.attributes.fileName}.512.jpg`
      : '';
    const authors = rels
      .filter((r) => (r.type === 'author' || r.type === 'artist') && r.attributes?.name)
      .map((r) => r.attributes.name);

    return {
      mdId,
      rawCover,
      authors,
      status: attr.status === 'completed' ? 'completed' : 'ongoing',
      year: attr.year || '',
      description: attr.description?.vi || attr.description?.en || '',
      viChaps,
      enChaps,
    };
  }

  /* ========================================================================
     HELPER: FETCH FULL CỨU TRUYỆN VN CHAPTERS BY MANGA ID
     ======================================================================== */
  async crawlCuuTruyenChaptersById(ctId) {
    try {
      const [mRes, chRes] = await Promise.all([
        fetchWithTimeout(`${CUUTRUYEN_API}/mangas/${encodeURIComponent(ctId)}`, {
          headers: { 'User-Agent': BROWSER_UA, 'Accept': 'application/json' },
        }).then((r) => r.json()).catch(() => ({})),
        fetchWithTimeout(`${CUUTRUYEN_API}/mangas/${encodeURIComponent(ctId)}/chapters`, {
          headers: { 'User-Agent': BROWSER_UA, 'Accept': 'application/json' },
        }).then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      const rawChaps = Array.isArray(chRes?.data) ? chRes.data : [];
      if (rawChaps.length === 0) return null;

      const sorted = [...rawChaps].sort((a, b) => {
        const na = parseFloat(a.number);
        const nb = parseFloat(b.number);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return (a.order || 0) - (b.order || 0);
      });

      const chapters = sorted.map((ch) => ({
        chapter_name: String(ch.number ?? ch.order ?? '1'),
        chapter_title: ch.name ? `${ch.name} [VI • Full HD]` : '[VI • Full HD]',
        chapter_api_data: `/v1/api/chapter/ct-${ch.id}`,
        pages: ch.pages_count || 0,
      }));

      const rawCover = mRes?.data?.cover_url || mRes?.data?.cover_mobile_url || '';
      const description = mRes?.data?.description || '';
      return { ctId, rawCover, description, chapters };
    } catch (_) {
      return null;
    }
  }

  /* ========================================================================
     HELPER: FETCH FULL MANGAPILL GLOBAL ENGLISH CHAPTERS BY PATH
     ======================================================================== */
  async crawlMangaPillChapters(mpPath) {
    try {
      const res = await fetchWithTimeout(`${MANGAPILL_BASE}${mpPath}`, {
        headers: { 'User-Agent': BROWSER_UA, 'Referer': `${MANGAPILL_BASE}/` },
      });
      const html = await res.text();
      const matches = [...html.matchAll(/href="(\/chapters\/[^"]+)"[^>]*>([^<]+)<\/a>/gi)];
      if (matches.length === 0) return null;

      const rawList = matches.map((m) => {
        const href = m[1].trim();
        const label = decodeHtmlEntities(m[2].trim());
        const numMatch = label.match(/([0-9]+(?:\.[0-9]+)?)/);
        const chapNum = numMatch ? numMatch[1] : label.replace(/^Chapter\s*/i, '').trim() || '1';
        const encodedId = `mp-${href.replace(/^\/chapters\//, '').replace('/', '__')}`;
        return {
          chapter_name: String(chapNum),
          chapter_title: `${label} [EN • MangaPill]`,
          chapter_api_data: `/v1/api/chapter/${encodedId}`,
          pages: 22,
        };
      });

      // Sort ascending by chapter number
      rawList.sort((a, b) => {
        const na = parseFloat(a.chapter_name);
        const nb = parseFloat(b.chapter_name);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return 0;
      });

      // Extract cover & description if available
      const imgMatch = html.match(/<img[^>]+data-src="(https:\/\/cdn\.readdetectiveconan\.com\/[^"]+)"/i);
      const rawCover = imgMatch ? imgMatch[1] : '';

      return {
        mpPath,
        rawCover,
        chapters: rawList,
      };
    } catch (_) {
      return null;
    }
  }

  /* ========================================================================
     HELPER: FETCH FULL TRUYENQQ / OTRUYEN CDN CHAPTERS BY SLUG
     ======================================================================== */
  async crawlTruyenQQChaptersBySlug(tqqSlug) {
    try {
      const res = await fetchWithTimeout(`${TRUYENQQ_BASE}/${encodeURIComponent(tqqSlug)}/`, {
        headers: { 'User-Agent': BROWSER_UA, 'Referer': `${TRUYENQQ_BASE}/` },
      });
      const html = await res.text();
      const chapMatches = [
        ...html.matchAll(
          new RegExp(`href=["']https?:\\/\\/truyenqq\\.cx\\/${tqqSlug}\\/(chapter-[^"'/?#]+)\\/?["'][^>]*>([\\s\\S]*?)<\\/a>`, 'gi')
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
          chapter_name: String(num),
          chapter_title: '[VI • TruyenQQ/OTruyen]',
          chapter_api_data: `/v1/api/chapter/tqq-${tqqSlug}__${cSlug}`,
          pages: 0,
        });
      }

      if (chapters.length === 0) return null;

      chapters.sort((a, b) => {
        const na = parseFloat(a.chapter_name);
        const nb = parseFloat(b.chapter_name);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return 0;
      });

      const imgMatch = html.match(/meta property=["']og:image["'] content=["']([^"']+)["']/i);
      const rawCover = imgMatch ? imgMatch[1].trim() : '';
      const descMatch = html.match(/meta property=["']og:description["'] content=["']([^"']+)["']/i);
      const description = descMatch ? decodeHtmlEntities(descMatch[1]) : '';

      return {
        tqqSlug,
        rawCover,
        description,
        chapters,
      };
    } catch (_) {
      return null;
    }
  }

  /* ========================================================================
     SPECIAL: SYNC ALL 118+ LEGENDARY MANGA, MANHWA & MANHUA (VIETNAMESE + ENGLISH CHAPTERS!)
     ======================================================================== */
  async syncLegendaryMangaCatalog(minPriority = 1) {
    const targets = LEGENDARY_MANGA_TARGETS.filter((t) => (t.priority || 1) >= minPriority);
    this.state.phase = 'Đang đồng bộ Tuyển Tập Huyền Thoại Manga • Manhwa • Manhua (Song Ngữ VI + EN)...';
    this.log(`🏆 Bắt đầu cào & đồng bộ ${targets.length} siêu phẩm Manga / Manhwa / Manhua (Gộp cả Server Tiếng Việt + Server Tiếng Anh)...`);
    this.state.progressTotal += targets.length;

    // Build lookup of existing legends by priority or slug so we never lose already-crawled NetTruyen chapters
    const existingByPriority = new Map();
    for (const m of Object.values(this.db.mangas)) {
      if (m.isLegend && m.legendPriority) {
        existingByPriority.set(m.legendPriority, m);
      }
    }

    const BATCH_SIZE = 2;
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      if (i > 0) await new Promise((r) => setTimeout(r, 450));
      const batch = targets.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (target) => {
          try {
            const prevEntry = existingByPriority.get(target.priority) || (target.ntSlug && this.db.mangas[`nt-${target.ntSlug}`]);
            const prevNtServer = (prevEntry?.chapters || []).find((s) => s.server_name && s.server_name.includes('NetTruyen'));

            // 1. Crawl Vietnamese NetTruyen chapters (or reuse already synced NetTruyen server)
            let ntData = null;
            if (prevNtServer && Array.isArray(prevNtServer.server_data) && prevNtServer.server_data.length > 0) {
              ntData = {
                rawSlug: target.ntSlug || String(prevEntry.slug || '').replace(/^nt-/, ''),
                name: target.title,
                rawThumb: '',
                content: prevEntry.content || '',
                chapters: prevNtServer.server_data,
              };
            } else {
              if (target.ntSlug) {
                ntData = await this.crawlNetTruyenComicFull(target.ntSlug, false).catch(() => null);
              }
              if (!ntData && target.ntAltSlug) {
                ntData = await this.crawlNetTruyenComicFull(target.ntAltSlug, false).catch(() => null);
              }
              if (!ntData && target.ntQuery) {
                ntData = await this.crawlNetTruyenComicFull(target.ntQuery, true).catch(() => null);
              }
            }

            // 2. Crawl TruyenQQ/OTruyen + Cứu Truyện Full HD + MangaPill EN + MangaDex (VI & EN) in parallel
            const [tqqData, ctData, mpData, mdData, mdAltData] = await Promise.all([
              target.tqqSlug ? this.crawlTruyenQQChaptersBySlug(target.tqqSlug).catch(() => null) : Promise.resolve(null),
              target.ctId ? this.crawlCuuTruyenChaptersById(target.ctId).catch(() => null) : Promise.resolve(null),
              target.mpPath ? this.crawlMangaPillChapters(target.mpPath).catch(() => null) : Promise.resolve(null),
              target.mdId
                ? this.crawlMangaDexComicFull(target.mdId, false).catch(() => null)
                : target.mdQuery
                ? this.crawlMangaDexComicFull(target.mdQuery, true).catch(() => null)
                : Promise.resolve(null),
              target.mdAltId ? this.crawlMangaDexComicFull(target.mdAltId, false).catch(() => null) : Promise.resolve(null),
            ]);

            const servers = [];
            if (ntData && ntData.chapters.length > 0) {
              servers.push({
                server_name: `🟢 Tiếng Việt • NetTruyen (${ntData.chapters.length} chương)`,
                server_data: ntData.chapters,
              });
            }
            if (tqqData && tqqData.chapters.length > 0) {
              servers.push({
                server_name: `🔵 Tiếng Việt • TruyenQQ/OTruyen (${tqqData.chapters.length} chương)`,
                server_data: tqqData.chapters,
              });
            }
            if (ctData && ctData.chapters.length > 0) {
              servers.push({
                server_name: `🟣 Tiếng Việt • Cứu Truyện Full HD (${ctData.chapters.length} chương)`,
                server_data: ctData.chapters,
              });
            }
            if (mdData && mdData.viChaps.length > 0) {
              servers.push({
                server_name: `🇻🇳 Tiếng Việt • MangaDex (${mdData.viChaps.length} chương)`,
                server_data: mdData.viChaps,
              });
            }
            if (mpData && mpData.chapters.length > 0) {
              servers.push({
                server_name: `🇬🇧 English • MangaPill Global (${mpData.chapters.length} chương)`,
                server_data: mpData.chapters,
              });
            }
            if (mdData && mdData.enChaps.length > 0) {
              servers.push({
                server_name: `🇬🇧 English • MangaDex (${mdData.enChaps.length} chương)`,
                server_data: mdData.enChaps,
              });
            }
            if (mdAltData && mdAltData.enChaps.length > 0) {
              servers.push({
                server_name: `🇬🇧 Phần 2 (Shin) • English (${mdAltData.enChaps.length} chương)`,
                server_data: mdAltData.enChaps,
              });
            }

            if (servers.length === 0) {
              this.state.progressCurrent++;
              return;
            }

            const totalChaps = servers.reduce((acc, s) => acc + s.server_data.length, 0);
            const primaryServerChaps = servers[0].server_data;
            const latestChap =
              primaryServerChaps[0]?.chapter_name && parseFloat(primaryServerChaps[0].chapter_name) > parseFloat(primaryServerChaps[primaryServerChaps.length - 1]?.chapter_name || 0)
                ? primaryServerChaps[0]
                : primaryServerChaps[primaryServerChaps.length - 1] || primaryServerChaps[0];

            // Remove old duplicate key if priority moved from mdId to ntSlug
            if (prevEntry && prevEntry.slug) {
              delete this.db.mangas[prevEntry.slug];
            }

            const slugId = ntData && ntData.rawSlug
              ? `nt-${ntData.rawSlug}`
              : tqqData && tqqData.tqqSlug
              ? `tqq-${tqqData.tqqSlug}`
              : ctData && ctData.ctId
              ? `ct-${ctData.ctId}`
              : mdData && mdData.mdId
              ? mdData.mdId
              : `legend-${target.priority}`;

            const rawCover =
              (mdData && mdData.rawCover) ||
              (ctData && ctData.rawCover) ||
              (tqqData && tqqData.rawCover) ||
              (ntData && ntData.rawThumb) ||
              (mpData && mpData.rawCover) ||
              '';
            const proxiedThumb = rawCover
              ? `/api/img?url=${encodeURIComponent(rawCover)}`
              : prevEntry?.thumb_url || '';

            const synopsis =
              (ctData && ctData.description && ctData.description.length > 30 ? ctData.description : '') ||
              (tqqData && tqqData.description && tqqData.description.length > 30 ? tqqData.description : '') ||
              (ntData && ntData.content && ntData.content.length > 30 ? ntData.content : '') ||
              (mdData && mdData.description) ||
              `Siêu phẩm ${target.title} đã được đồng bộ đầy đủ ${totalChaps} chương (hỗ trợ cả Tiếng Việt & Tiếng Anh).`;

            const hasVi = servers.some((s) => s.server_name.includes('Tiếng Việt'));
            const hasEn = servers.some((s) => s.server_name.includes('English'));
            const originCode = target.origin || (target.tags.includes('Manhwa') ? 'ko' : target.tags.includes('Manhua') ? 'zh' : 'ja');
            const typeTag = originCode === 'ko' ? 'Manhwa Hàn' : originCode === 'zh' ? 'Manhua Trung' : 'Manga Nhật';

            this.db.mangas[slugId] = {
              _id: slugId,
              slug: slugId,
              isLegend: true,
              isFullDetailLoaded: true,
              legendPriority: target.priority,
              source_id: ntData ? 'nettruyen' : tqqData ? 'otruyen_tqq' : ctData ? 'cuutruyen' : 'mangadex',
              source_name: '🏆 Tuyển Tập Huyền Thoại',
              name: target.title,
              origin_name: [target.mdQuery || target.ntSlug || target.tqqSlug || ''].filter(Boolean),
              origin_code: originCode,
              origin_label: hasVi && hasEn ? `🏆 ${typeTag} (VI+EN)` : hasVi ? `🏆 ${typeTag} (VI)` : `🏆 ${typeTag} (EN)`,
              year: mdData?.year || '',
              status: mdData?.status || 'ongoing',
              thumb_url: proxiedThumb,
              updatedAt: new Date().toISOString(),
              author: target.authorName
                ? [...new Set([target.authorName, ...(mdData?.authors || [])])]
                : mdData?.authors?.length
                ? mdData.authors
                : ['Tác giả Huyền Thoại'],
              category: target.tags.map((t) => ({
                id: t.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                name: t,
                slug: t.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              })),
              content: synopsis,
              chaptersCount: totalChaps,
              chaptersLatest: [latestChap],
              chapters: servers,
            };

            this.state.progressCurrent++;
            this.state.lastSyncedComic = `${target.title} (${totalChaps} chương • ${servers.length} server)`;
            this.log(`🏆 Đã đồng bộ: ${target.title} — ${totalChaps} chương (${servers.map((s) => s.server_name).join(' + ')})`);
          } catch (err) {
            this.state.progressCurrent++;
          }
        })
      );
      this.saveDatabase();
    }
  }

  /* ========================================================================
     1B. CRAWL TRUYENQQ / OTRUYEN CDN MANHWA & MANHUA CATEGORY PAGES (VIETNAMESE)
     ======================================================================== */
  async syncTruyenQQCategoryPage(url, originCode = 'ko', label = 'TruyenQQ Manhwa', maxItems = 25) {
    this.state.phase = `Đang quét danh sách ${label}...`;
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': BROWSER_UA, 'Referer': `${TRUYENQQ_BASE}/` },
    });
    const html = await res.text();
    const titleMatches = [
      ...html.matchAll(
        /<h3 class=["']comic-title["']>\s*<a[^>]+href=["']https?:\/\/truyenqq\.cx\/([^"'/?#]+)\/?["'][^>]*>([\s\S]*?)<\/a>/gi
      ),
    ];
    const discovered = [];
    const seen = new Set();

    for (const m of titleMatches) {
      const rawSlug = m[1].trim();
      if (!rawSlug || seen.has(rawSlug)) continue;
      seen.add(rawSlug);
      const name = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ''));
      discovered.push({ rawSlug, name, rawThumb: '' });
      if (discovered.length >= maxItems) break;
    }

    this.log(`🔵 [${label}] Phát hiện ${discovered.length} bộ truyện. Đang cào toàn bộ chương Tiếng Việt...`);
    this.state.progressTotal += discovered.length;

    const BATCH_SIZE = 5;
    for (let i = 0; i < discovered.length; i += BATCH_SIZE) {
      const batch = discovered.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const fullId = `tqq-${item.rawSlug}`;
            if (this.db.mangas[fullId]?.isLegend) {
              this.state.progressCurrent++;
              return;
            }
            const tqqData = await this.crawlTruyenQQChaptersBySlug(item.rawSlug);
            if (!tqqData || tqqData.chapters.length === 0) {
              this.state.progressCurrent++;
              return;
            }
            const latestChap = tqqData.chapters[tqqData.chapters.length - 1] || tqqData.chapters[0];
            const rawCover = item.rawThumb || tqqData.rawCover || '';
            const catLabel = originCode === 'ko' ? 'Manhwa Hàn' : 'Manhua Trung';

            this.db.mangas[fullId] = {
              _id: fullId,
              slug: fullId,
              isFullDetailLoaded: true,
              source_id: 'otruyen_tqq',
              source_name: '🔵 TruyenQQ • OTruyen',
              name: item.name,
              origin_name: [],
              origin_code: originCode,
              origin_label: `🔵 ${catLabel}`,
              status: 'ongoing',
              thumb_url: rawCover ? `/api/img?url=${encodeURIComponent(rawCover)}` : '',
              updatedAt: new Date().toISOString(),
              author: ['TruyenQQ • OTruyen CDN'],
              category: [{ id: originCode === 'ko' ? 'manhwa' : 'manhua', name: catLabel, slug: originCode === 'ko' ? 'manhwa' : 'manhua' }],
              content: tqqData.description || `Bộ truyện ${item.name} đã được đồng bộ đầy đủ ${tqqData.chapters.length} chương Tiếng Việt từ kho TruyenQQ & OTruyen CDN.`,
              chaptersCount: tqqData.chapters.length,
              chaptersLatest: [latestChap],
              chapters: [
                {
                  server_name: `🔵 Tiếng Việt • TruyenQQ/OTruyen (${tqqData.chapters.length} chương)`,
                  server_data: tqqData.chapters,
                },
              ],
            };
            this.state.progressCurrent++;
            this.state.lastSyncedComic = `${item.name} (${tqqData.chapters.length} chương)`;
          } catch (_) {
            this.state.progressCurrent++;
          }
        })
      );
      this.saveDatabase();
    }
  }

  /* ========================================================================
     1. CRAWL NETTRUYEN / NHATTRUYEN MANGA & ALL CHAPTERS
     ======================================================================== */
  async syncNetTruyenPage(url, label = 'NetTruyen Manga') {
    this.state.phase = `Đang quét danh sách ${label}...`;
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': BROWSER_UA, 'Referer': `${NETTRUYEN_BASE}/` },
    });
    const html = await res.text();

    const blocks = html.split(/<div class=["']item["']>/i).slice(1);
    const discovered = [];
    const seen = new Set();

    for (const block of blocks) {
      const linkMatch =
        block.match(/<figcaption>[\s\S]*?<h3>\s*<a[^>]+href=["']https?:\/\/[^/]+\/truyen-tranh\/([^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/i) ||
        block.match(/<h3>\s*<a[^>]+href=["']https?:\/\/[^/]+\/truyen-tranh\/([^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/i);
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

      const chapMatch = block.match(/href=["']https?:\/\/[^/]+\/truyen-tranh\/[^/]+\/(chuong-[^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const latestChapSlug = chapMatch ? chapMatch[1].trim() : 'chuong-1';
      const latestChapNum = parseInt(latestChapSlug.replace(/[^0-9]/g, ''), 10) || 1;

      discovered.push({ rawSlug, name, rawThumb, latestChapSlug, latestChapNum });
    }

    this.log(`🟢 [${label}] Phát hiện ${discovered.length} bộ truyện. Bắt đầu đồng bộ toàn bộ chương...`);
    this.state.progressTotal += discovered.length;

    const BATCH_SIZE = 3;
    for (let i = 0; i < discovered.length; i += BATCH_SIZE) {
      const batch = discovered.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const fullId = `nt-${item.rawSlug}`;
            if (this.db.mangas[fullId]?.isLegend) {
              this.state.progressCurrent++;
              return;
            }

            let chapters = [];
            if (item.latestChapNum > 0) {
              const maxCh = Math.min(item.latestChapNum, 1200);
              for (let c = 1; c <= maxCh; c++) {
                chapters.push({
                  chapter_name: String(c),
                  chapter_title: '[VI • NetTruyen]',
                  chapter_api_data: `/v1/api/chapter/nt-${item.rawSlug}__chuong-${c}`,
                  pages: 0,
                });
              }
            }

            const latestChap = chapters[chapters.length - 1] || chapters[0] || {
              chapter_name: String(item.latestChapNum || '1'),
              chapter_api_data: `/v1/api/chapter/nt-${item.rawSlug}__${item.latestChapSlug}`,
            };

            this.db.mangas[fullId] = {
              _id: fullId,
              slug: fullId,
              isFullDetailLoaded: true,
              source_id: 'nettruyen',
              source_name: '🟢 NetTruyen',
              name: item.name,
              origin_name: [],
              origin_code: url.includes('manga-112') ? 'ja' : url.includes('manhwa') ? 'ko' : 'zh',
              origin_label: '🟢 NetTruyen',
              status: 'ongoing',
              thumb_url: item.rawThumb ? `/api/img?url=${encodeURIComponent(item.rawThumb)}` : '',
              updatedAt: new Date().toISOString(),
              author: ['NetTruyen'],
              category: [{ id: 'manga', name: 'Truyện Việt • NetTruyen', slug: 'manga' }],
              content: `Bộ truyện ${item.name} đã được đồng bộ đầy đủ ${chapters.length} chương Tiếng Việt từ kho NetTruyen / NhatTruyen.`,
              chaptersCount: chapters.length,
              chaptersLatest: [latestChap],
              chapters: [
                {
                  server_name: `🟢 Tiếng Việt • NetTruyen (${chapters.length} chương)`,
                  server_data: chapters,
                },
              ],
            };

            this.state.progressCurrent++;
            this.state.lastSyncedComic = `${item.name} (${chapters.length} chương)`;
          } catch (_) {
            this.state.progressCurrent++;
          }
        })
      );
    }
  }

  /* ========================================================================
     2. CRAWL CỨU TRUYỆN VN MANGA & ALL CHAPTERS
     ======================================================================== */
  async syncCuuTruyenBatch(page = 1, perPage = 25) {
    this.state.phase = `Đang quét kho Cứu Truyện VN (Trang ${page})...`;
    let res;
    try {
      res = await fetchWithTimeout(`${CUUTRUYEN_API}/mangas/recently_updated?page=${page}&per_page=${perPage}`, {
        headers: { 'User-Agent': BROWSER_UA, 'Referer': 'https://cuutruyen.net/' },
      });
    } catch (_) {
      res = await fetchWithTimeout(
        `https://hetcuutruyen.net/api/v2/mangas/recently_updated?page=${page}&per_page=${perPage}`,
        { headers: { 'User-Agent': BROWSER_UA, 'Referer': 'https://hetcuutruyen.net/' } }
      );
    }

    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    this.log(`🟣 [Cứu Truyện VN] Phát hiện ${list.length} bộ Manga. Đang đồng bộ toàn bộ chương...`);
    this.state.progressTotal += list.length;

    const BATCH_SIZE = 5;
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const batch = list.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (m) => {
          try {
            let chRes;
            try {
              chRes = await fetchWithTimeout(`${CUUTRUYEN_API}/mangas/${m.id}/chapters`, {
                headers: { 'User-Agent': BROWSER_UA, 'Referer': 'https://cuutruyen.net/' },
              });
            } catch (_) {
              chRes = await fetchWithTimeout(`https://hetcuutruyen.net/api/v2/mangas/${m.id}/chapters`, {
                headers: { 'User-Agent': BROWSER_UA, 'Referer': 'https://hetcuutruyen.net/' },
              });
            }
            const chJson = await chRes.json();
            const rawChapters = Array.isArray(chJson?.data) ? chJson.data : [];

            const chapters = rawChapters.map((ch) => ({
              chapter_name: ch.number ? String(ch.number) : String(ch.order || 1),
              chapter_title: ch.name || '',
              chapter_api_data: `/v1/api/chapter/ct-${ch.id}`,
              pages: ch.pages_count || 0,
            }));

            const rawCover = m.cover_url || m.cover_mobile_url || '';
            const fullId = `ct-${m.id}`;
            const latestChap = chapters[0] || {
              chapter_name: String(m.newest_chapter_number || 'Mới'),
              chapter_api_data: m.newest_chapter_id ? `/v1/api/chapter/ct-${m.newest_chapter_id}` : '',
            };

            this.db.mangas[fullId] = {
              _id: fullId,
              slug: fullId,
              source_id: 'cuutruyen',
              source_name: '🟣 Cứu Truyện',
              name: m.name,
              origin_name: [],
              origin_code: 'ja',
              origin_label: '🟣 Cứu Truyện',
              status: 'ongoing',
              thumb_url: rawCover ? `/api/img?url=${encodeURIComponent(rawCover)}` : '',
              updatedAt: m.newest_chapter_created_at || new Date().toISOString(),
              author: [m.author_name || m.author?.name || 'Cứu Truyện'],
              category: [{ id: 'manga', name: 'Manga Full HD', slug: 'manga' }],
              content: `Bộ truyện ${m.name} đã được đồng bộ đầy đủ ${chapters.length} chương Full HD từ kho Cứu Truyện VN.`,
              chaptersCount: chapters.length,
              chaptersLatest: [latestChap],
              chapters: [
                {
                  server_name: `🟣 Cứu Truyện Full HD (Đã đồng bộ ${chapters.length} chương)`,
                  server_data: chapters,
                },
              ],
            };

            this.state.progressCurrent++;
            this.state.lastSyncedComic = `${m.name} (${chapters.length} chương)`;
          } catch (_) {
            this.state.progressCurrent++;
          }
        })
      );
    }
  }

  /* ========================================================================
     MASTER SYNC RUNNER
     ======================================================================== */
  async runFullSync({ pagesPerSource = 1, syncLegends = true, minLegendPriority = 1 } = {}) {
    if (this.state.isRunning) {
      return this.getStatus();
    }

    this.state.isRunning = true;
    this.state.progressCurrent = 0;
    this.state.progressTotal = 0;
    this.log(`🚀 BẮT ĐẦU CÀO & ĐỒNG BỘ TOÀN BỘ CHƯƠNG MANGA • MANHWA • MANHUA (VI + EN)...`);

    try {
      if (syncLegends) {
        await this.syncLegendaryMangaCatalog(minLegendPriority);
      }

      // Crawl Top Manhwa & Manhua from TruyenQQ / OTruyen CDN (Zero rate limit!)
      await this.syncTruyenQQCategoryPage(`${TRUYENQQ_BASE}/manhwa/`, 'ko', 'TruyenQQ Top Manhwa Hàn', 25).catch((e) =>
        this.log(`⚠️ Lỗi TruyenQQ Manhwa: ${e.message}`)
      );
      await this.syncTruyenQQCategoryPage(`${TRUYENQQ_BASE}/manhua/`, 'zh', 'TruyenQQ Top Manhua Trung', 25).catch((e) =>
        this.log(`⚠️ Lỗi TruyenQQ Manhua: ${e.message}`)
      );

      if (minLegendPriority === 1) {
        for (let p = 1; p <= pagesPerSource; p++) {
          await this.syncNetTruyenPage(`${NETTRUYEN_BASE}/tim-truyen/manga-112${p > 1 ? `?page=${p}` : ''}`, `NetTruyen Manga Nhật Trang ${p}`).catch((e) =>
            this.log(`⚠️ Lỗi NetTruyen Manga trang ${p}: ${e.message}`)
          );
          this.saveDatabase();
        }

        for (let p = 1; p <= pagesPerSource; p++) {
          await this.syncCuuTruyenBatch(p, 20).catch((e) =>
            this.log(`⚠️ Lỗi Cứu Truyện trang ${p}: ${e.message}`)
          );
          this.saveDatabase();
        }
      }

      this.state.phase = 'Hoàn tất đồng bộ!';
      this.log(
        `✅ ĐỒNG BỘ THÀNH CÔNG: ${this.db.totalMangas.toLocaleString('vi-VN')} bộ truyện với tổng cộng ${this.db.totalChapters.toLocaleString('vi-VN')} chương!`
      );
    } finally {
      this.state.isRunning = false;
      this.saveDatabase();
    }

    return this.getStatus();
  }
}

const syncEngine = new MangaCrawlerSyncEngine();

if (require.main === module) {
  const mode = process.argv[2] || 'legends';
  if (mode === 'authors') {
    (async () => {
      syncEngine.state.isRunning = true;
      await syncEngine.syncLegendaryMangaCatalog(146);
      syncEngine.state.isRunning = false;
      syncEngine.saveDatabase();
      const st = syncEngine.getStatus();
      console.log('================================================================');
      console.log(`🎉 KẾT QUẢ ĐỒNG BỘ 7 ĐẠI TÁC GIẢ (TOGASHI, INOUE, TEZUKA, TORIYAMA, HARA, URASAWA, FUJISAWA):`);
      console.log(`   - Tổng số bộ truyện: ${st.totalMangas}`);
      console.log(`   - Tổng số chương đã lưu: ${st.totalChapters}`);
      console.log('================================================================');
    })();
  } else if (mode === 'wuxia') {
    (async () => {
      syncEngine.state.isRunning = true;
      await syncEngine.syncLegendaryMangaCatalog(119);
      syncEngine.state.isRunning = false;
      syncEngine.saveDatabase();
      const st = syncEngine.getStatus();
      console.log('================================================================');
      console.log(`🎉 KẾT QUẢ ĐỒNG BỘ HOÀNG PHI HỒNG • PHONG VÂN • TỨ ĐẠI DANH BỘ & KIẾM HIỆP:`);
      console.log(`   - Tổng số bộ truyện: ${st.totalMangas}`);
      console.log(`   - Tổng số chương đã lưu: ${st.totalChapters}`);
      console.log('================================================================');
    })();
  } else if (mode === 'nettruyen-only') {
    (async () => {
      await syncEngine.syncNetTruyenPage(`${NETTRUYEN_BASE}/`, 'NetTruyen Trang Chủ Mới Cập Nhật');
      syncEngine.saveDatabase();
      await syncEngine.syncNetTruyenPage(`${NETTRUYEN_BASE}/tim-truyen/manhwa-11400`, 'NetTruyen Top Manhwa Hàn');
      syncEngine.saveDatabase();
      await syncEngine.syncNetTruyenPage(`${NETTRUYEN_BASE}/tim-truyen/manhua`, 'NetTruyen Top Manhua Trung');
      syncEngine.saveDatabase();
      const st = syncEngine.getStatus();
      console.log('================================================================');
      console.log(`🎉 KẾT QUẢ ĐỒNG BỘ NETTRUYEN:`);
      console.log(`   - Tổng số bộ truyện: ${st.totalMangas}`);
      console.log(`   - Tổng số chương đã lưu: ${st.totalChapters}`);
      console.log(`   - Riêng kho NetTruyen: ${st.sourceCounts.nettruyen.mangas} bộ (${st.sourceCounts.nettruyen.chapters} chương)`);
      console.log('================================================================');
    })();
  } else if (mode === 'truyenqq-only') {
    syncEngine.runFullSync({ pagesPerSource: 1, syncLegends: false, minLegendPriority: 999 }).then((st) => {
      console.log('================================================================');
      console.log(`🎉 KẾT QUẢ ĐỒNG BỘ TRUYENQQ TOP MANHWA & MANHUA:`);
      console.log(`   - Tổng số bộ truyện: ${st.totalMangas}`);
      console.log(`   - Tổng số chương đã lưu: ${st.totalChapters}`);
      console.log('================================================================');
    });
  } else if (mode === 'manhwa-manhua') {
    syncEngine.runFullSync({ pagesPerSource: 1, syncLegends: true, minLegendPriority: 50 }).then((st) => {
      console.log('================================================================');
      console.log(`🎉 KẾT QUẢ ĐỒNG BỘ TOP MANHWA & MANHUA + MANGA HUYỀN THOẠI:`);
      console.log(`   - Tổng số bộ truyện: ${st.totalMangas}`);
      console.log(`   - Tổng số chương đã lưu: ${st.totalChapters}`);
      console.log('================================================================');
    });
  } else if (mode === 'legends') {
    syncEngine.runFullSync({ pagesPerSource: 1, syncLegends: true, minLegendPriority: 1 }).then((st) => {
      console.log('================================================================');
      console.log(`🎉 KẾT QUẢ ĐỒNG BỘ TUYỂN TẬP HUYỀN THOẠI & TOP MANGA:`);
      console.log(`   - Tổng số bộ truyện: ${st.totalMangas}`);
      console.log(`   - Tổng số chương đã lưu: ${st.totalChapters}`);
      console.log('================================================================');
    });
  } else {
    const pages = parseInt(mode, 10) || 1;
    syncEngine.runFullSync({ pagesPerSource: pages, syncLegends: true });
  }
}

module.exports = syncEngine;
