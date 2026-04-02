/* ===========================
   Navbar scroll effect
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
  navMenu.classList.toggle('open');
  const spans = hamburger.querySelectorAll('span');
  if (navMenu.classList.contains('open')) {
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
    hamburger.querySelectorAll('span').forEach(s => {
      s.style.transform = '';
      s.style.opacity = '';
    });
  });
});

/* ===========================
   Scroll reveal animation
=========================== */
const revealElements = document.querySelectorAll('.section, .policy-card, .activity-card, .timeline-item, .cert-item, .business-card');

revealElements.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // Stagger effect for grid items
      const delay = entry.target.closest('.policy-grid, .activity-grid, .timeline, .cert-list')
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
const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${id}`) {
          link.style.color = 'var(--accent)';
        }
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));

/* ===========================
   Note feed
=========================== */
async function fetchNoteFeed() {
  const feed = document.getElementById('noteFeed');
  if (!feed) return;

  const NOTE_USER = 'yusukesakai_tech';
  const RSS_URL = `https://note.com/${NOTE_USER}/rss`;
  const PROXY_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(RSS_URL)}`;

  try {
    const res = await fetch(PROXY_URL);
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item')).slice(0, 5);

    if (items.length === 0) {
      showFallback(feed, NOTE_USER);
      return;
    }

    feed.innerHTML = items.map(item => {
      const title = item.querySelector('title')?.textContent || '';
      const link  = item.querySelector('link')?.textContent || '#';
      const pub   = item.querySelector('pubDate')?.textContent || '';
      const date  = pub ? new Date(pub).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      return `
        <div class="note-card">
          <div class="note-card-date">${date}</div>
          <div class="note-card-title">${title}</div>
          <a href="${link}" target="_blank" class="note-card-link">続きを読む <i class="fas fa-arrow-right"></i></a>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('note fetch error:', err);
    showFallback(feed, NOTE_USER);
  }
}

function showFallback(feed, user) {
  feed.innerHTML = `
    <div class="note-fallback">
      <p>記事の自動取得ができませんでした。</p>
      <a href="https://note.com/${user}" target="_blank" class="btn btn-note">
        <i class="fas fa-book-open"></i> noteで記事を読む
      </a>
    </div>`;
}

document.addEventListener('DOMContentLoaded', fetchNoteFeed);

/* ===========================
   Activity report feed
=========================== */
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
      return `
        <div class="note-card">
          <div class="note-card-date">${date}</div>
          <div class="note-card-title">${title}</div>
          <a href="${link}" target="_blank" class="note-card-link">続きを読む <i class="fas fa-arrow-right"></i></a>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('activity feed fetch error:', err);
    showFallback(feed, NOTE_USER);
  }
}

document.addEventListener('DOMContentLoaded', fetchActivityFeed);

/* ===========================
   Smooth offset for fixed navbar
=========================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 72; // navbar height
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});
