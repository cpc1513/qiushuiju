/* TipTap 编辑器封装：工具栏 + 链接浮层 + 插图浮层 */
/* global TipTap, MdConvert */
'use strict';

const EditorKit = (() => {

  /* ---------- 模块级共享：转义 + 浮层根 + 全局关闭监听（只挂一次） ---------- */
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const popRoot = document.getElementById('popover-root');
  function closePopovers() { popRoot.innerHTML = ''; }
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.popover') && !e.target.closest('.ed-toolbar')) closePopovers();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopovers(); });

  function create(opts) {
    opts.toolbar.innerHTML = ''; // 防御性清空，重复 create 幂等
    const editor = new TipTap.Editor({
      element: opts.mount,
      extensions: [
        TipTap.StarterKit.configure({
          heading: { levels: [2, 3] },
          codeBlock: false, code: false, strike: false, underline: false,
          bulletList: false, orderedList: false, listItem: false,
          link: { openOnClick: false, autolink: false },
        }),
        TipTap.Image,
      ],
      content: MdConvert.mdToHtml(opts.body || ''),
      onUpdate: () => { refreshToolbar(); opts.onDirty && opts.onDirty(); },
      onSelectionUpdate: refreshToolbar,
    });

    /* ---------- 工具栏 ---------- */
    const BTNS = [
      { cmd: 'bold', label: 'B', title: '粗体' },
      { cmd: 'italic', label: 'I', title: '斜体', style: 'font-style:italic' },
      { sep: true },
      { cmd: 'h2', label: 'H2', title: '小标题' },
      { cmd: 'h3', label: 'H3', title: '小节标题' },
      { cmd: 'quote', label: '❝', title: '引用' },
      { cmd: 'hr', label: '—', title: '分割线' },
      { sep: true },
      { cmd: 'link', label: '🔗', title: '超链接' },
      { cmd: 'image', label: '图', title: '插图' },
    ];
    for (const b of BTNS) {
      if (b.sep) {
        const s = document.createElement('span');
        s.className = 'sep';
        opts.toolbar.appendChild(s);
        continue;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.cmd = b.cmd;
      btn.textContent = b.label;
      btn.title = b.title || '';
      if (b.style) btn.style.cssText = b.style;
      btn.addEventListener('click', () => runCmd(b.cmd, btn));
      opts.toolbar.appendChild(btn);
    }

    function refreshToolbar() {
      const map = {
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        h2: editor.isActive('heading', { level: 2 }),
        h3: editor.isActive('heading', { level: 3 }),
        quote: editor.isActive('blockquote'),
        link: editor.isActive('link'),
      };
      for (const btn of opts.toolbar.querySelectorAll('button[data-cmd]')) {
        const k = btn.dataset.cmd;
        if (k in map) btn.classList.toggle('on', !!map[k]);
      }
    }

    function runCmd(cmd, btn) {
      const c = editor.chain().focus();
      switch (cmd) {
        case 'bold': c.toggleBold().run(); break;
        case 'italic': c.toggleItalic().run(); break;
        case 'h2': c.toggleHeading({ level: 2 }).run(); break;
        case 'h3': c.toggleHeading({ level: 3 }).run(); break;
        case 'quote': c.toggleBlockquote().run(); break;
        case 'hr': c.setHorizontalRule().run(); break;
        case 'link': showLinkPopover(btn); break;
        case 'image': showImagePopover(btn); break;
      }
      refreshToolbar();
    }

    /* ---------- 浮层基础设施（popRoot/closePopovers/全局监听在模块级，只挂一次） ---------- */
    function openPopover(anchorBtn, build) {
      closePopovers();
      const pop = document.createElement('div');
      pop.className = 'popover';
      const r = anchorBtn.getBoundingClientRect();
      pop.style.left = Math.min(r.left, window.innerWidth - 320) + 'px';
      pop.style.top = (r.bottom + 6) + 'px';
      build(pop);
      popRoot.appendChild(pop);
      const input = pop.querySelector('input');
      if (input) input.focus();
    }

    /* ---------- 链接浮层 ---------- */
    function showLinkPopover(btn) {
      const cur = editor.isActive('link') ? (editor.getAttributes('link').href || '') : '';
      openPopover(btn, (pop) => {
        pop.innerHTML = `
          <input type="url" placeholder="https://…" value="${esc(cur)}">
          <div class="row">
            ${cur ? '<button class="btn danger" data-act="remove">移除</button>' : ''}
            <button class="btn" data-act="cancel">取消</button>
            <button class="btn primary" data-act="ok">确定</button>
          </div>`;
        const input = pop.querySelector('input');
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') pop.querySelector('[data-act=ok]').click(); });
        pop.addEventListener('click', (e) => {
          const act = e.target.dataset.act;
          if (act === 'cancel') return closePopovers();
          if (act === 'remove') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return closePopovers();
          }
          if (act === 'ok') {
            const href = input.value.trim();
            const chain = editor.chain().focus().extendMarkRange('link');
            if (href) chain.setLink({ href }).run();
            else chain.unsetLink().run();
            closePopovers();
          }
        });
      });
    }

    /* ---------- 插图浮层 ---------- */
    function showImagePopover(btn) {
      const cur = editor.isActive('image') ? editor.getAttributes('image') : null;
      openPopover(btn, async (pop) => {
        pop.innerHTML = `<div class="muted" style="margin-bottom:8px">加载图库…</div>`;
        let photos;
        try {
          photos = await opts.loadPhotos();
        } catch (err) {
          if (pop.isConnected) {
            pop.innerHTML = `<div class="muted" style="margin-bottom:8px">图库加载失败：${esc(err.message)}</div>`;
          }
          return;
        }
        if (!pop.isConnected) return; // 等待期间浮层已被关闭
        pop.innerHTML = `
          <div class="pop-grid">
            ${photos.map(n => `<img src="/photos/${encodeURIComponent(n)}" data-name="${esc(n)}" alt="">`).join('')}
          </div>
          <input type="text" placeholder="图注（可空）" value="${cur ? esc(cur.alt || '') : ''}">
          <div class="row">
            <label class="btn" style="margin-right:auto">上传新图
              <input type="file" accept="image/jpeg,image/png" hidden>
            </label>
            <button class="btn" data-act="cancel">取消</button>
          </div>`;
        const altInput = pop.querySelector('input[type=text]');
        const fileInput = pop.querySelector('input[type=file]');

        pop.querySelector('.pop-grid').addEventListener('click', (e) => {
          const name = e.target.dataset && e.target.dataset.name;
          if (!name) return;
          insertImage('assets/photos/' + name, altInput.value.trim());
        });
        fileInput.addEventListener('change', async () => {
          const file = fileInput.files[0];
          if (!file) return;
          const label = pop.querySelector('label.btn');
          label.textContent = '上传中…';
          try {
            const path = await opts.uploadImage(file);
            insertImage(path, altInput.value.trim());
          } catch (err) {
            label.textContent = '上传失败：' + err.message;
          }
        });
        pop.addEventListener('click', (e) => {
          if (e.target.dataset.act === 'cancel') closePopovers();
        });
      });

      function insertImage(src, alt) {
        if (editor.isActive('image')) {
          editor.chain().focus().updateAttributes('image', { src, alt }).run();
        } else {
          editor.chain().focus().setImage({ src, alt }).run();
        }
        closePopovers();
      }
    }

    return {
      editor,
      getMarkdown: () => MdConvert.jsonToMd(editor.getJSON()),
      closePopovers,
      destroy: () => editor.destroy(),
    };
  }

  return { create };
})();
