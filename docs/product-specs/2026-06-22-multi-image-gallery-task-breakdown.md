# 多图上传与养护图集 —— 功能规格

**版本**：v1.0
**日期**：2026-06-22
**关联文档**：
- 产品决策依据：[2026-06-22-multi-image-gallery-spec.md](./2026-06-22-multi-image-gallery-spec.md)（PRD）
- 架构约束：`ARCHITECTURE.md`
- 数据模型权威来源：`app/convex/schema.ts`

**文档定位**：基于 PRD 的产品决策，从工程视角给出可执行的任务清单、数据流设计、接口契约与验证命令。本文档回答"系统必须如何工作"。

---

## 0. 现状分析与技术可行性

### 0.1 已有基础

| 层 | 现状 | 可复用程度 |
|---|------|-----------|
| Schema | `plants.imageStorageId: v.optional(v.id("_storage"))`，仅单张封面 | **需新增 `gallery` 数组字段** |
| 后端 Mutation | `generatePlantImageUploadUrl` 已有 upload URL 生成逻辑 | 完全复用 |
| 后端 Query | `getPlantDetail` 返回植物详情含 `imageStorageId` + `imageUrl` | **需补充 gallery 数据** |
| 后端 Mutation | `completePlantTask` 无附图参数 | **需新增可选 `imageStorageId` 参数** |
| Schema | `taskCompletionLogs` 无图片字段 | **需新增可选 `imageStorageId`** |
| 前端 | `PlantDetailPage` 有 Hero 大图区域 | 需新增图集区域组件 |
| 前端 | 图片上传逻辑（`PlantForm.tsx` 内 canvas 压缩 + upload） | 压缩逻辑可抽取复用 |
| 前端 | 植物详情页已有 Hero 区 + 任务区 + 养护历史区布局 | 在 Hero 区下方插入图集区 |
| 前端 | 任务完成流程（`completePlantTask` + success 动画） | 需在动画后追加附图入口 |

### 0.2 改动范围总结

本次改造涉及四个维度：

1. **数据模型**：`plantFields` 新增 `gallery` 数组字段；`taskCompletionLogFields` 新增可选 `imageStorageId`
2. **后端接口**：新增 3 个 mutation（增/删图集照片、设为封面）+ 1 个任务附图 mutation；改造 `getPlantDetail` 返回图集；改造 `deletePlant` 级联删除
3. **前端组件**：植物详情页新增图集横向滚动区 + 全屏浏览模式；任务完成后附图浮层
4. **图片处理**：前端缩略图压缩逻辑抽取为可复用工具函数

---

## 1. 数据流设计

### 1.1 图集上传流程

```
用户点击"+"按钮
  |
  v 系统图片选择器（拍照/相册）
  |
  v 前端 canvas 压缩生成缩略图（短边 200px, JPEG 0.7）
  |
  +-- 请求 generatePlantImageUploadUrl x 2（原图 + 缩略图各一个 URL）
  |
  +-- 上传原图 -> 获得 imageStorageId
  |
  +-- 上传缩略图 -> 获得 thumbnailStorageId
  |
  v 调用 addPlantGalleryImage mutation
      args: { plantId, imageStorageId, thumbnailStorageId }
      |
      +-- 校验家庭归属
      +-- 校验 gallery 长度 < 20
      +-- 追加到 gallery 数组头部（最新在前）
      +-- 返回 { ok: true }
```

### 1.2 图集删除流程

```
用户在全屏浏览模式点击"删除"
  |
  v ConfirmSheet（danger 样式，二次确认）
  |
  v 调用 removePlantGalleryImage mutation
      args: { plantId, imageStorageId }
      |
      +-- 校验家庭归属
      +-- 从 gallery 数组中移除匹配项
      +-- 删除 _storage 中的原图和缩略图
      +-- 返回 { ok: true }
```

### 1.3 设为封面流程

