# Lunara — AI 女友聊天陪伴

基于 Next.js（App Router）+ Prisma + Neon Postgres + Cloudflare R2 实现，详见 `AI女友SPEC.md`。

## 技术栈

- Next.js 16 / React 19 / TypeScript / Tailwind CSS 4
- Prisma 7（`@prisma/adapter-pg` 驱动适配器）+ Neon Postgres
- NextAuth (Auth.js) v5，Google 一键登录
- Cloudflare R2（S3 兼容协议）存储聊天图片与语音
- 火山方舟 chat/completions（LLM）、火山方舟 images/generations（图片生成）、字节 TTS `unidirectional`（语音合成）

## 本地启动

1. 复制环境变量模板并填入真实凭证：
   ```bash
   cp .env.example .env
   ```
   需要准备：
   - Neon 项目的 `DATABASE_URL`
   - `NEXTAUTH_SECRET`（`openssl rand -base64 32`）
   - Google Cloud Console 创建的 OAuth 客户端 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`（回调地址 `http://localhost:3000/api/auth/callback/google`）
   - 火山方舟 `ARK_API_KEY`
   - 字节 TTS `TTS_API_KEY`
   - Cloudflare R2 的 Access Key / Secret / Bucket / 公开访问域名

2. 安装依赖（已在脚手架阶段装好，如需重装）：
   ```bash
   npm install
   ```

3. 建表 + 生成 Client + 灌入 6 个预制角色：
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   npx prisma db seed
   ```

4. 启动开发服务器：
   ```bash
   npm run dev
   ```

## 目录说明

- `prisma/schema.prisma` — 数据模型（User / Character / UserCharacter / Message / Memory / Payment，详见文件内注释）
- `prisma/seed.ts` — 读取仓库根目录 `*-character.json` 灌入 `Character` 表
- `src/lib/` — 第三方能力封装：`llm.ts`（对话）、`tts.ts`（语音）、`imagegen.ts`（图片生成）、`r2.ts`（存储）、`memory.ts`（记忆抽取）、`affinity.ts`（好感度评分）、`prompt.ts`（system prompt 组装）、`billing.ts`（试用/订阅状态）
- `src/app/api/` — 全部接口（角色选择/切换、聊天发送、语音懒加载、图片生成、游客模式、上传、订阅）
- `src/components/` — 首页选角、聊天窗口（微信风格）、订阅页 UI

## 已知限制 / 后续需要接的东西

- 支付走 Mock（点击即成功），`Payment` 表结构已经为接入真实支付网关（如 Stripe）预留了扩展空间
- 6 个角色暂时用渐变占位头像（`public/characters/*.svg`），后续可用图片生成接口批量产出真实形象图后替换 `Character.avatarUrl`
- 内容审核是关键词黑名单兜底（`src/lib/moderation.ts`），生产环境建议接入专业审核服务
- TTS 音色暂时全员共用 SPEC 示例里的 `zh_female_vv_uranus_bigtts`，需要为每个角色替换成独立音色 ID
