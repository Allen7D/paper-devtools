// 常量
const MAX_TRIES = 10;
const POLLING_INTERVAL_MS = 1000;

let paperPollingInterval;
let tryCount = 0;

function startPolling() {
	paperPollingInterval = window.setInterval(() => {
		console.log('>>> 检测 Paper.js 是否存在:', tryCount + 1, '次');
		if (tryCount > MAX_TRIES) {
			stopPolling();
		}
		if (window.__PAPER_JS__) {
			// 通知内容脚本 Paper.js 已检测到  window.__PAPER_JS__
			window.dispatchEvent(new CustomEvent('PAPER_JS_DETECTED'));

			stopPolling();
		}
		tryCount++;
	}, POLLING_INTERVAL_MS);
}

function stopPolling() {
	window.clearInterval(paperPollingInterval);
}

// 检测 Paper.js 是否存在
(function () {
	startPolling();
})(); 