```
用户在全屏浏览模式长按/点击"设为封面"
  |
  v 调用 setPlantCoverFromGallery mutation
      args: { plantId, imageStorageId }
      |
      +-- 校验家庭归属
      +-- 校验该 imageStorageId 存在于 gallery 数组中
      +-- 更新 plants.imageStorageId = args.imageStorageId
      +-- 返回 { ok: true }
```

### 1.4 任务完成附图流程

```
用户点击"完成"按钮
  |
  v completePlantTask mutation 执行（任务即时完成，返回 logId）
  |
  v 前端 success 动画播放
  |
  v 底部浮现"📷 记录一下？"入口（3 秒后自动消失）
  |
  +-- 用户不点击 -> 无后续操作
  |
  +-- 用户点击 -> 系统图片选择器
        |
        v 前端压缩生成缩略图
        |
        v 上传原图 + 缩略图（复用 generatePlantImageUploadUrl x 2）
        |
        v 调用 addTaskCompletionImage mutation
            args: { logId, plantId, imageStorageId, thumbnailStorageId }
            |
            +-- 校验家庭归属
            +-- 更新 taskCompletionLogs.imageStorageId
            +-- 追加到 plants.gallery 数组头部
            +-- 返回 { ok: true }
```

### 1.5 图集数据加载

```
getPlantDetail query（已有，需改造）
  |
  v 返回 plant 数据时，额外返回 gallery 数组
  |
  v 对每个 gallery 项批量获取 thumbnailUrl（ctx.storage.getUrl）
  |
  v 前端渲染：
      +-- 图集横向滚动区：加载 thumbnailUrl
      +-- 全屏浏览模式：按需加载 imageUrl（原图）
```

---

## 2. 数据模型变更

### 2.1 `plantFields` 新增 `gallery` 字段

**文件**：`app/convex/lib/validators.ts`

```typescript
// 在 plantFields 中新增：
gallery: v.optional(v.array(v.object({
  imageStorageId: v.id("_storage"),
  thumbnailStorageId: v.id("_storage"),
  uploadedBy: v.id("users"),
  uploadedAt: v.number(),  // UTC timestamp
}))),
```

**设计约束**：
- `v.optional` 向后兼容，老数据无需迁移（无 gallery 字段 = 空图集）
- 数组最大长度 20，由 mutation 逻辑保证
- 数组元素按 `uploadedAt` 降序排列（最新在头部），写入时维护顺序
- 内嵌在 plants 文档中（PRD D1：每盆最多 20 张，数据量可控，避免额外 join）

### 2.2 `taskCompletionLogFields` 新增 `imageStorageId`

**文件**：`app/convex/lib/validators.ts`

```typescript
// 在 taskCompletionLogFields 中新增：
imageStorageId: v.optional(v.id("_storage")),
```

**设计约束**：
- `v.optional` 向后兼容，已有日志无图片字段正常展示
- 该图片同时存在于对应植物的 gallery 数组中（双写保证关联）

### 2.3 索引评估

- 无需新增索引。图集数据内嵌在 `plants` 文档中，随植物详情一起加载。
- `taskCompletionLogs` 的现有索引 `by_plantId_and_completedAt` 足够支持时间线展示附图。

---

## 3. 后端接口契约

### 3.1 新增接口

| 接口 | 类型 | 文件 | 权限 | 行为 |
|------|------|------|------|------|
| `addPlantGalleryImage` | mutation | `app/convex/plants.ts` | 家庭成员 | 上传图片到 gallery |
| `removePlantGalleryImage` | mutation | `app/convex/plants.ts` | 家庭成员 | 从 gallery 移除指定照片 |
| `setPlantCoverFromGallery` | mutation | `app/convex/plants.ts` | 家庭成员 | 将图集照片设为封面 |
| `addTaskCompletionImage` | mutation | `app/convex/tasks.ts` | 家庭成员 | 任务完成后追加附图 |

**`addPlantGalleryImage` 契约**：

