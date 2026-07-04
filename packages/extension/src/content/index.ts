import { INJECT_EVENT, PANEL_ACTION, RUNTIME_ACTION } from '@/shared/constants';

function injectDetectionScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject/index.js');
  script.type = 'text/javascript';
  script.onload = function () {
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

function injectSceneTreeScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject/parse.js');
  script.type = 'text/javascript';
  script.onload = function () {
    parseScriptLoaded = true;
    script.remove();
    // 处理在 parse.js 加载完成前积压的消息
    while (pendingMessages.length > 0) {
      const { message, sendResponse } = pendingMessages.shift()!;
      sendToInjectScript(message, sendResponse);
    }
  };
  (document.head || document.documentElement).appendChild(script);
}

let paperJsDetected = false;
/** parse.js 是否已加载完成（确保消息分发时监听器已就绪） */
let parseScriptLoaded = false;
/** parse.js 加载前暂存的消息队列 */
const pendingMessages: Array<{ message: any; sendResponse: (response: any) => void }> = [];

injectDetectionScript();

window.addEventListener(INJECT_EVENT.PAPER_JS_DETECTED, () => {
  console.log('Paper.js 已检测到');
  paperJsDetected = true;

  injectSceneTreeScript();
});

function sendToInjectScript(message: any, sendResponse: (response: any) => void) {
  if (!paperJsDetected) {
    sendResponse({ error: 'Paper.js 未检测到' });
    return;
  }

  // parse.js 尚未加载完成，将消息加入队列等待处理
  if (!parseScriptLoaded) {
    pendingMessages.push({ message, sendResponse });
    return;
  }

  const messageId = Date.now().toString();

  const listener = (event: CustomEvent) => {
    const data = event.detail;
    if (data && data.id === messageId) {
      window.removeEventListener(INJECT_EVENT.PAPER_DEVTOOLS_RESPONSE, listener as EventListener);
      sendResponse(data.response);
    }
  };

  window.addEventListener(INJECT_EVENT.PAPER_DEVTOOLS_RESPONSE, listener as EventListener);

  window.dispatchEvent(
    new CustomEvent(INJECT_EVENT.PAPER_DEVTOOLS_MESSAGE, {
      detail: {
        ...message,
        id: messageId,
      },
    }),
  );
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // console.log('>>> chrome.runtime.onMessage', message);

  if (!message || !message.action) return;

  switch (message.action) {
    case PANEL_ACTION.DETECT_PAPER_JS:
      if (!paperJsDetected) {
        injectDetectionScript();
      }
      sendResponse({ detected: paperJsDetected });
      break;

    case PANEL_ACTION.GET_SCENE_TREE:
    case PANEL_ACTION.SELECT_NODE:
    case PANEL_ACTION.TOGGLE_NODE_VISIBILITY:
    case PANEL_ACTION.UPDATE_NODE_PROPERTY:
    case PANEL_ACTION.GET_AVAILABLE_SCOPES:
    case PANEL_ACTION.SET_ACTIVE_SCOPE:
    case PANEL_ACTION.GET_NODE_INFO:
    case PANEL_ACTION.HIGHLIGHT_NODE:
    case PANEL_ACTION.CLEAR_HIGHLIGHT:
    case PANEL_ACTION.SET_OVERLAY_ENABLED:
    case PANEL_ACTION.ENABLE_PICKER:
    case PANEL_ACTION.DISABLE_PICKER:
    case PANEL_ACTION.SET_AUTO_SWITCH_SCOPE:
    case PANEL_ACTION.GET_AUTO_SWITCH_SCOPE:
    case PANEL_ACTION.ENABLE_EXPLODE_MODE:
    case PANEL_ACTION.DISABLE_EXPLODE_MODE:
    case PANEL_ACTION.RESET_EXPLODE:
    case PANEL_ACTION.FOCUS_NODE:
    case PANEL_ACTION.EXIT_FOCUS:
    case PANEL_ACTION.DEVTOOLS_CLEANUP:
      sendToInjectScript(message, sendResponse);
      return true;

    default:
      break;
  }
});

window.addEventListener(INJECT_EVENT.PAPER_SCOPE_CHANGE, ((event: CustomEvent) => {
  const detail = event.detail;
  if (!detail) return;

  try {
    chrome.runtime.sendMessage({
      action: RUNTIME_ACTION.SCOPE_CHANGE,
      type: detail.type,
      scopeId: detail.scopeId,
      scopes: detail.scopes,
      activeScopeId: detail.activeScopeId,
    });
  } catch {
    // Panel may not be open
  }
}) as EventListener);

window.addEventListener(INJECT_EVENT.PAPER_SCENE_CHANGED, (() => {
  try {
    chrome.runtime.sendMessage({ action: RUNTIME_ACTION.SCENE_CHANGE });
  } catch {
    // Panel may not be open
  }
}) as EventListener);

window.addEventListener(INJECT_EVENT.PAPER_PICKER_RESULT, ((event: CustomEvent) => {
  const detail = event.detail;
  if (!detail) return;

  try {
    chrome.runtime.sendMessage({
      action: RUNTIME_ACTION.PICKER_RESULT,
      nodeId: detail.nodeId,
      deselect: detail.deselect || false,
    });
  } catch {
    // Panel may not be open
  }
}) as EventListener);

window.addEventListener(INJECT_EVENT.PAPER_EXPLODE_FACTOR, ((event: CustomEvent) => {
  const detail = event.detail;
  if (!detail) return;

  try {
    chrome.runtime.sendMessage({
      action: RUNTIME_ACTION.EXPLODE_FACTOR,
      groupId: detail.groupId,
      factor: detail.factor,
    });
  } catch {
    // Panel may not be open
  }
}) as EventListener);
