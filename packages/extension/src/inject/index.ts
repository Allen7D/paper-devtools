/// <reference path="../../global.d.ts" />

/**
 * Paper.js 检测与 Scope 管理注入脚本（IIFE 入口）。
 *
 * 实际逻辑在 `setup.ts` 的 `initInject()`，便于 devtool-local 复用。
 * 本文件以 IIFE 格式独立构建（见 `vite.inject.config.ts`），注入到页面上下文运行。
 */
import { initInject } from './setup';

initInject();