```typescript
export const addPlantGalleryImage = mutation({
  args: {
    plantId: v.id("plants"),
    imageStorageId: v.id("_storage"),
    thumbnailStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // 1. requireCurrentFamilyMember 校验登录态 + 家庭归属
    // 2. ctx.db.get(args.plantId) 校验植物存在且属于当前家庭
    // 3. 校验植物未归档（PRD D6：归档植物图集只读）
    // 4. 读取 plant.gallery ?? []，校验长度 < 20
    //    - 若 >= 20 -> throw "图集已满，请删除旧照片后再添加"
    // 5. 构造新 gallery 项：{ imageStorageId, thumbnailStorageId, uploadedBy: userId, uploadedAt: Date.now() }
    // 6. unshift 到 gallery 数组头部
    // 7. ctx.db.patch(plantId, { gallery: newGallery, updatedAt: Date.now() })
    // 8. return { ok: true }
  },
});
```

**`removePlantGalleryImage` 契约**：

```typescript
export const removePlantGalleryImage = mutation({
  args: {
    plantId: v.id("plants"),
    imageStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // 1. requireCurrentFamilyMember 校验登录态 + 家庭归属
    // 2. ctx.db.get(args.plantId) 校验植物存在且属于当前家庭
    // 3. 校验植物未归档
    // 4. 从 gallery 数组中找到 imageStorageId 匹配的项
    //    - 未找到 -> throw "照片不存在"
    // 5. 记录该项的 thumbnailStorageId
    // 6. filter 移除该项
    // 7. ctx.db.patch(plantId, { gallery: filteredGallery, updatedAt: Date.now() })
    // 8. ctx.storage.delete(args.imageStorageId) 删除原图
    // 9. ctx.storage.delete(thumbnailStorageId) 删除缩略图
    // 10. return { ok: true }
  },
});
```

**`setPlantCoverFromGallery` 契约**：

```typescript
export const setPlantCoverFromGallery = mutation({
  args: {
    plantId: v.id("plants"),
    imageStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // 1. requireCurrentFamilyMember 校验登录态 + 家庭归属
    // 2. ctx.db.get(args.plantId) 校验植物存在且属于当前家庭
    // 3. 校验 args.imageStorageId 存在于 plant.gallery 数组中
    //    - 不存在 -> throw "该照片不在图集中"
    // 4. ctx.db.patch(plantId, { imageStorageId: args.imageStorageId, updatedAt: Date.now() })
    // 5. return { ok: true }
  },
});
```

**`addTaskCompletionImage` 契约**：

```typescript
export const addTaskCompletionImage = mutation({
  args: {
    logId: v.id("taskCompletionLogs"),
    plantId: v.id("plants"),
    imageStorageId: v.id("_storage"),
    thumbnailStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // 1. requireCurrentFamilyMember 校验登录态 + 家庭归属
    // 2. ctx.db.get(args.logId) 校验日志存在且属于当前家庭
    // 3. ctx.db.get(args.plantId) 校验植物存在且属于当前家庭且未归档
    // 4. 校验 plant.gallery 长度 < 20（若已满，只更新 log，不追加 gallery）
    // 5. ctx.db.patch(args.logId, { imageStorageId: args.imageStorageId })
    // 6. 若 gallery 未满：追加到 gallery 数组头部
    // 7. ctx.db.patch(plantId, { gallery: newGallery, updatedAt: Date.now() })
    // 8. return { ok: true, addedToGallery: galleryNotFull }
  },
});
```

### 3.2 改造接口

| 接口 | 文件 | 改动 |
|------|------|------|
| `getPlantDetail` | `app/convex/plants.ts` | 返回数据新增 `gallery` 数组（含每项的 thumbnailUrl） |
| `listPlantCompletionLogs` | `app/convex/tasks.ts` | 返回的每条 log 新增 `imageStorageId` 字段 |
| `deletePlant` | `app/convex/plants.ts` | 级联删除时清理 gallery 中所有图片的 _storage |

**`getPlantDetail` 改造细节**：

