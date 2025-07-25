/* eslint-disable no-var */

// Paper.js 相关类型定义
interface PaperScopeData {
  scope: any;
  canvas: HTMLCanvasElement;
  id: string;
}

interface PaperScopesGlobal {
  scopes: Map<string, PaperScopeData>;
  activeScope: string | null;
  register: (scopeId: string, paperScope: any, canvas: HTMLCanvasElement) => void;
  getActiveScope: () => any | null;
  switchScope: (scopeId: string) => boolean;
  getAllScopes: () => Array<{ id: string; canvas: HTMLCanvasElement; active: boolean }>;
}

declare global {
  // 扩展 Window 接口
  interface Window {
    __PAPER_SCOPES__?: PaperScopesGlobal;
    __PAPER_SCOPE__?: any;
  }
  
  // 扩展 globalThis 接口
  var __PAPER_SCOPES__: PaperScopesGlobal | undefined;
  var __PAPER_SCOPE__: any;
}

export {};
