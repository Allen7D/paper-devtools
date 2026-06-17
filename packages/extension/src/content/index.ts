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
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

let paperJsDetected = false;

injectDetectionScript();

window.addEventListener('PAPER_JS_DETECTED', () => {
  console.log('Paper.js 已检测到');
  paperJsDetected = true;

  injectSceneTreeScript();
});

function sendToInjectScript(message: any, sendResponse: (response: any) => void) {
  if (!paperJsDetected) {
    sendResponse({ error: 'Paper.js 未检测到' });
    return;
  }

  const messageId = Date.now().toString();

  const listener = (event: CustomEvent) => {
    const data = event.detail;
    if (data && data.id === messageId) {
      window.removeEventListener('PAPER_DEVTOOLS_RESPONSE', listener as EventListener);
      sendResponse(data.response);
    }
  };

  window.addEventListener('PAPER_DEVTOOLS_RESPONSE', listener as EventListener);

  window.dispatchEvent(
    new CustomEvent('PAPER_DEVTOOLS_MESSAGE', {
      detail: {
        ...message,
        id: messageId,
      },
    }),
  );
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('>>> message', message);

  if (!message || !message.action) return;

  switch (message.action) {
    case 'DETECT_PAPER_JS':
      if (!paperJsDetected) {
        injectDetectionScript();
      }
      sendResponse({ detected: paperJsDetected });
      break;

    case 'GET_SCENE_TREE':
    case 'SELECT_NODE':
    case 'TOGGLE_NODE_VISIBILITY':
    case 'UPDATE_NODE_PROPERTY':
    case 'GET_AVAILABLE_SCOPES':
    case 'SET_ACTIVE_SCOPE':
    case 'GET_NODE_INFO':
      sendToInjectScript(message, sendResponse);
      return true;

    default:
      break;
  }
});

window.addEventListener('PAPER_SCOPE_CHANGE', ((event: CustomEvent) => {
  const detail = event.detail;
  if (!detail) return;

  try {
    chrome.runtime.sendMessage({
      action: 'SCOPE_CHANGE',
      type: detail.type,
      scopeId: detail.scopeId,
      scopes: detail.scopes,
      activeScopeId: detail.activeScopeId,
    });
  } catch {
    // Panel may not be open
  }
}) as EventListener);

window.addEventListener('PAPER_SCENE_CHANGED', (() => {
  try {
    chrome.runtime.sendMessage({ action: 'SCENE_CHANGE' });
  } catch {
    // Panel may not be open
  }
}) as EventListener);