```typescript
// 在现有返回结构中新增：
gallery: await Promise.all(
  (plant.gallery ?? []).map(async (item) => ({
    imageStorageId: item.imageStorageId,
    thumbnailStorageId: item.thumbnailStorageId,
    thumbnailUrl: await ctx.storage.getUrl(item.thumbnailStorageId),
    uploadedBy: item.uploadedBy,
    uploadedAt: item.uploadedAt,
  }))
),
galleryCount: (plant.gallery ?? []).length,
```

**`listPlantCompletionLogs` 改造细节**：

```typescript
// 在现有 page map 中，每条 log 新增：
imageStorageId: log.imageStorageId ?? null,
```

**`deletePlant` 改造细节**：

```typescript
// 在删除植物图片（如果有）之前，新增：
// 删除图集中所有图片
if (plant.gallery && plant.gallery.length > 0) {
  for (const item of plant.gallery) {
    await ctx.storage.delete(item.imageStorageId);
    await ctx.storage.delete(item.thumbnailStorageId);
  }
}
```

---

## 4. 前端组件契约

### 4.1 新增组件

| 组件 | 路径 | Props | 职责 |
|------|------|-------|------|
| `PlantGalleryStrip` | `src/features/plants/PlantGalleryStrip.tsx` | `gallery: GalleryItem[]`, `isArchived: boolean`, `isFull: boolean`, `onAdd: () => void`, `onThumbnailPress: (index: number) => void` | 图集横向滚动条（缩略图 + "+"按钮 + "查看全部"） |
| `GalleryFullscreenViewer` | `src/features/plants/GalleryFullscreenViewer.tsx` | `gallery: GalleryItem[]`, `initialIndex: number`, `isArchived: boolean`, `onClose: () => void`, `onDelete: (imageStorageId) => void`, `onSetCover: (imageStorageId) => void` | 全屏浏览模式（swiper + 删除 + 设为封面） |
| `TaskCompletionPhotoPrompt` | `src/features/tasks/TaskCompletionPhotoPrompt.tsx` | `visible: boolean`, `onCapture: () => void`, `onDismiss: () => void` | 完成任务后的附图浮层入口 |
| `GalleryAddButton` | `src/features/plants/GalleryAddButton.tsx` | `disabled: boolean`, `onClick: () => void` | "+"添加按钮（虚线边框卡片） |

### 4.2 改动组件

| 组件 | 文件 | 改动 |
|------|------|------|
| `PlantDetailPage.tsx` | `src/features/plants/PlantDetailPage.tsx` | Hero 区下方插入 `PlantGalleryStrip`；集成全屏浏览 + 图片上传逻辑 |
| 任务完成流程组件 | `src/features/tasks/` | 任务完成成功后显示 `TaskCompletionPhotoPrompt`；集成附图上传 |
| `CareHistoryTimeline.tsx` | `src/features/plants/CareHistoryTimeline.tsx` | 时间线条目展示附图缩略图（如有） |

### 4.3 工具函数抽取

| 函数 | 路径 | 职责 |
|------|------|------|
| `compressImage` | `src/lib/imageCompression.ts` | 前端 canvas 图片压缩：输入 File/Blob，输出 { original: Blob, thumbnail: Blob } |
| `uploadImagePair` | `src/lib/imageUpload.ts` | 封装"生成 URL x 2 -> 上传原图 + 缩略图 -> 返回两个 storageId"的完整流程 |

**`compressImage` 契约**：

```typescript
interface CompressImageOptions {
  maxOriginalSizeMB?: number;  // 默认 10
  thumbnailShortSide?: number; // 默认 200
  thumbnailQuality?: number;   // 默认 0.7
}

interface CompressImageResult {
  original: Blob;     // 原图（若超过 maxOriginalSizeMB 则压缩，否则透传）
  thumbnail: Blob;    // 缩略图（短边 200px，JPEG quality 0.7）
}

export async function compressImage(
  file: File,
  options?: CompressImageOptions
): Promise<CompressImageResult>
```

