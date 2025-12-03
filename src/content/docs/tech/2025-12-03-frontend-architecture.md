---
title: SkillStream 前端技术架构解析
description: 剖析 SkillStream 在线教育平台的前端技术选型、架构设计与核心实现细节。
date: 2025-12-03
tags: ["Vue 3", "Vite", "Architecture", "Frontend", "技术"]
---

最近接了一个项目，项目是要做一个在线教育平台，项目大量使用AI生成前端代码。但由于工期很紧，所以基本没有时间去深入了解AI生成的代码，本文现在就是在对AI生成的代码进行分析，整理成我的学习笔记。

## 1. 项目概览与架构背景

**SkillStream** 是一个全栈在线教育平台，采用前后端分离架构。前端部分采用 **SPA (Single Page Application)** 模式，旨在提供类原生应用的流畅交互体验。

### 1.1 核心功能模块

*   **门户系统**：内容分发与公告展示。
*   **用户中心**：统一身份认证（JWT）、RBAC 角色权限控制。
*   **后台管理 (Admin)**：
    *   基于数据驱动的用户与教务管理。
    *   富文本与多媒体课程内容的生产与编排。
    *   结构化题库管理与试卷生成。
*   **学员中心 (Student)**：
    *   沉浸式流媒体播放体验。
    *   实时交互的在线测评系统。
    *   可视化学习数据分析。

### 1.2 架构特征详解

这里记录一下本项目用到的几个核心架构概念：

#### (1) 渲染模式：CSR (客户端渲染)
**CSR (Client-Side Rendering)** 意味着页面的 HTML 结构主要是在**浏览器端**通过 JavaScript 生成的，而不是由服务器直接返回完整的 HTML。
*   **直观理解**：浏览器先下载一个空的“壳”（`index.html`），然后再下载 JS 代码把内容“填”进去。
*   **优点**：页面切换非常快，体验像原生 APP。

#### (2) 路由策略：前端路由接管
使用了 `vue-router`，这意味着 URL 的变化不会触发浏览器的刷新，而是由 JS 拦截并替换页面内容。

*   **动态路由匹配**：
    比如视频播放页，URL 是 `/video/101`，这里的 `101` 是动态参数。
    ```typescript
    // 路由配置示例
    { path: '/video/:id', component: VideoPlayer }
    ```

*   **导航守卫 (Navigation Guards)**：
    在跳转前进行拦截，比如“没登录不准进后台”。
    ```typescript
    // src/router/index.ts 中的真实逻辑简化
    router.beforeEach((to, from, next) => {
      const isLogin = checkLoginStatus();
      // 如果要去 /admin 开头的页面，且没登录
      if (to.path.startsWith('/admin') && !isLogin) {
        next('/login'); // 强制跳转到登录页
      } else {
        next(); // 放行
      }
    });
    ```

#### (3) 模块化：ES Modules
项目使用了现代 JavaScript 的标准模块规范 (`import` / `export`)。
这意味着我们可以把代码拆分成很多小文件，需要用的时候再引入，而不是写在一个巨大的文件里。

```typescript
// 例子：从 Vue 中按需引入 ref 功能
import { ref } from 'vue';
```

---

## 2. 核心技术栈选型

这里整理了项目用到的主要工具，以及**为什么**要选它们（面试或写文档时很有用）：

| 工具 | 作用 | 为什么选它？(我的理解) |
| :--- | :--- | :--- |
| **Vue 3** | **画界面的** | 它的 Composition API (组合式 API) 写逻辑很舒服，不像 Vue 2 那么散。 |
| **Vite** | **跑项目的** | 启动速度极快，改了代码浏览器秒变，不用等半天。 |
| **TypeScript** | **写代码的** | 给 JS 加上了类型检查。虽然写起来麻烦点，但能防止拼写错误，代码提示也更强。 |
| **Element Plus** | **UI 组件库** | 后台管理系统专用。拿来就能用的表格、按钮，长得比较标准。 |
| **TailwindCSS** | **CSS 框架** | 写样式的神器。不用起类名，直接写 `class="text-red-500"` 这种原子类。 |

