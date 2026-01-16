# Servo

`Servo` 是一个以效率为核心的工具库集合。其名称灵感来源于战锤 40K 中的 **Servo-skull (伺服颅骨)**，旨在作为一个可靠的数字化助手。

项目的核心目标是：**通过工具化手段简化重复性任务，从而为开发者节省时间。**

---

## 🛠️ 项目列表

### [FBX Converter](apps/fbx-converter)
一个桌面端 3D 模型处理工具，用于实现 FBX 到 glTF/GLB 的高效转换与优化。
- **几何体压缩**：支持 Draco 和 Meshopt 压缩算法。
- **纹理处理**：集成 KTX2 自动化转换，降低显存占用。
- **批量操作**：支持多文件并行转换流。

### [Converter Core](packages/converter-core)
提供底层 3D 转换能力的逻辑包，封装了 `fbx2gltf` 与 `glTF-Transform`。

---

## 🏗️ 技术架构

- **Monorepo 管理**: [pnpm Workspaces](https://pnpm.io/workspaces)
- **应用框架**: [Electron](https://www.electronjs.org/) & [Svelte](https://svelte.dev/)
- **核心逻辑**: [glTF-Transform](https://gltf-transform.donmccarthy.com/) & [fbx2gltf](https://github.com/facebookincubator/FBX2glTF)

---

## 🚀 快速开始

1. **安装依赖**:
   ```bash
   pnpm install
   ```

2. **启动开发环境**:
   ```bash
   pnpm --filter fbx-converter dev
   ```

3. **构建 Windows 安装包**:
   ```bash
   pnpm --filter fbx-converter build:win
   ```

---

## � 发布与分发

- **GitHub Releases**: 每当推送以 `v` 开头的标签（如 `git tag v1.0.0 && git push origin v1.0.0`）时，GitHub Actions 会自动编译并发布 Windows 安装程序。
- **GitHub Packages**: 核心逻辑包 `@silverstr1ng/servo-core` 托管于 GitHub Packages，可作为 NPM 模块引用。

---

## �🕊️ 愿景

**Simplify workflows and save time.**
专注于解决工作流中的琐碎环节，让效率回归本质。

## 快速开始

1.  **安装依赖**:
    ```bash
    pnpm install
    ```

2.  **准备二进制文件**:
    转换器依赖 `FBX2glTF` 二进制文件。
    请根据您的操作系统，从 [FBX2glTF Releases](https://github.com/facebookincubator/FBX2glTF/releases) 下载二进制文件。
    将其放置在:
    - windows: `apps/fbx-converter/resources/bin/FBX2glTF.exe`
    - mac/linux: `apps/fbx-converter/resources/bin/FBX2glTF`

3.  **运行开发环境**:
    ```bash
    pnpm dev
    ```

## 核心功能

- **FBX 转换**: 使用 Facebook 的 `fbx2gltf` 将 FBX 转换为 GLB。
- **Draco 压缩**: 几何体压缩，大幅减小模型文件体积。
- **Meshopt 优化**: 优化模型性能与传输。
- **KTX2 支持**: 准备支持纹理压缩。
