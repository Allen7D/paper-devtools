// 会往每个页面，注入检测脚本
function injectDetectionScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('paper-detection.js');
  script.type = 'text/javascript';
  script.onload = function () {
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// 注入用于获取场景树的脚本
function injectSceneTreeScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('build-scene-tree.js');
  script.type = 'text/javascript';
  script.onload = function () {
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// 检测 Paper.js 是否存在
let paperJsDetected = false;
// hmi-key true
// 注入检测脚本
injectDetectionScript();

// 监听 Paper.js 检测事件
window.addEventListener('PAPER_JS_DETECTED', () => {
  console.log('Paper.js 已检测到');
  paperJsDetected = true;
  
  // 识别到 Paper.js 后，注入场景树脚本
  injectSceneTreeScript();
});

// 处理来自 DevTools 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('>>> message', message);

  if (!message || !message.action) return;
  
  switch (message.action) {
    case 'DETECT_PAPER_JS':
      // 再次尝试注入检测脚本
      if (!paperJsDetected) {
        injectDetectionScript();
      }
      
      sendResponse({ detected: paperJsDetected });
      break;
      
    case 'GET_SCENE_TREE':
    case 'SELECT_NODE':
    case 'TOGGLE_NODE_VISIBILITY':
    case 'UPDATE_NODE_PROPERTY':
      if (!paperJsDetected) {
        sendResponse({ error: 'Paper.js 未检测到' });
        return;
      }
      
      // 生成唯一消息 ID
      const messageId = Date.now().toString();
      
      // 创建一次性监听器等待响应
      const listener = (event: CustomEvent) => {
        const data = event.detail;
        if (data && data.id === messageId) {
          // 移除监听器
          window.removeEventListener('PAPER_DEVTOOLS_RESPONSE', listener as EventListener);
          
          // 发送响应
          sendResponse(data.response);
        }
      };
      
      // 添加监听器
      window.addEventListener('PAPER_DEVTOOLS_RESPONSE', listener as EventListener);
      
      // 发送消息到页面脚本
      window.dispatchEvent(
        new CustomEvent('PAPER_DEVTOOLS_MESSAGE', { 
          detail: { 
            ...message,
            id: messageId 
          } 
        })
      );
      
      // 返回 true 表示将异步发送响应
      return true;
  }
}); 