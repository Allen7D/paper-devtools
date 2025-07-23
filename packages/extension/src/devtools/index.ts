// 创建 DevTools 面板
chrome.devtools.panels.create(
  'Paper.js',
  '/icons/icon16.png',
  '/src/panel/index.html',
  (_panel) => {
    // 面板创建后的回调函数
    console.log('Paper.js DevTools 面板已创建');
  }
); 