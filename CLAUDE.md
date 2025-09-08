# Simple备份文件可视化工具 - 开发文档

## 项目概述

这是一个将Simple社交平台导出的JSON格式动态备份文件转换为可视化HTML网页或PDF文档的工具。项目使用纯AI开发，最终部署在Simple官方服务器上。

## 技术架构

### 技术栈

#### 前端 (Client)
- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5.0.8
- **样式框架**: Tailwind CSS 3.3.6
- **UI组件**:
  - Lucide React (图标库)
  - React Dropzone (文件拖拽上传)
  - React Hot Toast (消息提示)
- **HTTP客户端**: Axios 1.6.2

#### 后端 (Server)
- **运行时**: Node.js (>=16.0.0)
- **框架**: Express 4.18.2 + TypeScript
- **核心依赖**:
  - Puppeteer 21.6.1 (PDF生成)
  - Sharp 0.32.6 (图片处理)
  - Multer 1.4.5 (文件上传)
  - UUID 9.0.1 (唯一标识符)
  - Helmet 7.1.0 (安全)
  - Express Rate Limit 7.1.5 (限流)
  - Compression 1.7.4 (响应压缩)

### 目录结构

```
simple-backup-visualizer/
├── client/                      # 前端应用
│   ├── src/
│   │   ├── components/         # React组件
│   │   │   ├── FileUploader.tsx       # 文件上传组件
│   │   │   ├── DataPreview.tsx        # 数据预览组件
│   │   │   ├── DocumentGenerator.tsx  # 文档生成配置
│   │   │   ├── PDFGenerator.tsx       # PDF生成组件
│   │   │   ├── Header.tsx             # 页头组件
│   │   │   └── Footer.tsx             # 页脚组件
│   │   ├── services/           # API服务层
│   │   ├── types/             # TypeScript类型定义
│   │   ├── utils/             # 工具函数
│   │   ├── App.tsx            # 主应用组件
│   │   ├── main.tsx           # 应用入口
│   │   └── index.css          # 全局样式
│   ├── package.json
│   ├── vite.config.ts         # Vite配置
│   ├── tailwind.config.js    # Tailwind配置
│   └── tsconfig.json          # TypeScript配置
│
├── server/                     # 后端服务
│   ├── src/
│   │   ├── routes/            # API路由
│   │   │   ├── health.ts     # 健康检查
│   │   │   └── pdf.ts        # PDF生成路由
│   │   ├── services/          # 核心服务
│   │   │   ├── htmlGenerator.ts      # HTML生成器
│   │   │   ├── pdfGenerator.ts       # PDF生成器
│   │   │   ├── imageProcessor.ts     # 图片处理
│   │   │   └── mediaProcessor.ts     # 媒体处理
│   │   ├── utils/             # 工具模块
│   │   └── server.ts          # 服务器入口
│   ├── uploads/               # 上传文件临时存储
│   ├── output/                # 生成文件输出
│   ├── temp/                  # 临时文件
│   ├── package.json
│   └── tsconfig.json
│
├── assets/                     # 静态资源
├── 启动.ps1                   # PowerShell启动脚本
├── 启动.bat                   # Windows批处理脚本
├── 启动.sh                    # Linux/Mac Shell脚本
├── package.json               # 根项目配置
├── README.md                  # 用户文档
└── CLAUDE.md                  # 开发文档（本文件）
```

## 常用命令

### 快速启动

```bash
# Windows (推荐使用PowerShell)
.\启动.ps1

# Windows (批处理)
启动.bat

# Linux/Mac
./启动.sh
```

### 开发命令

```bash
# 安装所有依赖
npm run install:all

# 启动开发环境（前端+后端）
npm run dev

# 仅启动前端
npm run dev:client

# 仅启动后端
npm run dev:server

# 构建生产版本
npm run build

# 清理构建文件
npm run clean
```

### 测试和调试

```bash
# 运行后端测试
cd server && npm test

# 检查代码规范
cd client && npm run lint
cd server && npm run lint

# 修复代码规范问题
cd server && npm run lint:fix
```

### 依赖管理

