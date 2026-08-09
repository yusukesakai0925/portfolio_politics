/* ===========================
   Header scroll effect
   （ヒーロー上では透明、スクロールでインク面＋細線）
=========================== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

/* ===========================
   Hamburger menu
=========================== */
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

hamburger.addEventListener('click', () => {
  const opened = navMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(opened));
  const spans = hamburger.querySelectorAll('span');
  if (opened) {
    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  } else {
    spans[0].style.transform = '';
    spans[1].style.opacity = '';
    spans[2].style.transform = '';
  }
});

// Close menu on nav link click
navMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.querySelectorAll('span').forEach(s => {
      s.style.transform = '';
      s.style.opacity = '';
    });
  });
});

/* ===========================
   Scroll reveal animation
   （控えめなフェード＋上昇。グリッド内は80ms刻みのスタッガー）
=========================== */
const revealElements = document.querySelectorAll(
  '.section, .belief-item, .timeline-item, .cert-list li, .contact-grid li, .about-photo-wrap, .hero-photo'
);

revealElements.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Stagger effect for list/grid items
      const delay = entry.target.closest('.beliefs-list, .timeline, .cert-list, .contact-grid')
        ? Array.from(entry.target.parentElement.children).indexOf(entry.target) * 80
        : 0;
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

/* ===========================
   Active nav highlight on scroll
=========================== */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.site-nav a[href^="#"]');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));

/* ===========================
   Activity report feed
   （note RSS → alloriginsプロキシ経由。取得失敗・0件時は必ずfallbackを表示し、
     「読み込み中...」が永久表示にならないようにする）
=========================== */
// 記事タイトルを属性値に入れるための実体参照化（タイトルに " や & が入っても壊れないように）
function escAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// 読み込みの成否をスクリーンリーダーに通知する（#reportFeedStatus は画面に出ない）
function setFeedStatus(msg) {
  const el = document.getElementById('reportFeedStatus');
  if (el) el.textContent = msg;
}

// RSS取得失敗・0件時のフォールバック表示（.note-fallback は css/style.css に定義済み）
function showFallback(feed, user) {
  setFeedStatus('活動報告の記事を読み込めませんでした。noteへのリンクを表示しています。');
  feed.innerHTML = `
    <div class="note-fallback">
      <p>記事を読み込めませんでした。noteで最新の活動報告をご覧ください。</p>
      <a href="https://note.com/${user}" target="_blank" rel="noopener" class="btn btn-line">
        <i class="fas fa-book-open"></i> noteで活動報告を読む
      </a>
    </div>`;
}

async function fetchActivityFeed() {
  const feed = document.getElementById('reportFeed');
  if (!feed) return;

  const NOTE_USER = 'yusukesakai_log';
  const RSS_URL = `https://note.com/${NOTE_USER}/rss`;
  const PROXY_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(RSS_URL)}`;

  try {
    const res = await fetch(PROXY_URL);
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item')).slice(0, 6);

    if (items.length === 0) {
      showFallback(feed, NOTE_USER);
      return;
    }

    feed.innerHTML = items.map(item => {
      const title = item.querySelector('title')?.textContent || '';
      const link  = item.querySelector('link')?.textContent || '#';
      const pub   = item.querySelector('pubDate')?.textContent || '';
      const date  = pub ? new Date(pub).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      // 記事本文の抜粋（HTMLタグを除去し先頭80字）。タイトルだけより記事の中身が伝わる
      const descRaw = item.querySelector('description')?.textContent || '';
      const descText = descRaw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      const excerpt = descText.length > 80 ? descText.slice(0, 80) + '…' : descText;
      return `
        <div class="note-card">
          <div class="note-card-date">${date}</div>
          <div class="note-card-title">${title}</div>
          ${excerpt ? `<div class="note-card-excerpt">${excerpt}</div>` : ''}
          <a href="${link}" target="_blank" rel="noopener" class="note-card-link" aria-label="${escAttr(title)} を読む">続きを読む <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
        </div>`;
    }).join('');
    setFeedStatus(`活動報告の記事を${items.length}件読み込みました。`);

  } catch (err) {
    console.error('activity feed fetch error:', err);
    showFallback(feed, NOTE_USER);
  } finally {
    // 記事一覧・フォールバックのどちらに差し替わっても「読み込み中」を解除する。
    // 解除しないとスクリーンリーダーは読み込み中のまま次へ進んでしまう。
    feed.setAttribute('aria-busy', 'false');
  }
}

document.addEventListener('DOMContentLoaded', fetchActivityFeed);

/* ===========================
   Smooth offset for fixed header
=========================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 64; // header height（css --head-h と揃える）
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});
