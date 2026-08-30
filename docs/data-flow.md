# astro-blog 数据流

## 1. 构建期数据流（SSG）

`astro build` 时，Astro 扫描 `src/pages/` 生成路由；Markdown 文章在此阶段被收集、套用布局并静态化为 HTML。

### 1.1 文章列表页 `/blog/`

```
src/pages/posts/*.md
      |
      | import.meta.glob('./posts/*.md', { eager: true })
      v
+-------------------------------------------+
| pages/blog.astro (frontmatter)            |
| allPosts = Object.values(glob 结果)        |
| 每个元素: { url, frontmatter: {title,...} } |
+---------------------+---------------------+
                      | map
                      v
+-------------------------------------------+
| <BlogPost url={post.url}                  |
|           title={post.frontmatter.title}/> |
|   --> <li><a href={url}>{title}</a></li>   |
+---------------------+---------------------+
                      v
              静态 HTML: /blog/index.html
```

### 1.2 文章详情页 `/posts/post-N/`

```
src/pages/posts/post-N.md
      |
      | (每篇 .md 本身就是 src/pages/ 内的路由文件)
      v
+-------------------------------------------+
| Astro Markdown 渲染管线                     |
| 1. 解析 frontmatter (title/description/    |
|    pubDate/author/image/tags/postId 相关)  |
| 2. 正文 Markdown --> HTML                  |
| 3. 读取 frontmatter.layout 指定的布局       |
|    = ../../layouts/MarkdownPostLayout.astro|
+---------------------+---------------------+
                      | frontmatter + 正文 <slot/>
                      v
+-------------------------------------------+
| MarkdownPostLayout.astro                   |
|   包裹 BaseLayout (Header/Footer/标题)      |
|   展示: description / pubDate / author      |
|         / 头图 <img> / 标签链接              |
|   <slot/> = 文章正文 HTML                   |
|   <LikeButton client:load postId=.../>     |
+---------------------+---------------------+
                      v
          静态 HTML: /posts/post-N/index.html
```

### 1.3 标签目录页 `/tags/` 与标签筛选页 `/tags/:tag/`

```
posts/*.md 的 frontmatter.tags
      |
      | Astro.glob('../posts/*.md')         import.meta.glob(..., {eager:true})
      v                                              |
+---------------------------+                        v
| tags/index.astro          |          +----------------------------------+
| tags = [...new Set(       |          | tags/[tag].astro                 |
|   allPosts.map(p =>       |          | getStaticPaths():                |
|     p.frontmatter.tags)   |          |   去重得到 uniqueTags             |
|   .flat())]               |          |   每个标签:                      |
+------------+--------------+          |     params: { tag }              |
             |                          |     props: { posts: 该标签的文章 } |
             v                          +----------------+-----------------+
  渲染标签链接列表                                  |
  /tags/<tag>                                      v
                                     +----------------------------------+
                                     | Astro.params.tag + Astro.props    |
                                     | <BlogPost url title/> 渲染过滤结果  |
                                     +----------------+-----------------+
                                                      v
                                       每个标签静态化为 /tags/<tag>/index.html
```

### 1.4 RSS 订阅源 `/rss.xml`

```
posts/**/*.md
      |
      | import.meta.glob('./**/*.md')
      v
+-------------------------------------------+
| pages/rss.xml.js :: GET(context)          |
| rss({ title, description,                 |
|       site: context.site,   <-- astro.config.mjs 的 site |
|       items: pagesGlobToRssItems(...),    |
|       customData: <language>en-us</language> })           |
+---------------------+---------------------+
                      v
              响应: application/rss+xml
```

## 2. 运行期数据流

Astro 默认零客户端 JS，绝大多数页面在运行期是纯静态 HTML；仅有两处客户端行为（均为 Preact 岛屿）。

### 2.1 岛屿水合（`client:load` 指令）

