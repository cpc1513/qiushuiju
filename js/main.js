/* ============================================================
   秋水居 · 主逻辑
   载入幕 → Lenis 平滑滚动 → 滚动编排 → 阅读浮层
   ============================================================ */

(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- 章节文章顺序（从 POSTS 按日期倒序自动派生） ---------- */
  const CAT_OF_EN = { CODE: 'code', READING: 'reading', ESSAYS: 'essays', PHOTOS: 'photos' };
  const ORDER = { code: [], reading: [], essays: [], photos: [] };
  Object.entries(POSTS)
    .sort((a, b) => (a[1].date < b[1].date ? 1 : -1))
    .forEach(([slug, p]) => ORDER[CAT_OF_EN[p.catEn]].push(slug));

  /* ============================================================
     一 · 生成章节 DOM
     ============================================================ */
  const arrowSVG = '<svg viewBox="0 0 24 24"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

  function postRow(slug) {
    const p = POSTS[slug];
    const tags = p.tags.slice(0, 2).map(t => `<span class="post-tag">${t}</span>`).join('');
    return `
      <li>
        <a class="post-row" href="#/post/${slug}" data-slug="${slug}">
          <span class="post-date">${p.date}</span>
          <span class="post-main"><h3>${p.title}</h3><p>${p.excerpt}</p></span>
          <span class="post-side">${tags}<span class="post-mins">约 ${p.mins} 分钟</span></span>
          <span class="post-arr">${arrowSVG}</span>
        </a>
      </li>`;
  }

  function photoItem(ph, i) {
    const n = String(i + 1).padStart(2, '0');
    return `
      <a class="photo-item" href="#/post/${ph.post}" data-slug="${ph.post}" data-cursor="view">
        <figure>
          <span class="photo-idx">${n} / ${String(PHOTOS.length).padStart(2, '0')}</span>
          <div class="photo-frame"><img src="${ph.img}" alt="${ph.title} · ${ph.poem}" loading="lazy"></div>
          <figcaption class="photo-cap">
            <span class="cap-title">${ph.title}</span>
            <span class="cap-poem">${ph.poem}</span>
            <span class="cap-meta">${ph.meta}</span>
          </figcaption>
        </figure>
      </a>`;
  }

  function toolRow(t) {
    return `
      <li>
        <a class="tool-row" href="${t.url}" target="_blank" rel="noopener">
          <span class="tool-name">${t.name}</span>
          <span class="tool-kind">${t.kind}</span>
          <span class="tool-desc">${t.desc}</span>
          <span class="tool-arr">${arrowSVG}</span>
        </a>
      </li>`;
  }

  function buildChapters() {
    const host = document.getElementById('chapters');
    let html = '';
    for (const ch of CHAPTERS) {
      let body = '';
      if (ch.id === 'photos') {
        body = `
          <div class="photo-pin">
            <div class="photo-track">
              ${PHOTOS.map(photoItem).join('')}
              <div class="photo-endcap">
                <span class="big">秋水<br>长天</span>
                <span>五帧秋色，摄于二四至二六年间。<br>点任意一帧，读拍摄手记。</span>
              </div>
            </div>
          </div>`;
      } else if (ch.id === 'tools') {
        body = `<ul class="tool-list">${TOOLS.map(toolRow).join('')}</ul>`;
      } else {
        const more = ch.href
          ? `<a class="chapter-more" href="${ch.href}">入全部 · ${ch.cn}卷${arrowSVG}</a>`
          : '';
        body = `<ul class="post-list">${ORDER[ch.id].map(postRow).join('')}</ul>${more}`;
      }

      html += `
        <section class="chapter ${ch.id === 'photos' ? 'photo-chapter' : ''}" id="${ch.id}">
          <header class="chapter-head">
            <span class="chapter-num" aria-hidden="true">${ch.num}</span>
            <p class="chapter-kicker mask-line"><span>${ch.en} · 卷${ch.num}</span></p>
            <h2 class="chapter-title mask-line"><span>${ch.cn}</span></h2>
            <p class="chapter-motto mask-line"><span>${ch.motto}</span></p>
          </header>
          ${body}
        </section>`;
    }
    host.innerHTML = html;
  }
  buildChapters();

  /* ============================================================
     二 · Lenis 平滑滚动
     ============================================================ */
  let lenis = null;
  if (!REDUCED && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(target, immediate) {
    if (lenis) lenis.scrollTo(target, { immediate: !!immediate, duration: 1.4 });
    else if (typeof target === 'number') window.scrollTo(0, target);
    else target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
  }

  // 锚点链接交给 Lenis
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.startsWith('#/post/')) return; // 文章路由
    const id = href.slice(1);
    const el = id === 'top' ? document.body : document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    history.pushState(null, '', href);
    scrollToTarget(id === 'top' ? 0 : el, false);
  });

  /* ============================================================
     三 · 载入仪式 · 一滴墨落成秋水
     白纸凝墨 → 拖线坠下 → 触点化开成涟漪 → 三字归位 → 钤印
     ============================================================ */
  const loader = document.getElementById('loader');
  const inkLine = document.getElementById('inkLine');
  const inkDot = document.getElementById('inkDot');

  const heroChars = document.querySelectorAll('.hero-title .char');
  const heroMasks = document.querySelectorAll('.hero .mask-line > span');
  const heroSeal = document.querySelector('.hero-seal');
  const heroHint = document.querySelector('.hero-hint');
  const rail = document.getElementById('rail');

  /* 每个字的散落后初始姿态（位移 / 旋转 / 模糊），归位时全部归零 */
  const SCATTER = [
    { x: -150, y: -110, r: -18 },
    { x: 90,   y: 60,   r: 14  },
    { x: 150,  y: -70,  r: 20  },
  ];

  function setInitial() {
    gsap.set(heroChars, { opacity: 0 });
    gsap.set(heroMasks, { yPercent: 112 });
    gsap.set(heroSeal, { scale: 0.5, opacity: 0, rotate: -16 });
    gsap.set(heroHint, { opacity: 0 });
    gsap.set(rail, { x: -20, opacity: 0 });
  }

  function heroIntro() {
    if (REDUCED) return;

    /* 三字 · 各自从散落处沉降归位（模糊值收敛，减轻收幕帧负载） */
    heroChars.forEach((ch, i) => {
      const s = SCATTER[i % SCATTER.length];
      gsap.fromTo(ch,
        { x: s.x, y: s.y, rotation: s.r, opacity: 0, filter: 'blur(9px)' },
        {
          x: 0, y: 0, rotation: 0, opacity: 1, filter: 'blur(0px)',
          duration: 2.1, ease: 'power4.out', delay: 0.12 * i,
        });
    });

    const tl = gsap.timeline({ delay: 0.7 });
    tl.to(heroSeal, {
      scale: 1, opacity: 1, rotate: -4, duration: 0.6, ease: 'back.out(2.4)',
    })
    .to(heroMasks, {
      yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.09,
    }, '-=0.25')
    .to(rail, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.8')
    .to(heroHint, { opacity: 1, duration: 0.9 }, '-=0.3');
  }

  const inkBlot = document.getElementById('inkBlot');

  function dismissLoader(instant) {
    const done = () => {
      loader.style.display = 'none';
      if (lenis) lenis.start();
      ScrollTrigger.refresh();
      openFromHash(true);
    };
    if (instant || REDUCED) { done(); return; }

    const impactX = window.innerWidth / 2;
    const impactY = window.innerHeight * 0.47;

    /* 单一连续时间线：墨滴摊平 → 墨斑洇大 + 纸面整体淡出
       （首屏在水下已就位、涟漪已起），全程无跳变。 */
    gsap.timeline({ defaults: { overwrite: 'auto' } })
      /* ① 墨滴被水面接住：摊平、拉长、变淡；
            拖线同时向上收走退场 */
      .to(inkDot, {
        scaleX: 2.8, scaleY: 0.45, opacity: 0,
        duration: 0.24, ease: 'power2.out',
      })
      .to(inkLine, {
        scaleY: 0, transformOrigin: 'bottom', opacity: 0,
        duration: 0.3, ease: 'power2.in',
      }, '<')
      /* 纸面折痕与墨线同时退场 */
      .to(loader, {
        '--crease-opacity': 0, duration: 0.3, ease: 'power2.in',
      }, '<')
      /* ② 触点洇出墨斑，随纸面一起淡出 */
      .to(inkBlot, {
        scale: 3.2, opacity: 0.85,
        duration: 0.55, ease: 'power2.out',
      }, '<')
      .to(inkBlot, {
        scale: 6.5, opacity: 0,
        duration: 1.0, ease: 'power1.out',
      })
      /* ③ 纸面几乎同时整体淡出；涟漪先于标题起，二者错开
            避免与淡出同一帧并发造成的瞬时卡顿 */
      .to(loader, {
        opacity: 0, duration: 1.05, ease: 'power2.inOut',
        onStart: () => {
          if (window.qsRipple) {
            window.qsRipple(impactX, impactY, 4, 560);
            setTimeout(() => window.qsRipple(impactX - 55, impactY + 38, 2.5, 300), 460);
            setTimeout(() => window.qsRipple(impactX + 70, impactY + 64, 2, 220), 860);
          }
          // 标题归位延后一帧启动，让涟漪物理先跑起来
          requestAnimationFrame(() => requestAnimationFrame(heroIntro));
        },
      }, '<+0.05')
      .add(done);
  }

  (function runLoader() {
    if (REDUCED) { dismissLoader(true); return; }
    if (lenis) lenis.stop();
    setInitial();

    let dismissed = false;
    const dismissOnce = () => {
      if (dismissed) return;
      dismissed = true;
      dismissLoader(false);
    };

    /* 墨的坠落是一开始就进行的，字归位等书法字体就绪（最多等 2s） */
    const fall = gsap.timeline();
    fall.to(inkDot, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, 0.25)
        .to(inkLine, { height: '33vh', duration: 0.62, ease: 'power3.in' }, 0.55)
        .to(inkDot, { y: () => window.innerHeight * 0.33, duration: 0.62, ease: 'power3.in' }, 0.55);

    const fontsReady = (document.fonts && document.fonts.ready)
      ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))])
      : Promise.resolve();
    const fallDone = new Promise((r) => fall.eventCallback('onComplete', r));

    Promise.all([fontsReady, fallDone]).then(dismissOnce);
    setTimeout(dismissOnce, 4000); // 硬兜底：任何异常 4 秒内必收幕
  })();

  /* ============================================================
     四 · 滚动编排
     ============================================================ */
  function setupScrollChoreography() {
    if (REDUCED) return;

    // 章节头 · 行遮罩入场
    document.querySelectorAll('.chapter-head').forEach((head) => {
      const spans = head.querySelectorAll('.mask-line > span');
      gsap.set(spans, { yPercent: 112 });
      gsap.to(spans, {
        yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.09,
        scrollTrigger: { trigger: head, start: 'top 82%' },
      });
    });

    // 章节序号 · 漂浮视差
    document.querySelectorAll('.chapter-num').forEach((num) => {
      gsap.fromTo(num, { yPercent: 26 }, {
        yPercent: -18, ease: 'none',
        scrollTrigger: { trigger: num.closest('.chapter'), start: 'top bottom', end: 'bottom top', scrub: 1.2 },
      });
    });

    // 文章 / 工具行 · 依次浮出
    document.querySelectorAll('.post-list, .tool-list').forEach((list) => {
      const rows = list.querySelectorAll('li');
      gsap.set(rows, { y: 44, opacity: 0 });
      gsap.to(rows, {
        y: 0, opacity: 1, duration: 1.0, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: list, start: 'top 84%' },
      });
    });

    // 页脚
    const footSpans = document.querySelectorAll('.footer .mask-line > span');
    if (footSpans.length) {
      gsap.set(footSpans, { yPercent: 112 });
      gsap.to(footSpans, {
        yPercent: 0, duration: 1.1, ease: 'power4.out',
        scrollTrigger: { trigger: '.footer', start: 'top 80%' },
      });
    }
    gsap.set('.footer-col, .footer-base', { y: 30, opacity: 0 });
    gsap.to('.footer-col, .footer-base', {
      y: 0, opacity: 1, duration: 1.0, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '.footer', start: 'top 78%' },
    });

    // 摄影 · 横向卷轴（桌面端）
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const pin = document.querySelector('.photo-pin');
      const track = document.querySelector('.photo-track');
      if (!pin || !track) return;
      const distance = () => Math.max(0, track.scrollWidth - pin.clientWidth);
      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => '+=' + distance(),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
    });

    // 导航高亮
    CHAPTERS.forEach((ch) => {
      ScrollTrigger.create({
        trigger: '#' + ch.id,
        start: 'top 45%',
        end: 'bottom 45%',
        onToggle: (self) => {
          if (self.isActive) setActiveNav(ch.id);
        },
      });
    });
    ScrollTrigger.create({
      trigger: '#top', start: 'top 40%', end: 'bottom 45%',
      onToggle: (self) => { if (self.isActive) setActiveNav('top'); },
    });
    // 卷尾区域保持「工具」高亮
    ScrollTrigger.create({
      trigger: '.footer', start: 'top 55%',
      onToggle: (self) => { if (self.isActive) setActiveNav('tools'); },
    });
  }

  function setActiveNav(id) {
    document.querySelectorAll('[data-nav]').forEach((a) => {
      a.classList.toggle('active', a.dataset.nav === id);
    });
    document.querySelectorAll('.topbar-nav a').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
  }

  /* ============================================================
     五 · 自定义光标
     ============================================================ */
  if (FINE_POINTER && !REDUCED) {
    document.body.classList.add('custom-cursor');
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    let mx = -100, my = -100, rx = -100, ry = -100;

    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; });
    document.addEventListener('mouseleave', () => document.body.classList.add('cursor-hidden'));
    document.addEventListener('mouseenter', () => document.body.classList.remove('cursor-hidden'));

    gsap.ticker.add(() => {
      rx += (mx - rx) * 0.16;  // 外环带阻尼地追随 —— 丝滑的来源
      ry += (my - ry) * 0.16;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    });

    document.addEventListener('mouseover', (e) => {
      const view = e.target.closest('[data-cursor="view"]');
      const link = e.target.closest('a, button');
      document.body.classList.toggle('cursor-view', !!view);
      document.body.classList.toggle('cursor-link', !view && !!link);
    });
  }

  /* ============================================================
     六 · 阅读浮层
     ============================================================ */
  const reader = document.getElementById('reader');
  const readerArticle = document.getElementById('readerArticle');
  const readerPN = document.getElementById('readerPN');
  const readerClose = document.getElementById('readerClose');
  const readerScroll = reader.querySelector('.reader-scroll');
  let savedScroll = 0;
  let readerOpen = false;

  function chapterOf(slug) {
    for (const [cid, list] of Object.entries(ORDER)) {
      if (list.includes(slug)) return cid;
    }
    return 'essays';
  }
  const CHAPTER_CN = { code: '编程', reading: '阅读', photo: '摄影', essay: '随笔' };

  function renderReader(slug) {
    const p = POSTS[slug];
    if (!p) return false;
    const cid = chapterOf(slug);
    const list = ORDER[cid];
    const idx = list.indexOf(slug);
    const prev = list[idx - 1];
    const next = list[idx + 1];

    const imgBlock = p.img ? `
      <figure class="reader-img">
        <img src="${p.img}" alt="${p.title}">
        <figcaption>${p.title}</figcaption>
      </figure>` : '';

    readerArticle.innerHTML = `
      <p class="reader-cat">${p.catEn} · ${p.cat}</p>
      <h1 class="reader-title">${p.title}</h1>
      <div class="reader-meta">
        <span>${p.date}</span>
        <span>${p.tags.join(' · ')}</span>
        <span>约 ${p.mins} 分钟</span>
      </div>
      ${imgBlock}
      <div class="reader-body">
        ${p.body.map(t => `<p>${t}</p>`).join('')}
      </div>
      <div class="reader-fin">完</div>`;

    const pnLink = (s, label, cls) => s
      ? `<a href="#/post/${s}" class="${cls}"><span class="pn-label">${label}</span><span class="pn-title">${POSTS[s].title}</span></a>`
      : `<a class="${cls} disabled"><span class="pn-label">${label}</span><span class="pn-title">—— 已是卷${label.includes('上一') ? '首' : '尾'} ——</span></a>`;
    readerPN.innerHTML = pnLink(prev, '上一篇', 'prev') + pnLink(next, '下一篇', 'next');
    return true;
  }

  function openReader(slug, immediate) {
    if (!renderReader(slug)) return;
    if (!readerOpen) {
      savedScroll = lenis ? lenis.scroll : window.scrollY;
      readerOpen = true;
      reader.classList.add('open');
      reader.setAttribute('aria-hidden', 'false');
      readerScroll.scrollTop = 0;
      if (lenis) lenis.stop();
      if (REDUCED || immediate) {
        gsap.set(reader, { y: 0 });
      } else {
        gsap.fromTo(reader, { y: '103%' }, { y: '0%', duration: 0.9, ease: 'power4.inOut' });
        gsap.fromTo('.reader-article > *', { y: 30, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.8, stagger: 0.06, delay: 0.55, ease: 'power3.out',
        });
      }
    } else {
      // 浮层内翻页（上一篇 / 下一篇）
      readerScroll.scrollTop = 0;
      if (!REDUCED) {
        gsap.fromTo('.reader-article', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
      }
    }
  }

  function closeReader() {
    if (!readerOpen) return;
    readerOpen = false;
    const finish = () => {
      reader.classList.remove('open');
      reader.setAttribute('aria-hidden', 'true');
      gsap.set(reader, { y: '103%' });
      if (lenis) lenis.start();
      scrollToTarget(savedScroll, true);
    };
    history.pushState(null, '', window.location.pathname);
    if (REDUCED) finish();
    else gsap.to(reader, { y: '103%', duration: 0.75, ease: 'power4.inOut', onComplete: finish });
  }

  readerClose.addEventListener('click', closeReader);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeReader(); });

  function openFromHash(immediate) {
    const m = location.hash.match(/^#\/post\/([\w-]+)/);
    if (m) openReader(m[1], immediate);
  }
  window.addEventListener('hashchange', () => {
    const m = location.hash.match(/^#\/post\/([\w-]+)/);
    if (m) openReader(m[1], false);
  });

  /* ============================================================
     启动
     ============================================================ */
  setupScrollChoreography();
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