**`uploadImagePair` 契约**：

```typescript
interface UploadImagePairResult {
  imageStorageId: Id<"_storage">;
  thumbnailStorageId: Id<"_storage">;
}

export async function uploadImagePair(
  generateUploadUrl: () => Promise<{ uploadUrl: string }>,
  original: Blob,
  thumbnail: Blob
): Promise<UploadImagePairResult>
```

### 4.4 类型定义补充

**文件**：`app/src/types/domain.ts`

```typescript
// 新增
export interface GalleryItem {
  imageStorageId: string;       // Id<"_storage">
  thumbnailStorageId: string;   // Id<"_storage">
  thumbnailUrl: string | null;  // 由 getPlantDetail 解析
  uploadedBy: string;           // Id<"users">
  uploadedAt: number;           // UTC timestamp
}
```

---

## 5. 状态管理

| 状态 | 存储位置 | 理由 |
|------|---------|------|
| 图集数据（gallery 数组） | Convex `useQuery`（随 `getPlantDetail` 返回） | 服务端状态，实时订阅 |
| 全屏浏览模式开关 | `useState` | 纯交互临时状态 |
| 全屏当前图片索引 | `useState` | 导航状态 |
| 图片上传中状态 | `useState` | 局部状态（ARCHITECTURE.md 明确） |
| 完成附图浮层显示 | `useState` + `useEffect` 定时器 | 3 秒自动消失 |
| 原图 URL 缓存（全屏浏览用） | `useState` (Map) | 避免重复请求；离开全屏后可释放 |

---

## 6. 任务拆分与执行顺序

### Phase 1：数据层准备（无 UI 变更，可独立验证）

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| GAL-001 | Schema 扩展：`plantFields` 新增 `gallery` 字段 + `taskCompletionLogFields` 新增 `imageStorageId` | `app/convex/lib/validators.ts` | 无 |
| GAL-002 | 实现 `addPlantGalleryImage` mutation | `app/convex/plants.ts` | GAL-001 |
| GAL-003 | 实现 `removePlantGalleryImage` mutation | `app/convex/plants.ts` | GAL-001 |
| GAL-004 | 实现 `setPlantCoverFromGallery` mutation | `app/convex/plants.ts` | GAL-001 |
| GAL-005 | 改造 `getPlantDetail` 返回 gallery 数据（含 thumbnailUrl） | `app/convex/plants.ts` | GAL-001 |
| GAL-006 | 改造 `deletePlant` 级联删除 gallery 图片 | `app/convex/plants.ts` | GAL-001 |
| GAL-007 | 实现 `addTaskCompletionImage` mutation | `app/convex/tasks.ts` | GAL-001 |
| GAL-008 | 改造 `listPlantCompletionLogs` 返回 `imageStorageId` | `app/convex/tasks.ts` | GAL-001 |

### Phase 2：前端工具函数与类型

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| GAL-009 | 抽取 `compressImage` 工具函数（canvas 缩略图生成） | `app/src/lib/imageCompression.ts` | 无 |
| GAL-010 | 抽取 `uploadImagePair` 工具函数（双 URL 上传封装） | `app/src/lib/imageUpload.ts` | 无 |
| GAL-011 | 前端类型定义补充 `GalleryItem` | `app/src/types/domain.ts` | 无 |

### Phase 3：植物详情页图集 UI

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| GAL-012 | 实现 `GalleryAddButton` 组件 | `src/features/plants/GalleryAddButton.tsx` | 无 |
| GAL-013 | 实现 `PlantGalleryStrip` 组件（横向滚动 + 缩略图 + 添加按钮 + 查看全部） | `src/features/plants/PlantGalleryStrip.tsx` | GAL-011, GAL-012 |
| GAL-014 | 实现 `GalleryFullscreenViewer` 组件（swiper + 缩放 + 删除 + 设为封面） | `src/features/plants/GalleryFullscreenViewer.tsx` | GAL-011 |
| GAL-015 | `PlantDetailPage` 集成图集区（strip + fullscreen + 上传流程） | `src/features/plants/PlantDetailPage.tsx` | GAL-005, GAL-009, GAL-010, GAL-013, GAL-014 |