```
静态 HTML 到达浏览器
      |
      | client:load --> 立即加载该岛屿的 JS 并水合
      v
+---------------------------+     +------------------------------+
| Greeting.jsx (首页)        |     | LikeButton.jsx (文章页)       |
| messages 数组 (props)     |     | props: postId                |
| useState 随机切换问候语     |     | useEffect 读取 localStorage  |
+---------------------------+     |   likes_{postId}  点赞数      |
                                  |   liked_{postId}  是否已赞    |
+---------------------------+     | 点击 --> 更新计数并写回        |
| menu.js (普通 <script>)    |     | localStorage (无服务端)       |
| 点击 .hamburger 切换       |     +------------------------------+
| .nav-links 的 expanded     |
+---------------------------+     +------------------------------+
                                  | ThemeIcon.astro 内联脚本      |
                                  | localStorage.theme 或        |
                                  | prefers-color-scheme         |
                                  | --> 切换 <html>.dark class   |
                                  +------------------------------+
```

### 2.2 请求流程总览

```
浏览器 --GET /blog/---------> 静态 HTML (构建期已生成)
      --GET /posts/post-1/--> 静态 HTML (MarkdownPostLayout 包裹)
      --GET /tags/astro/----> 静态 HTML (getStaticPaths 枚举生成)
      --GET /rss.xml--------> RSS XML
      --GET /_astro/*.js----> 仅岛屿 JS (Greeting / LikeButton 水合)
```

无服务端 API、无数据库；所有动态交互状态（点赞数、主题、菜单）均持久化在浏览器 `localStorage` 或 DOM class 中。

## 3. 数据结构

### 3.1 Markdown 文章 frontmatter（内容源）

```yaml
---
layout: ../../layouts/MarkdownPostLayout.astro
title: '我的第一篇博客文章'
pubDate: 2022-07-01
description: '这是我 Astro 博客的第一篇文章。'
author: 'Astro 学习者'
image:
    url: 'https://docs.astro.build/assets/rose.webp'
    alt: 'The Astro logo ...'
tags: ["astro", "blogging", "learning in public"]
---
正文 Markdown ...
```

### 3.2 glob 收集结果的单个元素

```js
{
  url: '/posts/post-1',       // 由文件路径推导的路由
  frontmatter: {
    title, description, pubDate, author,
    image: { url, alt },
    tags: ['astro', 'blogging', 'learning in public'],
  },
}
```

### 3.3 `getStaticPaths()` 返回元素（`tags/[tag].astro`）

```js
{
  params: { tag: 'astro' },
  props:  { posts: [/* 含该标签的文章对象数组 */] },
}
```

### 3.4 LikeButton 的 localStorage 结构

| 键 | 值 | 含义 |
| --- | --- | --- |
| `likes_{postId}` | 数字字符串（如 `"5"`） | 该文章的点赞数 |
| `liked_{postId}` | `"true"` / `"false"` | 当前用户是否已赞 |

## 4. 接口 / 端点清单

| 类型 | 端点/文件 | 方法 | 输入 | 输出 |
| --- | --- | --- | --- | --- |
| RSS 端点 | `src/pages/rss.xml.js` | `GET(context)` | `context.site`（astro.config.mjs） | RSS 2.0 XML（含全部文章 items） |
| HTTP 接口 | 其余 | — | — | 无；全站为纯静态输出，无其他 API |

## 5. 组件清单

### 5.1 布局

| 组件 | Props | 职责 |
| --- | --- | --- |
| `BaseLayout.astro` | `pageTitle` | HTML 骨架、head 元信息、Header/Footer、加载 menu.js |
| `MarkdownPostLayout.astro` | `frontmatter` | 文章元数据展示 + 正文 `<slot/>` + LikeButton 岛屿 |

### 5.2 Astro 组件（静态）

| 组件 | Props | 职责 |
| --- | --- | --- |
| `Header.astro` | 无 | 组合 Hamburger / ThemeIcon / Navigation |
| `Navigation.astro` | 无 | 首页/关于/博客/标签 导航链接 |
| `Hamburger.astro` | 无 | 汉堡菜单图标 |
| `ThemeIcon.astro` | 无 | 明暗主题切换按钮 + 内联初始化脚本 |
| `Social.astro` | `platform, username` | 单条社交链接 |
| `Footer.astro` | 无 | 三条 Social 链接 |
| `BlogPost.astro` | `title, url` | 文章列表项链接 |

### 5.3 Preact 岛屿（`client:load`）

| 组件 | Props | 交互 |
| --- | --- | --- |
| `Greeting.jsx` | `messages: string[]` | 点击按钮随机切换问候语（useState） |
| `LikeButton.jsx` | `postId: string` | 点赞/取消点赞，计数持久化到 localStorage，带动画特效 |
