/* ============================================================
   秋水 · 交互涟漪
   经典双缓冲波动算法：低分辨率模拟 + 放大柔化 = 化开的墨意
   ============================================================ */

(function () {
  const canvas = document.getElementById('water');
  const hero = document.getElementById('top');
  if (!canvas || !hero) return;

  const ctx = canvas.getContext('2d');
  const SCALE = 4;                 // 模拟网格 = 显示尺寸 / 4（柔化的关键）
  const DAMPING = 0.973;           // 阻尼：调了一晚上的那个常数
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0;                // 显示尺寸
  let SW = 0, SH = 0;              // 模拟尺寸
  let buf1, buf2;                  // 双缓冲
  let bg;                          // 背景（离屏，与模拟同尺寸）
  let bgData, outImg;
  let running = false, visible = true, rafId = null;

  /* ---------- 背景：一汪秋水 ---------- */
  function paintBackground() {
    bg = document.createElement('canvas');
    bg.width = SW; bg.height = SH;
    const b = bg.getContext('2d');

    // 天 · 水 渐变
    const g = b.createLinearGradient(0, 0, 0, SH);
    g.addColorStop(0.00, '#ede8d7');   // 高空 · 纸色
    g.addColorStop(0.30, '#d9dac6');   // 雾气
    g.addColorStop(0.46, '#b3bfa9');   // 水天相接
    g.addColorStop(0.62, '#8ba193');   // 秋水
    g.addColorStop(1.00, '#5c7166');   // 深处
    b.fillStyle = g;
    b.fillRect(0, 0, SW, SH);

    // 秋日 · 暖盘
    const sx = SW * 0.74, sy = SH * 0.26, sr = Math.max(SW, SH) * 0.055;
    const sun = b.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.2);
    sun.addColorStop(0, 'rgba(224, 190, 138, 0.85)');
    sun.addColorStop(0.28, 'rgba(224, 190, 138, 0.38)');
    sun.addColorStop(1, 'rgba(224, 190, 138, 0)');
    b.fillStyle = sun;
    b.fillRect(0, 0, SW, SH);
    b.beginPath();
    b.arc(sx, sy, sr, 0, Math.PI * 2);
    b.fillStyle = 'rgba(230, 199, 146, 0.9)';
    b.fill();

    // 太阳在水里的倒影（一条碎金）
    const ref = b.createLinearGradient(0, sy, 0, SH);
    ref.addColorStop(0, 'rgba(224,190,138,0)');
    ref.addColorStop(0.5, 'rgba(224,190,138,0.16)');
    ref.addColorStop(1, 'rgba(224,190,138,0.05)');
    b.fillStyle = ref;
    const refW = SW * 0.012;
    for (let y = Math.floor(SH * 0.48); y < SH; y += 3) {
      const w = refW * (1 + (y - SH * 0.48) / SH * 3);
      b.fillRect(sx - w / 2 + (Math.random() - .5) * 6, y, w, 1.4);
    }

    // 雾带 · 几道横白
    b.fillStyle = 'rgba(242, 238, 225, 0.10)';
    for (let i = 0; i < 4; i++) {
      const y = SH * (0.30 + i * 0.075);
      const h = SH * (0.012 + Math.random() * 0.02);
      b.fillRect(0, y, SW, h);
    }

    // 远山的淡影
    b.fillStyle = 'rgba(99, 120, 108, 0.14)';
    b.beginPath();
    b.moveTo(0, SH * 0.46);
    for (let x = 0; x <= SW; x += SW / 24) {
      const y = SH * 0.46 - Math.sin(x / SW * Math.PI * 2.2 + 1.2) * SH * 0.028 - Math.random() * SH * 0.012;
      b.lineTo(x, y);
    }
    b.lineTo(SW, SH * 0.46);
    b.closePath();
    b.fill();

    // 纸粒
    const noise = b.getImageData(0, 0, SW, SH);
    const nd = noise.data;
    for (let i = 0; i < nd.length; i += 4) {
      const n = (Math.random() - 0.5) * 9;
      nd[i] += n; nd[i + 1] += n; nd[i + 2] += n;
    }
    b.putImageData(noise, 0, 0);

    bgData = b.getImageData(0, 0, SW, SH);
    outImg = b.createImageData(SW, SH);
  }

  /* ---------- 涟漪物理 ---------- */
  function drop(x, y, radius, strength) {
    const r2 = radius * radius;
    const x0 = Math.max(1, x - radius), x1 = Math.min(SW - 2, x + radius);
    const y0 = Math.max(1, y - radius), y1 = Math.min(SH - 2, y + radius);
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const dx = i - x, dy = j - y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2) {
          const fall = 1 - Math.sqrt(d2) / radius;
          buf1[j * SW + i] -= strength * fall;
        }
      }
    }
  }

  function step() {
    for (let j = 1; j < SH - 1; j++) {
      const row = j * SW;
      for (let i = 1; i < SW - 1; i++) {
        const idx = row + i;
        let v = (buf1[idx - 1] + buf1[idx + 1] + buf1[idx - SW] + buf1[idx + SW]) / 2 - buf2[idx];
        buf2[idx] = v * DAMPING;
      }
    }
    const t = buf1; buf1 = buf2; buf2 = t;
  }

  /* ---------- 渲染：按水面梯度折射背景 ---------- */
  function render() {
    const src = bgData.data, out = outImg.data;
    for (let j = 1; j < SH - 1; j++) {
      const row = j * SW;
      for (let i = 1; i < SW - 1; i++) {
        const idx = row + i;
        const gx = buf1[idx - 1] - buf1[idx + 1];
        const gy = buf1[idx - SW] - buf1[idx + SW];

        let sx = i + Math.round(gx * 1.6);
        let sy = j + Math.round(gy * 1.6);
        if (sx < 0) sx = 0; else if (sx >= SW) sx = SW - 1;
        if (sy < 0) sy = 0; else if (sy >= SH) sy = SH - 1;

        const s4 = (sy * SW + sx) * 4;
        const o4 = idx * 4;
        const light = gx * 1.15;               // 高光与阴影
        out[o4]     = src[s4]     + light;
        out[o4 + 1] = src[s4 + 1] + light;
        out[o4 + 2] = src[s4 + 2] + light * 0.92;
        out[o4 + 3] = 255;
      }
    }
    const off = render.off || (render.off = document.createElement('canvas'));
    off.width = SW; off.height = SH;
    off.getContext('2d').putImageData(outImg, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(off, 0, 0, W, H);
  }

  function frame() {
    if (!running) return;
    step();
    render();
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || REDUCED) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* ---------- 交互 ---------- */
  let lastX = -1, lastY = -1;
  function toSim(e) {
    const r = canvas.getBoundingClientRect();
    return [
      Math.round((e.clientX - r.left) / r.width * SW),
      Math.round((e.clientY - r.top) / r.height * SH),
    ];
  }
  hero.addEventListener('pointermove', (e) => {
    const [x, y] = toSim(e);
    if (lastX >= 0) {
      const speed = Math.min(28, Math.hypot(x - lastX, y - lastY));
      if (speed > 1) drop(x, y, 2 + speed * 0.16, 90 + speed * 22);
    }
    lastX = x; lastY = y;
  });
  hero.addEventListener('pointerleave', () => { lastX = -1; lastY = -1; });
  hero.addEventListener('pointerdown', (e) => {
    const [x, y] = toSim(e);
    drop(x, y, 5, 560);
  });

  // 天落水珠 · 偶有微雨
  let rainTimer = null;
  function startRain() {
    if (rainTimer || REDUCED) return;
    rainTimer = setInterval(() => {
      if (!visible || document.hidden) return;
      drop(
        Math.round(SW * (0.08 + Math.random() * 0.84)),
        Math.round(SH * (0.30 + Math.random() * 0.62)),
        2 + Math.random() * 2.5,
        130 + Math.random() * 240
      );
    }, 2600);
  }

  /* ---------- 尺寸 ---------- */
  function resize() {
    // 用 canvas 元素实际被布局的尺寸（inset:0 铺满 hero），
    // 而非 hero.clientWidth —— 移动端 hero 有 padding 时 clientWidth 不含 padding，
    // 会导致 canvas 物理像素算小、四周露出纸底。
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    SW = Math.max(80, Math.round(canvas.width / dpr / SCALE));
    SH = Math.max(60, Math.round(canvas.height / dpr / SCALE));
    buf1 = new Float32Array(SW * SH);
    buf2 = new Float32Array(SW * SH);
    paintBackground();

    if (REDUCED) {
      // 静水也有三分皱：预置几圈涟漪，单帧渲染
      drop(Math.round(SW * .3), Math.round(SH * .62), 4, 380);
      drop(Math.round(SW * .68), Math.round(SH * .74), 3, 300);
      for (let k = 0; k < 90; k++) step();
      render();
    }
  }

  /* ---------- 生命周期 ---------- */
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible && !document.hidden) start(); else stop();
  }, { threshold: 0.02 });
  io.observe(hero);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (visible) start();
  });

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(resize, 180);
  });

  resize();
  startRain();
  start();

  /* 对外接口：把屏幕坐标的一滴水交给物理水面（开场仪式用） */
  window.qsRipple = function (clientX, clientY, radius, strength) {
    const r = canvas.getBoundingClientRect();
    const x = Math.round((clientX - r.left) / r.width * SW);
    const y = Math.round((clientY - r.top) / r.height * SH);
    if (x > 0 && x < SW && y > 0 && y < SH) drop(x, y, radius, strength);
  };
})();