### Phase 4：任务完成附图 UI

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| GAL-016 | 实现 `TaskCompletionPhotoPrompt` 组件 | `src/features/tasks/TaskCompletionPhotoPrompt.tsx` | 无 |
| GAL-017 | 任务完成流程集成附图入口 + 上传逻辑 | `src/features/tasks/TodoPage.tsx` | GAL-007, GAL-009, GAL-010, GAL-016 |

### Phase 5：养护历史联动

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| GAL-018 | `CareHistoryTimeline` 展示附图缩略图 | `src/features/plants/CareHistoryTimeline.tsx` | GAL-008 |

### 依赖拓扑

```
GAL-001 --> GAL-002, GAL-003, GAL-004, GAL-005, GAL-006, GAL-007, GAL-008

GAL-009 --> GAL-015, GAL-017
GAL-010 --> GAL-015, GAL-017

GAL-011 --> GAL-013, GAL-014
GAL-012 --> GAL-013

GAL-013 --> GAL-015
GAL-014 --> GAL-015
GAL-005 --> GAL-015

GAL-016 --> GAL-017
GAL-007 --> GAL-017

GAL-008 --> GAL-018
```

**并行策略**：
- Phase 1（后端数据层）与 Phase 2（前端工具函数 + 类型）可完全并行
- Phase 3 的 UI 组件（GAL-012/013/014）与 Phase 1 可并行开发（不依赖后端）
- Phase 4 的 `TaskCompletionPhotoPrompt`（GAL-016）为纯 UI，可独立开发
- Phase 5 依赖 Phase 1 的 GAL-008 完成

---

## 7. 交互规格细化

### 7.1 PlantGalleryStrip（图集横向滚动区）

- **位置**：Hero 大图下方、养护计划区上方
- **容器**：`overflow-x: auto`，隐藏滚动条（`-webkit-scrollbar: none`），padding 左右 `--space-md`（16px）
- **缩略图卡片**：80x80px，`border-radius: 8px`，`overflow: hidden`，`object-fit: cover`
- **间距**：卡片之间 8px
- **排列**：最左侧为"+"添加按钮，其后按 `uploadedAt` 降序排列（最新紧挨"+"按钮）
- **"+"按钮**：80x80px，虚线边框（`2px dashed var(--color-line)`），居中 Plus 图标（Lucide `Plus`，24px，`--color-muted`）
- **"查看全部"**：当图集 > 10 张时，第 11 位置展示"查看全部（N）"文字卡（80x80，`--color-surface-secondary` 背景，居中文字 `--color-muted`，12px），点击进入全屏模式
- **默认展示**：最近 10 张缩略图（加"+"按钮和可能的"查看全部"）
- **空状态**：仅展示"+"按钮 + 右侧引导文案"记录植物的成长变化"（`--color-muted`，14px）
- **禁用态**（图集满 20 张）："+"按钮 opacity 0.4，点击后 toast "图集已满，请删除旧照片后再添加"
- **归档态**：不展示"+"按钮，仅展示已有缩略图
- **懒加载**：IntersectionObserver，缩略图进入视口后才请求 URL

### 7.2 GalleryFullscreenViewer（全屏浏览模式）

- 背景：`--color-ink`（全黑）
- 图片居中自适应（`object-fit: contain`），支持双指缩放（CSS `touch-action: pinch-zoom`）
- 底部日期文案：`--color-paper` 白色，格式"2026年6月15日"，14px
- 顶部左侧：返回按钮（ChevronLeft 图标，24px，白色）
- 顶部右侧：删除按钮（Trash2 图标，20px，白色）；归档植物不展示此按钮
- 左右滑动切换：CSS scroll-snap 或 touch-swipe 方案
- 预加载策略：当前图的前后各 1 张原图
- 长按菜单（或底部 ActionSheet）："设为封面" 选项；归档植物不展示此选项
- 删除确认：复用 `ConfirmSheet`（danger 样式），文案"删除后无法恢复"
- 设为封面成功：toast "已设为封面"

