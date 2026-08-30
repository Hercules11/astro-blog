# astro-blog 系统架构

基于 Astro 5 的静态博客（Astro 官方 tutorial 项目结构的中文实践版）。内容源为 `src/pages/posts/` 下的 4 篇 Markdown 文章，通过 `import.meta.glob()` / `Astro.glob()` 在构建期收集，标签页由 `getStaticPaths()` 动态枚举；全站零 JS 默认输出，仅 `Greeting`（Preact）与 `LikeButton`（Preact）两个岛屿通过 `client:load` 激活。另有 `@astrojs/rss` 生成的 RSS 订阅源。

## 1. 系统架构图

```
+------------------------------+
|  内容源 (Markdown 文章)        |
|  src/pages/posts/*.md        |
|  post-1.md ~ post-4.md       |
|  frontmatter: title/desc/    |
|  pubDate/author/image/tags   |
|  frontmatter.layout 指定     |
|  MarkdownPostLayout.astro    |
+---------------+--------------+
                |
                | 构建期收集: import.meta.glob('./posts/*.md', {eager:true})
                |             Astro.glob('../posts/*.md')
                v
+------------------------------+       +---------------------------------+
|  页面路由层 src/pages/        |       |  布局层 src/layouts/            |
|  index.astro      /          |       |  BaseLayout.astro               |
|  blog.astro       /blog/     |       |   (html骨架+Header+Footer+slot) |
|  about.astro      /about/    |       |  MarkdownPostLayout.astro       |
|  tags/index.astro /tags/     |       |   (文章元数据+tags+LikeButton)   |
|  tags/[tag].astro /tags/:tag |       +---------------------------------+
|  rss.xml.js       /rss.xml   |
|  folder/index.astro(空文件)   |       +---------------------------------+
+---------------+--------------+       |  组件层 src/components/          |
                |                      |  .astro 静态: Header/Footer/     |
                |  getStaticPaths()    |  Navigation/Hamburger/Social/    |
                |  枚举标签 --> 静态化   |  ThemeIcon/BlogPost              |
                v                      |  岛屿(client:load): Greeting.jsx |
+------------------------------+       |  LikeButton.jsx (Preact)        |
|  渲染输出 (纯静态 HTML)        |       +---------------------------------+
|  /                首页        |
|  /blog/          文章列表      |       +---------------------------------+
|  /posts/post-N/  文章详情      |       |  样式与脚本                      |
|  /tags/          标签目录      |       |  src/styles/global.css          |
|  /tags/<tag>/    标签筛选页    |       |  src/scripts/menu.js (汉堡菜单)  |
|  /rss.xml        RSS 订阅      |       |  ThemeIcon 内联 script (暗色模式)|
|  /about/         关于页        |       +---------------------------------+
+------------------------------+
```

## 2. 模块说明

### 2.1 内容源 — `src/pages/posts/*.md`

4 篇文章（post-1 ~ post-4），frontmatter 关键字段：

| 字段 | 说明 |
| --- | --- |
| `layout` | 指向 `../../layouts/MarkdownPostLayout.astro`，Markdown 渲染时自动套用该布局 |
| `title` / `description` / `author` / `pubDate` | 文章元数据，由布局展示 |
| `image: { url, alt }` | 文章头图 |
| `tags` | 字符串数组，驱动标签页生成 |

注意：`posts/` 目录位于 `src/pages/` 内，因此每篇 `.md` 同时也是路由 `/posts/post-N/`，Markdown 正文由 frontmatter 指定的 `layout` 包裹渲染。

### 2.2 页面路由层 — `src/pages/`

| 文件 | 路由 | 数据获取方式 |
| --- | --- | --- |
| `index.astro` | `/` | 无动态数据；渲染 `Greeting` 岛屿（`client:load`） |
| `blog.astro` | `/blog/` | `import.meta.glob("./posts/*.md", { eager: true })` 收集全部文章，渲染标题链接列表 |
| `about.astro` | `/about/` | 页面内静态数据（`identity`、`skills` 等常量）；演示 `define:vars` 传样式变量 |
| `tags/index.astro` | `/tags/` | `Astro.glob("../posts/*.md")`，取所有 `frontmatter.tags` 去重得到标签集合 |
| `tags/[tag].astro` | `/tags/:tag` | `getStaticPaths()` 枚举所有唯一标签，按标签过滤文章后经 `Astro.props` 传入 |
| `rss.xml.js` | `/rss.xml` | `@astrojs/rss` 的 `GET()` 端点，`pagesGlobToRssItems` 把所有 md 转为 RSS items |
| `folder/index.astro` | `/folder/` | 空文件（教程遗留） |

### 2.3 布局层 — `src/layouts/`