---

## 3. 构建工具：Vite 的深度应用

Vite 是我在这个项目里学到的一个新东西，它和以前的 Webpack 很不一样。

### 3.1 为什么 Vite 这么快？

*   **以前 (Webpack)**：
    启动项目前，必须把整个项目的所有文件都打包一遍。项目越大，启动越慢（可能要几十秒）。
*   **现在 (Vite)**：
    **按需加载**。它不打包，浏览器要哪个文件，它就编译哪个文件。
    *   **冷启动**：几乎是瞬间的。
    *   **热更新 (HMR)**：改了代码，浏览器里只有那个模块会变，其他不动。

### 3.2 生产环境构建
虽然开发时很快，但上线时为了兼容性和加载速度，Vite 还是会把代码打包成几个文件（基于 Rollup）。这保证了用户访问时加载最快。

---

## 4. UI 设计体系：混合驱动策略

这个项目很有意思，同时用了两个 CSS 框架。我分析了一下，它们分工很明确：

### 4.1 Element Plus：负责“后台管理”
后台管理系统（Admin）需要大量的表格、表单、分页器。
如果自己写 CSS 太累了，用 Element Plus 可以直接复制粘贴代码：

```html
<!-- 只要写这一行，就是一个标准的蓝色按钮 -->
<el-button type="primary">保存配置</el-button>
```

### 4.2 TailwindCSS：负责“学员端”
学员端（Student）界面比较个性化，比如视频卡片、个人中心。
Element Plus 的样式太死板，改起来难。这时候用 TailwindCSS 就很灵活：

```html
<!-- 翻译：弹性布局、垂直居中、内边距4、白色背景、圆角、阴影 -->
<div class="flex items-center p-4 bg-white rounded-lg shadow-md">
  <span class="text-lg font-bold">课程标题</span>
</div>
```
**优点**：不用绞尽脑汁给 `div` 起名字（比如 `course-card-wrapper`），直接写样式类名就行。

---

## 5. 状态管理：自定义实现 (无 Pinia)

这个项目**没有用任何状态管理库**，而是自己写了一个简单的。

### 5.1 原理
Vue 3 的 `reactive` 和 `ref` 其实可以单独使用，不一定要写在组件里。
如果我们把它们写在一个单独的 `.ts` 文件里，导出给所有组件用，它就成了一个**全局变量**。

### 5.2 代码示例：用户登录状态

我把项目里的 `authStore.ts` 简化了一下，逻辑是这样的：

#### (1) 定义全局变量 (`authStore.ts`)
```typescript
import { reactive } from 'vue'

// reactive 让这个对象变成“响应式”的，一变大家都能收到通知
export const authState = reactive({
  isAuthenticated: false, // 是否登录
  user: null              // 用户信息
})

// 定义一个修改它的方法
export function login(userInfo) {
  authState.user = userInfo
  authState.isAuthenticated = true
}
```

#### (2) 在登录页修改它 (`Login.vue`)
```html
<script setup>
import { login } from './authStore'

function handleLogin() {
  // 调用方法，全局变量立马就变了
  login({ name: 'Tom' })
}
</script>
```

#### (3) 在导航栏显示它 (`NavBar.vue`)
```html
<script setup>
import { authState } from './authStore'
</script>

<template>
  <!-- 只要 authState 变了，这里会自动更新 -->
  <div v-if="authState.isAuthenticated">
    欢迎回来，{{ authState.user.name }}
  </div>
  <div v-else>请登录</div>
</template>
```

---

## 6. 核心功能解析：视频与云存储

除了基础架构，我还研究了项目里最核心的两个功能：**视频播放**和**七牛云上传**。

### 6.1 视频播放器 (VideoPlayer.vue)
项目没有直接用原生 `<video>` 标签，而是封装了一个功能强大的播放器组件。

*   **核心逻辑**：
    使用了 `useVideoPlayer` 这个组合式函数（Composable）来管理播放状态。这是一种很好的代码组织方式，把逻辑（播放、暂停、进度）和界面（按钮、进度条）分开了。