### 7.3 TaskCompletionPhotoPrompt（完成附图浮层）

- 触发：任务完成正反馈动画结束后
- 动画：底部 slide-up + opacity 0->1（200ms ease-out）
- 持续 3 秒后 fade-out（300ms）
- 样式：pill 形状（height 40px，border-radius 20px），背景 `--color-surface`，`--shadow-card` 投影
- 内容：Camera 图标（16px，`--color-leaf`）+ 文案"记录一下？"（`--color-ink`，14px）
- 点击后触发系统图片选择器
- 不阻塞任何操作，z-index 适中（不遮挡底部导航）
- 位置：底部导航栏上方 16px 居中

---

## 8. 边界用例与防御

| 场景 | 处理方式 | 涉及组件 |
|------|---------|----------|
| 图集已满（20 张）再上传 | `addPlantGalleryImage` 后端校验数组长度，抛错；前端"+"disabled + toast | PlantGalleryStrip, addPlantGalleryImage |
| 上传中网络断开 | 前端 catch error，toast "上传失败，请重试"，不影响已有图集 | PlantDetailPage |
| 图片文件超过 10MB | 前端 File.size 预检，阻止上传并 toast "图片过大，请选择较小的照片" | PlantDetailPage |
| 缩略图压缩失败（canvas 异常） | 降级：跳过缩略图，thumbnailStorageId 复用原图 ID | imageCompression |
| 删除正在作为封面的图集照片 | 允许删除，封面不受影响（封面是 plants.imageStorageId 独立引用） | removePlantGalleryImage |
| 植物归档后访问图集 | 图集只读（无"+"按钮，全屏模式无"删除"/"设为封面"），浏览正常 | PlantGalleryStrip, GalleryFullscreenViewer |
| 完成附图时上传失败 | 任务已完成不受影响（completePlantTask 已执行），toast "照片保存失败" | TodoPage |
| 老数据（无 gallery 字段）植物 | `gallery ?? []`，展示空图集+引导文案 | PlantDetailPage |
| 并发上传（快速连续点击"+"） | 前端上传中状态禁用"+"按钮（uploading flag） | PlantDetailPage |
| Storage URL 过期 | Convex storage URL 有 TTL，query 每次重新 getUrl（subscription 自动刷新） | getPlantDetail |
| 用户 A 上传，用户 B 实时看到 | Convex subscription 自动推送，无需手动刷新 | 自动 |
| 图集满后完成附图 | 只更新 log 的 imageStorageId，不追加 gallery；toast 提示"图集已满，照片仅记录在养护日志中" | addTaskCompletionImage |
| 全屏删除最后一张照片 | 自动退出全屏模式，回到空图集状态 | GalleryFullscreenViewer |

---

## 9. 视觉规格速查

### 9.1 Design Token 使用

本功能不新增 token，全部复用现有 `tokens.css` 变量：

| 用途 | Token |
|------|-------|
| "+" 按钮虚线边框 | `--color-line` |
| "+" 按钮图标 / 引导文案 / "查看全部"文字 | `--color-muted` |
| 全屏背景 | `--color-ink` |
| 全屏日期文字 / 图标 | `--color-paper` |
| 附图浮层背景 | `--color-surface` |
| 附图浮层阴影 | `--shadow-card` |
| 附图浮层 Camera 图标 | `--color-leaf` |
| 缩略图圆角 | 8px（`--radius-sm`） |
| 间距 | `--space-sm`(8px), `--space-md`(16px) |

### 9.2 响应式

- 图集区按 375px 宽度设计（移动优先）
- 缩略图固定 80x80，不随屏幕缩放
- 全屏浏览器宽度自适应（`width: 100vw`, `height: 100vh`）
- 附图浮层居中定位，不超出安全区

