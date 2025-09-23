## Astro Hydration 指令分析

### Hydration 指令的作用
Hydration 指令控制**何时**以及**如何**在客户端激活 JavaScript 交互功能：

- `client:load` - 页面加载时立即hydrate
- `client:idle` - 浏览器空闲时hydrate
- `client:visible` - 元素进入视口时hydrate
- `client:media` - 匹配媒体查询时hydrate
- `client:only` - 只在客户端渲染

### 框架组件 vs Astro 组件

#### 框架组件 (.jsx, .vue, .svelte等)
```jsx
// Button.jsx - React组件
import { useState } from 'react';

export default function Button() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**特点：**
- 默认在服务端渲染为静态HTML
- **需要hydration指令才能在客户端交互**
- 可以使用框架特有的状态管理、生命周期等
- 支持所有hydration指令

#### Astro 组件 (.astro)
```astro
---
// Button.astro - Astro组件
const message = "Hello";
---
<button>{message}</button>
<style>
  button { color: blue; }
</style>
```

**特点：**
- **只在服务端运行**，输出静态HTML
- **不能hydrate**，没有客户端JavaScript
- 可以包含其他组件，但自身不参与客户端交互
- 更轻量，适合展示性内容

### 核心区别总结

| 特性 | 框架组件 | Astro 组件 |
|------|----------|------------|
| 客户端交互 | ✅ (需hydration指令) | ❌ |
| 服务端渲染 | ✅ | ✅ |
| 状态管理 | ✅ | ❌ |
| Hydration指令 | ✅ | ❌ |
| 性能 | 重 (有JS bundle) | 轻 (纯HTML) |

**选择原则：**
- 需要交互 → 框架组件 + hydration指令
- 纯展示内容 → Astro 组件