*   **关键代码片段**：
    ```typescript
    // VideoPlayer.vue
    const {
      isPlaying,
      togglePlay,
      currentTime,
      duration
    } = useVideoPlayer(props.videoSrc)
    ```

*   **亮点功能**：
    1.  **自动记录进度**：每 10 秒钟会自动触发一次 `progress-update` 事件，通知后端保存学习进度。
    2.  **键盘快捷键**：封装了 `useKeyboardShortcuts`，支持空格暂停、方向键快进。

### 6.2 七牛云上传 (useQiniuUpload)
视频文件很大，不能直接传给后端服务器（会把服务器撑爆）。项目采用了**前端直传七牛云**的方案。

*   **流程解析**：
    1.  **前端**向**后端**要一个“上传凭证” (Upload Token)。
    2.  **后端**生成凭证返回给前端（后端不接触文件）。
    3.  **前端**拿到凭证，直接把文件传给**七牛云服务器**。
    4.  **七牛云**返回文件的 URL。
    5.  **前端**把这个 URL 发给后端保存。

*   **代码实现**：
    项目封装了一个 `useQiniuUpload.ts`，把复杂的七牛 SDK 调用变成了简单的函数：

    ```typescript
    // 伪代码演示
    const { upload } = useQiniuUpload({
      file: myVideoFile,
      onSuccess: (res) => {
        console.log('上传成功，文件地址是：', res.url)
      }
    })
    ```

*   **为什么这么做？**
    *   **省带宽**：大流量直接走七牛云，不经过我们自己的服务器。
    *   **速度快**：七牛云有 CDN 加速，上传下载都快。

---

## 7. 源码阅读指南

由于整个项目源码没怎么读过，而且也是一个前端小白，我需要后期慢慢消化这些知识点。

### 第一阶段：搞懂“壳”是怎么跑起来的
不要管具体的业务逻辑，先看懂这个网站是怎么“搭”起来的。

1.  **入口文件 `src/main.ts`**：
    *   这是整个程序的起点。
    *   看它是怎么创建 Vue 应用 (`createApp`)，怎么挂载路由 (`router`)。
    *   *目标：知道程序从哪里开始执行。*

2.  **根组件 `src/App.vue`**：
    *   这是所有页面的“父容器”。
    *   通常里面只有一个 `<router-view />`。
    *   *目标：理解 Vue 是怎么把不同页面“塞”进这个坑位里的。*

3.  **路由配置 `src/router/index.ts`**：
    *   **这是地图**。这是最重要的一步。
    *   看 `routes` 数组。比如 `/login` 对应哪个组件？`/student/home` 对应哪个组件？
    *   *目标：脑子里有一张地图，知道 URL 和代码文件的对应关系。*

### 第二阶段：读懂一个最简单的页面
找一个逻辑最简单的页面，完整地看懂它是怎么写的。推荐先看 **登录页 (`src/views/Login.vue`)**。

1.  **看模板 (`<template>`)**：
    *   看 HTML 结构。用了哪些 Element Plus 组件（比如 `<el-input>`, `<el-button>`）？
    *   看 `v-model` 是怎么绑定数据的。

2.  **看逻辑 (`<script setup>`)**：
    *   看 `ref` 和 `reactive` 是怎么定义变量的。
    *   看点击登录按钮时触发了哪个函数 (`handleLogin`)。
    *   看它是怎么调用 API 的。

### 第三阶段：理解核心业务流程
现在可以挑战稍微复杂一点的业务了。建议按这个顺序：

1.  **布局组件 (`src/layouts/`)**：
    *   看 `StudentLayout.vue`。理解侧边栏、顶部导航栏是怎么复用的。
2.  **列表页 (`src/views/student/CourseCenter.vue`)**：
    *   学习怎么从后端获取数据列表，怎么用 `v-for` 循环渲染卡片。
3.  **视频播放页 (`src/views/student/StudentVideoPlayer.vue`)**：
    *   这是核心难点。重点看它是怎么引入子组件 `VideoPlayer.vue` 的，以及父子组件怎么通信。