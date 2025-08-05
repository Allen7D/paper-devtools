// 监听浏览器扩展程序中，安装插件事件（点击“检查视图 Service Worker”即可看到对应的 console）
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Paper.js DevTools 已安装');
  } else if (details.reason === 'update') {
    console.log('Paper.js DevTools 已更新');
  }
});