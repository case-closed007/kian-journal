# Kian Journal — 码仔工作手册

## 项目基本信息
- **网站**：https://case-closed007.github.io/kian-journal/
- **部署**：GitHub Pages，push后1-2分钟生效
- **主角**：Kian，2025-12-02出生，爸爸Mirza，妈妈Xin/Sasha

## 文件结构
index.html          # 主HTML
css/style.css       # 所有样式
js/data.js          # Firebase读写
js/ai.js            # Gemini API
js/render.js        # 渲染函数
js/app.js           # 主逻辑
bg.jpg              # 背景图

## Firebase
- 数据库：kian-journal-default-rtdb.firebaseio.com
- 路径：kian_data → feeds / sleeps / activities / dailyNotes / milestones / growth / notes
- 日期key格式：2026-03-20

## 设计系统（必须遵守）

### 字体
--font-display: 'Cormorant Garamond'  展示数字/标题，italic
--font-body: 'Lora'                   叙述正文，italic
--font-ui: 'Nunito'                   所有UI功能文字
⚠️ Cormorant Garamond 禁止用 font-weight: 600

### 颜色
--color-primary: #7c5cbf（禁止用 #7e22ce）
--ink: rgba(72, 42, 65, 0.90)
--ink-muted: rgba(100, 65, 95, 0.60)

### 背景图（关键）
body 不能有 filter，否则所有子元素 backdrop-filter 失效。
必须用独立 <div class="bg-layer">，filter 加在 .bg-layer 上。

### 卡片透明度底线
普通卡片不低于 rgba(255,255,255,0.65) + blur(32px)

## 工作规范
- 改CSS → css/style.css
- 改逻辑 → 对应 js/ 文件
- 每次任务完成后 git add . && git commit -m "描述" && git push main
- 不要动 bg.jpg
