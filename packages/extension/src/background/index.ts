// 后台脚本，用于处理扩展的生命周期事件

// 监听安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Paper.js DevTools 已安装');
  } else if (details.reason === 'update') {
    console.log('Paper.js DevTools 已更新');
  }
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 打开 DevTools
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'OPEN_DEVTOOLS' });
  }
}); 