| 布局 | 职责 |
| --- | --- |
| `BaseLayout.astro` | HTML 骨架：`<head>`（charset/favicon/viewport/title）、`Header`、`<h1>{pageTitle}</h1>`、`<slot />`、`Footer`；引入 `global.css` 并通过 `<script>` 加载 `menu.js` |
| `MarkdownPostLayout.astro` | 文章布局，包裹在 BaseLayout 内：展示 `frontmatter` 的 description / pubDate / author / 头图 / 标签链接，末尾挂 `LikeButton` 岛屿（`client:load`） |

### 2.4 组件层 — `src/components/`

**Astro 静态组件（构建期渲染，零客户端 JS）：**

| 组件 | 说明 |
| --- | --- |
| `Header.astro` | 组合 `Hamburger` + `ThemeIcon` + `Navigation` |
| `Navigation.astro` | 四个站内链接：首页 / 关于 / 博客 / 标签 |
| `Hamburger.astro` | 汉堡菜单图标（三条线），点击行为由 `menu.js` 实现 |
| `ThemeIcon.astro` | 明暗主题切换按钮；内联 `<script is:inline>` 读取 localStorage 与 `prefers-color-scheme`，切换 `<html>` 的 `.dark` class |
| `Social.astro` | 社交链接（接收 `platform`、`username` props） |
| `Footer.astro` | 组合三个 `Social`（twitter / github / youtube） |
| `BlogPost.astro` | 列表项 `<li><a href={url}>{title}</a></li>` |

**Preact 岛屿（`client:load` 水合，客户端运行）：**

| 组件 | 说明 |
| --- | --- |
| `Greeting.jsx` | 随机欢迎语按钮（`preact/hooks` 的 `useState`），用于首页 |
| `LikeButton.jsx` | 文章点赞按钮；点赞数与是否已赞持久化到 `localStorage`（键：`likes_{postId}`、`liked_{postId}`），含点赞动画与火花特效 |

### 2.5 脚本与样式

- `src/scripts/menu.js`：点击 `.hamburger` 时切换 `.nav-links` 的 `expanded` class（移动端菜单展开/收起）。
- `src/styles/global.css`：全局样式，由 `BaseLayout` 引入。
- `LikeButton.css`：点赞按钮样式，被 `LikeButton.jsx` 直接 import。

### 2.6 配置 — `astro.config.mjs`

```js
export default defineConfig({
  site: "https://example.com",   // RSS 与 sitemap 使用的站点地址
  integrations: [preact()]       // 启用 Preact 岛屿支持
});
```

## 3. 技术栈

| 类别 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | Astro 5 | 纯静态输出（SSG），文件即路由 |
| UI 集成 | @astrojs/preact + Preact 10 | `Greeting`、`LikeButton` 两个交互岛屿 |
| RSS | @astrojs/rss | 生成 `/rss.xml` 订阅源 |
| 内容 | 原生 Markdown + frontmatter `layout` | 未使用 Content Collections，靠 glob 收集 |
| 语言 | JavaScript / TypeScript 配置 | `tsconfig.json` 继承 Astro 基础配置 |
| 包管理 | pnpm | `pnpm-lock.yaml` |
| 命令 | `astro dev` / `astro build` / `astro preview` | 开发 / 构建 / 预览 |

## 4. 目录结构

```
astro-blog/
├── astro.config.mjs            # site + preact 集成
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── BlogPost.astro      # 文章列表项
│   │   ├── Footer.astro        # 页脚（社交链接）
│   │   ├── Greeting.jsx        # Preact 岛屿：随机问候
│   │   ├── Hamburger.astro     # 汉堡图标
│   │   ├── Header.astro        # 页头组合
│   │   ├── LikeButton.jsx      # Preact 岛屿：localStorage 点赞
│   │   ├── LikeButton.css
│   │   ├── Navigation.astro    # 站内导航
│   │   ├── Social.astro        # 社交链接
│   │   └── ThemeIcon.astro     # 明暗主题切换（内联脚本）
│   ├── layouts/
│   │   ├── BaseLayout.astro    # 全站 HTML 骨架
│   │   └── MarkdownPostLayout.astro  # Markdown 文章布局
│   ├── pages/
│   │   ├── index.astro         # 首页（Greeting 岛屿）
│   │   ├── about.astro         # 关于页
│   │   ├── blog.astro          # 文章列表
│   │   ├── folder/index.astro  # 空文件
│   │   ├── posts/post-1~4.md   # 内容源（同时即文章路由）
│   │   ├── rss.xml.js          # RSS 端点
│   │   └── tags/
│   │       ├── index.astro     # 标签目录
│   │       └── [tag].astro     # 标签筛选页（getStaticPaths）
│   ├── scripts/menu.js         # 汉堡菜单交互
│   └── styles/global.css
└── package.json
```
