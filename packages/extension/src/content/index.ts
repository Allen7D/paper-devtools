// 注入检测脚本
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
  script.textContent = `
    // 递归构建场景树
    function buildSceneTree(item, id = '') {
      if (!item) return null;
      
      // 为每个节点生成唯一 ID
      const nodeId = id || 'root';
      
      // 构建基本节点信息
      const node = {
        id: nodeId,
        name: item.name || '',
        type: item.className || 'Item',
        children: [],
        properties: {},
        visible: item.visible !== undefined ? item.visible : true,
        selected: item.selected !== undefined ? item.selected : false
      };
      
      // 添加常见属性
      if (item.position) {
        node.properties.position = { x: item.position.x, y: item.position.y };
      }
      
      if (item.bounds) {
        node.properties.bounds = {
          x: item.bounds.x,
          y: item.bounds.y,
          width: item.bounds.width,
          height: item.bounds.height
        };
      }
      
      if (item.fillColor) {
        node.properties.fillColor = item.fillColor.toCSS ? 
          item.fillColor.toCSS(true) : String(item.fillColor);
      }
      
      if (item.strokeColor) {
        node.properties.strokeColor = item.strokeColor.toCSS ? 
          item.strokeColor.toCSS(true) : String(item.strokeColor);
      }
      
      if (item.strokeWidth !== undefined) {
        node.properties.strokeWidth = item.strokeWidth;
      }
      
      if (item.opacity !== undefined) {
        node.properties.opacity = item.opacity;
      }
      
      if (item.closed !== undefined) {
        node.properties.closed = item.closed;
      }
      
      // 处理子项
      if (item.children && item.children.length > 0) {
        item.children.forEach((child, index) => {
          const childNode = buildSceneTree(child, \`\${nodeId}_\${index}\`);
          if (childNode) {
            node.children.push(childNode);
          }
        });
      }
      
      return node;
    }
    
    // 查找节点
    function findNodeById(root, id) {
      if (!root) return null;
      if (root.id === id) return root;
      
      for (const child of root.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
      
      return null;
    }
    
    // 查找 Paper.js 中的项目
    function findPaperItemById(id) {
      if (!window.__PAPER_JS__) return null;
      
      // 如果是根节点
      if (id === 'root') {
        return window.__PAPER_JS__.project;
      }
      
      // 解析 ID 路径
      const parts = id.split('_');
      let current = window.__PAPER_JS__.project;
      
      // 跳过 'root'
      for (let i = 1; i < parts.length; i++) {
        const index = parseInt(parts[i], 10);
        if (current.children && index < current.children.length) {
          current = current.children[index];
        } else {
          return null;
        }
      }
      
      return current;
    }
    
    // 监听来自内容脚本的消息
    window.addEventListener('PAPER_DEVTOOLS_MESSAGE', function(event) {
      const message = event.detail;
      
      if (!message || !message.action) return;
      
      let response = null;
      
      switch (message.action) {
        case 'GET_SCENE_TREE':
          if (window.__PAPER_JS__ && window.__PAPER_JS__.project) {
            const sceneTree = buildSceneTree(window.__PAPER_JS__.project);
            response = { sceneTree };
          }
          break;
          
        case 'SELECT_NODE':
          if (message.nodeId) {
            const item = findPaperItemById(message.nodeId);
            if (item) {
              // 取消所有选择
              if (window.__PAPER_JS__.project) {
                window.__PAPER_JS__.project.deselectAll();
              }
              
              // 选择当前项目
              if (item.selected !== undefined) {
                item.selected = true;
              }
              
              // 构建节点信息
              const node = buildSceneTree(item, message.nodeId);
              response = { node };
            }
          }
          break;
          
        case 'TOGGLE_NODE_VISIBILITY':
          if (message.nodeId) {
            const item = findPaperItemById(message.nodeId);
            if (item && item.visible !== undefined) {
              item.visible = !item.visible;
              
              // 重新构建场景树
              const sceneTree = buildSceneTree(window.__PAPER_JS__.project);
              response = { sceneTree };
            }
          }
          break;
          
        case 'UPDATE_NODE_PROPERTY':
          if (message.nodeId && message.property) {
            const item = findPaperItemById(message.nodeId);
            if (item) {
              try {
                // 处理特殊属性
                if (message.property === 'position' && typeof message.value === 'object') {
                  item.position.x = message.value.x;
                  item.position.y = message.value.y;
                } else if (message.property === 'fillColor') {
                  item.fillColor = message.value;
                } else if (message.property === 'strokeColor') {
                  item.strokeColor = message.value;
                } else {
                  // 直接设置属性
                  item[message.property] = message.value;
                }
                
                // 如果有视图，重绘
                if (window.__PAPER_JS__.view) {
                  window.__PAPER_JS__.view.update();
                }
                
                // 构建更新后的节点信息
                const node = buildSceneTree(item, message.nodeId);
                response = { node };
              } catch (error) {
                console.error('更新属性失败:', error);
              }
            }
          }
          break;
      }
      
      // 发送响应
      if (response) {
        window.dispatchEvent(
          new CustomEvent('PAPER_DEVTOOLS_RESPONSE', { 
            detail: { 
              id: message.id,
              response 
            } 
          })
        );
      }
    });
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

// 检测 Paper.js 是否存在
let paperJsDetected = false;

// 注入检测脚本
injectDetectionScript();

// 监听 Paper.js 检测事件
window.addEventListener('PAPER_JS_DETECTED', () => {
  console.log('Paper.js 已检测到');
  paperJsDetected = true;
  
  // 注入场景树脚本
  injectSceneTreeScript();
});

// 处理来自 DevTools 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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