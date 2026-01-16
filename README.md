# 优化工作程序流工具集 (Monorepo)

这是一个基于 `pnpm` 的多包仓库，包含一系列优化工具。

## 目录结构

- `apps/fbx-converter`: 基于 Electron + Svelte 的 FBX 转 GLB 转换优化工具。
- `packages/converter-core`: 封装了 `fbx2gltf` 和 `gltf-transform` 的转换与优化逻辑。
- `packages/ui`: 共享的 UI 组件库。

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
