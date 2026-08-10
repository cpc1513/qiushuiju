/* ============================================================
   秋水居 · 内容数据（由 build.js 依据 posts/*.md 生成，请勿手改）
   ============================================================ */

const CHAPTERS = [
  { id: 'code', num: '壹', cn: '编程', en: 'CODE', motto: '码上山水 —— 代码亦有丘壑。', href: 'code/' },
  { id: 'reading', num: '贰', cn: '阅读', en: 'READING', motto: '与书对坐，如晤故人。', href: 'reading/' },
  { id: 'photos', num: '叁', cn: '摄影', en: 'PHOTOS', motto: '光是水写的字。', href: 'photos/' },
  { id: 'essays', num: '肆', cn: '随笔', en: 'ESSAYS', motto: '随意走笔，不着急抵达。', href: 'essays/' },
  { id: 'tools', num: '伍', cn: '工具', en: 'TOOLS', motto: '器以载道，物以养心。', href: '' },
];

const POSTS = {

  '1': {
    cat: '随笔', catEn: 'ESSAYS', title: 'Meloday',
    date: '2026.08.11', tags: [], mins: 2,
    excerpt: '一款面向 Windows 的 AI 音乐日记应用',
    body: [
      '[https://github.com/cpc1513/Meloday.git](https://github.com/cpc1513/Meloday.git)',
      'Meloday 是一款面向 Windows 的 AI 音乐日记应用。你写下当天发生了什么、心情如何，应用会通过 AI 理解文字里的情绪、场景和节奏，再为这一天生成一张私人歌单。日记、情绪和歌单会按日期保存在本机，之后可以从日历、历史记录和播放器里重新打开。',
      '## **应用截图**',
      '### **写下今天，生成今日音乐**',
      '![Meloday diary screen](https://github.com/cpc1513/Meloday/raw/main/docs/screenshots/dairy.png)',
      '### **在播放器中查看歌词、歌单和收藏状态**',
      '![Meloday player screen](https://github.com/cpc1513/Meloday/raw/main/docs/screenshots/player.png)',
      '### **用日历回看每天的情绪和音乐**',
      '![Meloday calendar screen](https://github.com/cpc1513/Meloday/raw/main/docs/screenshots/calendar.png)',
      '### **在历史里找回过去的日记**',
      '![Meloday history screen](https://github.com/cpc1513/Meloday/raw/main/docs/screenshots/history.png)',
      '## **功能**',
      '**AI 音乐日记**：输入一段日记，Meloday 会根据内容生成当天歌单。',
      '**情绪理解**：AI 会分析日记里的情绪、场景和具体线索，不只是套用情绪模板。',
      '**云端免费额度**：新用户可使用官方云端 AI 网关的免费额度；额度用完后可在设置中填写自己的 DeepSeek API Key。',
      '**QQ 音乐匹配**：后端会把 AI 推荐转成 QQ 音乐可检索、尽量可播放的歌曲。',
      '**播放器与歌词**：提供底部迷你播放器和独立播放器页，支持歌词显示、进度、音量、收藏和歌单切换。',
      '**日历与历史**：每天的日记、情绪、节日信息和歌单会按日期保存，支持历史搜索和删除。',
      '**本地优先**：日记和歌单数据默认保存在当前 Windows 用户目录下的 SQLite 数据库中。',
    ],
    bodyHtml: '<p><a href="https://github.com/cpc1513/Meloday.git" target="_blank" rel="noopener">https://github.com/cpc1513/Meloday.git</a></p><p>Meloday 是一款面向 Windows 的 AI 音乐日记应用。你写下当天发生了什么、心情如何，应用会通过 AI 理解文字里的情绪、场景和节奏，再为这一天生成一张私人歌单。日记、情绪和歌单会按日期保存在本机，之后可以从日历、历史记录和播放器里重新打开。</p><h2><strong>应用截图</strong></h2><h3><strong>写下今天，生成今日音乐</strong></h3><figure class="reader-fig"><img src="https://github.com/cpc1513/Meloday/raw/main/docs/screenshots/dairy.png" alt="Meloday diary screen"><figcaption>Meloday diary screen</figcaption></figure><h3><strong>在播放器中查看歌词、歌单和收藏状态</strong></h3><figure class="reader-fig"><img src="https://github.com/cpc1513/Meloday/raw/main/docs/screenshots/player.png" alt="Meloday player screen"><figcaption>Meloday player screen</figcaption></figure><h3><strong>用日历回看每天的情绪和音乐</strong></h3><figure class="reader-fig"><img src="https://github.com/cpc1513/Meloday/raw/main/docs/screenshots/calendar.png" alt="Meloday calendar screen"><figcaption>Meloday calendar screen</figcaption></figure><h3><strong>在历史里找回过去的日记</strong></h3><figure class="reader-fig"><img src="https://github.com/cpc1513/Meloday/raw/main/docs/screenshots/history.png" alt="Meloday history screen"><figcaption>Meloday history screen</figcaption></figure><h2><strong>功能</strong></h2><p><strong>AI 音乐日记</strong>：输入一段日记，Meloday 会根据内容生成当天歌单。</p><p><strong>情绪理解</strong>：AI 会分析日记里的情绪、场景和具体线索，不只是套用情绪模板。</p><p><strong>云端免费额度</strong>：新用户可使用官方云端 AI 网关的免费额度；额度用完后可在设置中填写自己的 DeepSeek API Key。</p><p><strong>QQ 音乐匹配</strong>：后端会把 AI 推荐转成 QQ 音乐可检索、尽量可播放的歌曲。</p><p><strong>播放器与歌词</strong>：提供底部迷你播放器和独立播放器页，支持歌词显示、进度、音量、收藏和歌单切换。</p><p><strong>日历与历史</strong>：每天的日记、情绪、节日信息和歌单会按日期保存，支持历史搜索和删除。</p><p><strong>本地优先</strong>：日记和歌单数据默认保存在当前 Windows 用户目录下的 SQLite 数据库中。</p>',
  },

  'webapp': {
    cat: '编程', catEn: 'CODE', title: '文字炼金坊',
    date: '2026.08.10', tags: [], mins: 2,
    excerpt: 'AI 写作风格转换工具：把任意文字「炼」成名家文风。',
    body: [
      '**67 位作家 × 4 种转换模式**：选择作家与模式，一键改写你的文字；',
      '**自定义文风提取**：粘贴一段范文，提取其风格特征用于转换；',
      '**多轮续写**：在转换结果基础上持续对话、迭代打磨；',
      '**多作家对比**：同一段文字同时用多位作家的风格转换，并排比较。',
      '[https://cpc1513.github.io/literature-Alchemy-Workshop/](https://cpc1513.github.io/literature-Alchemy-Workshop/)',
      '**技术栈**：前端 React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui，部署在 GitHub Pages；后端是 Hono + tRPC 的轻量代理，负责保管 DeepSeek API Key 并转发请求。前后端通过 tRPC 实现端到端类型安全，共享 contracts/ 目录中的作家数据与 prompt 构建逻辑。无数据库——密钥存于Netlify平台环境变量，接口由 Cloudflare Turnstile 人机验证、访问口令与 IP 限频保护。',
    ],
    bodyHtml: '<p><strong>67 位作家 × 4 种转换模式</strong>：选择作家与模式，一键改写你的文字；</p><p><strong>自定义文风提取</strong>：粘贴一段范文，提取其风格特征用于转换；</p><p><strong>多轮续写</strong>：在转换结果基础上持续对话、迭代打磨；</p><p><strong>多作家对比</strong>：同一段文字同时用多位作家的风格转换，并排比较。</p><p><a href="https://cpc1513.github.io/literature-Alchemy-Workshop/" target="_blank" rel="noopener">https://cpc1513.github.io/literature-Alchemy-Workshop/</a></p><p><strong>技术栈</strong>：前端 React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui，部署在 GitHub Pages；后端是 Hono + tRPC 的轻量代理，负责保管 DeepSeek API Key 并转发请求。前后端通过 tRPC 实现端到端类型安全，共享 contracts/ 目录中的作家数据与 prompt 构建逻辑。无数据库——密钥存于Netlify平台环境变量，接口由 Cloudflare Turnstile 人机验证、访问口令与 IP 限频保护。</p>',
  },

  'p-bund': {
    cat: '摄影', catEn: 'PHOTOS', title: '外滩 · 蓝调时刻',
    img: 'assets/photos/bund.jpg',
    date: '2026.06.14', tags: ['上海', '外滩'], mins: 2,
    excerpt: '太阳刚落，天还没全黑。海关大楼的灯一盏盏亮起来，把一百年的石头照得温热。',
    body: [
      '傍晚六点半，外滩的人还没散。我靠在防汛墙上，等那个摄影人叫它「蓝调时刻」的二十分钟——太阳落下去，天光还剩一点青，路灯和建筑的轮廓灯抢先亮起来。',
      '海关大楼是这时候最好看的。白天它是灰扑扑的老石头，可灯一亮，那些罗马柱、那座钟楼，忽然都有了温度，像一位换好晚礼服的老人。钟面还是亮的，指针不紧不慢，底下车流已经开始堵。',
      '我架着相机拍了十几张，最满意这张：天是丝绒的蓝，楼是暖的黄，红绿灯在车流里明明灭灭。一个世纪前这里也是灯火通明，只是灯不一样。石头记得的事，比人多。',
    ],
    bodyHtml: '<p>傍晚六点半，外滩的人还没散。我靠在防汛墙上，等那个摄影人叫它「蓝调时刻」的二十分钟——太阳落下去，天光还剩一点青，路灯和建筑的轮廓灯抢先亮起来。</p><p>海关大楼是这时候最好看的。白天它是灰扑扑的老石头，可灯一亮，那些罗马柱、那座钟楼，忽然都有了温度，像一位换好晚礼服的老人。钟面还是亮的，指针不紧不慢，底下车流已经开始堵。</p><p>我架着相机拍了十几张，最满意这张：天是丝绒的蓝，楼是暖的黄，红绿灯在车流里明明灭灭。一个世纪前这里也是灯火通明，只是灯不一样。石头记得的事，比人多。</p>',
  },

  'p-lujiazui': {
    cat: '摄影', catEn: 'PHOTOS', title: '陆家嘴 · 天际线',
    img: 'assets/photos/lujiazui.jpg',
    date: '2025.10.05', tags: ['上海', '陆家嘴'], mins: 2,
    excerpt: '从外滩望过去，东方明珠和三件套立在夜色里。这一岸是历史，那一岸是未来，中间隔着一条黄浦江。',
    body: [
      '国庆的夜里，外滩人山人海。我挤到栏杆边，只为看一眼这个看了无数次、却每次都还想看的画面——陆家嘴的灯全亮了，东方明珠红得发亮，旁边三件套（开瓶器、注射器、打蛋器，上海人这么叫它们）直插进夜空。',
      '江面上有游船慢慢过，拖出一条长长的光。我举着相机等它开到画面边上，让天际线做主角，船做个逗号。风从江上来，吹得人很清醒。',
      '站在外滩看陆家嘴，是件挺奇妙的事：脚下这一岸是百年前的万国建筑，对面那一岸是三十年里长出来的钢铁森林，中间只隔一条几百米的江。一个城市把它的过去和未来，就这么并排摆在了一条河的两岸。',
    ],
    bodyHtml: '<p>国庆的夜里，外滩人山人海。我挤到栏杆边，只为看一眼这个看了无数次、却每次都还想看的画面——陆家嘴的灯全亮了，东方明珠红得发亮，旁边三件套（开瓶器、注射器、打蛋器，上海人这么叫它们）直插进夜空。</p><p>江面上有游船慢慢过，拖出一条长长的光。我举着相机等它开到画面边上，让天际线做主角，船做个逗号。风从江上来，吹得人很清醒。</p><p>站在外滩看陆家嘴，是件挺奇妙的事：脚下这一岸是百年前的万国建筑，对面那一岸是三十年里长出来的钢铁森林，中间只隔一条几百米的江。一个城市把它的过去和未来，就这么并排摆在了一条河的两岸。</p>',
  },

  'p-tianchi': {
    cat: '摄影', catEn: 'PHOTOS', title: '天池 · 云下的湖',
    img: 'assets/photos/tianchi.jpg',
    date: '2025.08.30', tags: ['新疆', '天山'], mins: 2,
    excerpt: '海拔一千九百米，湖水是化了的雪。游船小小的一只，像谁不小心落在镜子上的一粒颜色。',
    body: [
      '上天山那天云很厚，向导说看不到博格达峰的雪顶了。我有点扫兴，可走到湖边还是愣住了——湖太大，太静，静到云压得很低也吵不醒它。',
      '水是化了的雪，所以是那种发灰的蓝绿色，冷得很干净。一艘游船从湖心慢慢划过去，橙色的船身，是整幅青灰山水里唯一的一点暖。我举着相机等它开到画面中间，按了快门。',
      '阴天的天池不惊艳，但耐看。它不像那些一眼就要你惊叹的景，它只是在那儿，山在眼前，云在湖上，你站多久，它就静多久。回来的路上我想，能看到雪顶是运气，能看到云下的湖，也是。',
    ],
    bodyHtml: '<p>上天山那天云很厚，向导说看不到博格达峰的雪顶了。我有点扫兴，可走到湖边还是愣住了——湖太大，太静，静到云压得很低也吵不醒它。</p><p>水是化了的雪，所以是那种发灰的蓝绿色，冷得很干净。一艘游船从湖心慢慢划过去，橙色的船身，是整幅青灰山水里唯一的一点暖。我举着相机等它开到画面中间，按了快门。</p><p>阴天的天池不惊艳，但耐看。它不像那些一眼就要你惊叹的景，它只是在那儿，山在眼前，云在湖上，你站多久，它就静多久。回来的路上我想，能看到雪顶是运气，能看到云下的湖，也是。</p>',
  },
};

/* 摄影板块条目 */
const PHOTOS = [
  { post: 'p-bund', img: 'assets/photos/bund.jpg', title: '外滩', poem: '灯火里的旧时光', meta: '上海 · 2026 夏' },
  { post: 'p-lujiazui', img: 'assets/photos/lujiazui.jpg', title: '陆家嘴', poem: '钢铁也会发光', meta: '上海 · 2025 秋' },
  { post: 'p-tianchi', img: 'assets/photos/tianchi.jpg', title: '天池', poem: '山在眼前，云在湖上', meta: '新疆 · 2025 夏' },
];

/* 工具板块 */
const TOOLS = [

];
