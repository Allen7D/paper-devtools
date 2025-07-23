// 检测 Paper.js 是否存在
(function () {
	if (window.paper) {
		// 将 Paper.js 实例暴露给 DevTools
		window.__PAPER_JS__ = window.paper;
		console.log('window.__PAPER_JS__', window.__PAPER_JS__);
		// 通知内容脚本 Paper.js 已检测到
		window.dispatchEvent(new CustomEvent('PAPER_JS_DETECTED'));
	}
})(); 