---

## 10. 验证命令

```bash
# TypeScript 编译
cd app && npm run typecheck

# Convex 类型检查（含 schema 变更验证）
cd app && npx convex dev --once --typecheck enable

# 单元测试
cd app && npm run test

# 功能验证要点（375px 宽度）
# 1. 植物详情页：图集区横向滚动，"+" 按钮可点击，上传成功后图片出现在最左
# 2. 全屏浏览：点击缩略图进入，左右滑动切换，双指缩放，删除和设为封面正常
# 3. 完成任务后：浮层出现 3 秒后消失；点击可选图上传
# 4. 老数据兼容：无 gallery 的植物展示空图集
# 5. 上限验证：20 张后 "+" 禁用
# 6. 归档植物：图集只读，无增删操作入口
```

---

## 11. 验收 Checklist

### 11.1 数据层

- [ ] `plants` schema 包含 `gallery` 可选字段（数组，元素含 imageStorageId/thumbnailStorageId/uploadedBy/uploadedAt）
- [ ] `taskCompletionLogs` schema 包含 `imageStorageId` 可选字段
- [ ] `addPlantGalleryImage` mutation 正确追加图片到 gallery 头部，校验长度不超过 20
- [ ] `removePlantGalleryImage` mutation 正确移除图片并删除 storage 文件
- [ ] `setPlantCoverFromGallery` mutation 正确更新 `plants.imageStorageId`
- [ ] `addTaskCompletionImage` mutation 写入 log + gallery（gallery 满时仅写 log）
- [ ] `getPlantDetail` 返回 gallery 数据含缩略图 URL
- [ ] `deletePlant` 级联删除 gallery 中所有 storage 文件
- [ ] `listPlantCompletionLogs` 返回 `imageStorageId` 字段

### 11.2 图集基础功能

- [ ] 植物详情页 Hero 区下方展示横向滚动图集区
- [ ] 图集区首位为"+"添加按钮，点击可选择拍照/相册
- [ ] 上传时前端生成缩略图（短边 200px），原图和缩略图分别存储
- [ ] 上传成功后图片出现在图集最左侧（最新）
- [ ] 缩略图 80x80 圆角方形，间距 8px
- [ ] 默认展示最近 10 张，末尾"查看全部（N）"入口
- [ ] 图集为空时展示引导文案"记录植物的成长变化"
- [ ] 图集满 20 张后"+"不可用 + toast 提示

### 11.3 全屏浏览

- [ ] 点击缩略图进入全屏浏览模式
- [ ] 全屏背景全黑，图片居中自适应
- [ ] 支持左右滑动切换
- [ ] 支持双指缩放
- [ ] 底部展示拍摄日期（格式"2026年6月15日"）
- [ ] 右上角删除按钮（二次确认后删除）
- [ ] 可"设为封面"（成功后 toast）
- [ ] 顶部返回按钮关闭全屏

### 11.4 任务完成附图

- [ ] 完成任务后出现"记录一下？"浮层入口
- [ ] 浮层 3 秒后自动消失
- [ ] 点击后可选择照片，照片同时出现在植物图集和完成日志中
- [ ] 不点击不影响任务完成流程
- [ ] 上传失败时任务完成不受影响，toast 提示

### 11.5 性能与兼容

- [ ] 缩略图懒加载（IntersectionObserver）
- [ ] 全屏浏览预加载前后各 1 张原图
- [ ] 老数据（无 gallery 字段）正常展示空图集
- [ ] familyId 隔离，不展示跨家庭数据
- [ ] 归档植物图集只读（无增/删/设为封面操作）

### 11.6 通用

- [ ] TypeScript 编译无 error
- [ ] Convex schema 可通过类型检查
- [ ] 375px 宽度下所有新增 UI 可用
- [ ] 所有色值/间距/圆角引用 token 变量，无硬编码
- [ ] 动画尊重 `prefers-reduced-motion`