```bash
# 更新依赖
npm update

# 检查过期依赖
npm outdated

# 安装新依赖（前端）
cd client && npm install <package-name>

# 安装新依赖（后端）
cd server && npm install <package-name>
```

## 数据格式规范

### 输入JSON格式

```typescript
interface DiaryEntry {
  date: string;           // 日期时间 "YYYY-MM-DD HH:mm:ss"
  content?: string;       // 文本内容
  collection?: string;    // 分类/合集名称
  album?: Array<{        // 图片/视频数组
    type: "image" | "video";
    url: string;
  }>;
  audio?: string;        // 音频URL（语音条）
  music?: string;        // 音乐分享链接
  tags?: string[];       // 标签数组
}
```

### 支持的媒体类型

- **图片**: JPG, PNG, GIF, WebP
- **视频**: MP4, WebM
- **音频**: M4A, MP3, WAV
- **音乐分享**: 网易云音乐、QQ音乐等平台链接

## 代码规范

### TypeScript规范

1. **类型定义**
   - 所有函数参数和返回值必须有类型定义
   - 使用interface定义对象结构
   - 避免使用any类型

2. **命名规范**
   - 组件名使用PascalCase: `FileUploader`
   - 函数名使用camelCase: `generateHTML`
   - 常量使用UPPER_SNAKE_CASE: `MAX_FILE_SIZE`
   - 文件名使用camelCase或kebab-case

3. **文件组织**
   - 每个组件一个文件
   - 相关的类型定义放在types目录
   - 工具函数放在utils目录

### React组件规范

```tsx
// 组件模板
import React from 'react';

interface ComponentProps {
  prop1: string;
  prop2?: number;
}

export const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 = 0 }) => {
  // 组件逻辑
  return (
    <div>
      {/* JSX内容 */}
    </div>
  );
};
```

### API规范

```typescript
// API响应格式
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 错误处理
try {
  // 业务逻辑
} catch (error) {
  console.error(`${jobId}: 错误信息`, error);
  return {
    success: false,
    error: error.message
  };
}
```

## 开发环境配置

### 系统要求

- Node.js 16+ (推荐 18+ 或 20+)
- npm 或 yarn
- 现代浏览器 (Chrome 88+, Firefox 85+, Safari 14+)
- 可用内存 512MB+
- 磁盘空间 1GB+

### 环境变量配置

创建 `server/.env` 文件：

```bash
# 服务器配置
PORT=3000
NODE_ENV=development

# 跨域配置
CORS_ORIGIN=http://localhost:5173

# 文件配置
MAX_FILE_SIZE=10485760          # 10MB
TEMP_DIR_CLEANUP_HOURS=24       # 临时文件清理时间

# 文档生成配置
PUPPETEER_TIMEOUT=30000         # PDF生成超时时间(ms)
DEFAULT_THEME=light              # 默认主题

# 图片处理配置
IMAGE_QUALITY=80                # 图片质量(1-100)
IMAGE_MAX_WIDTH=1200            # 最大宽度(px)
IMAGE_MAX_HEIGHT=800            # 最大高度(px)
```

### VS Code推荐配置

`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

### 推荐VS Code扩展

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- Auto Rename Tag
- Path Intellisense

## 核心功能实现

### 文件上传处理

```typescript
// 文件上传配置
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('只支持JSON文件'));
    }
  }
});
```

### HTML生成流程

1. 解析JSON数据
2. 处理日期格式
3. 按月份分组
4. 生成HTML结构
5. 注入样式和脚本
6. 保存到临时文件

### PDF生成流程

1. 生成HTML文件
2. 启动Puppeteer无头浏览器
3. 加载HTML页面
4. 等待资源加载完成
5. 生成PDF
6. 清理临时文件

## 测试数据

项目包含两个测试文件（仅使用这两个文件进行测试）：
- `test_data_250_entries.json` - 250条数据，用于快速功能验证（推荐用于视频测试）
- `test_data_1870_entries.json` - 1870条完整数据，用于完整测试

**注意**: 
- 一般情况下使用 `test_data_250_entries.json` 进行功能验证，运行速度更快
- 仅当需要测试大数据量处理时才使用 `test_data_1870_entries.json`
- 不要使用其他JSON文件进行测试