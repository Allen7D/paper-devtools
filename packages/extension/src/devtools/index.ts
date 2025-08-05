// 创建 DevTools 面板（chrome.devtools.panels.create 即可创建一个自定义的面板）
chrome.devtools.panels.create(
  'Paper.js',               // 扩展面板显示名称
  '/icons/icon16.png',      // 扩展面板icon（不展示）
  '/src/panel/index.html',  // 扩展面板页面
  (_panel) => {
    // 面板创建后的回调函数
    console.log('Paper.js DevTools 面板已创建');
    // 可以增加 panel.onShown.addListener 和 panel.onHidden.addListener 来处理面板显示和隐藏事件
  }
); 