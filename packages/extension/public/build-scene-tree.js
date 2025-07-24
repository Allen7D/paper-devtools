// 递归构建场景树
function buildSceneTree(item, id = '') {
	if (!item) return null;

	// 为每个节点生成唯一 ID
	const nodeId = id || 'root';

	// 检查是否是 project 对象
	const isProject = item.className === 'Project' || (item.activeLayer && item.layers);

	// 构建基本节点信息
	const node = {
		id: nodeId,
		name: isProject ? 'Project' : (item.name || ''),
		type: isProject ? 'Project' : (item.className || 'Item'),
		children: [],
		properties: {},
		visible: isProject ? true : (item.visible !== undefined ? item.visible : true),
		selected: isProject ? false : (item.selected !== undefined ? item.selected : false)
	};
	// 添加属性 - 根据对象类型处理
	if (isProject) {
		// Project 对象的属性
		if (item.view && item.view.size) {
			node.properties.viewSize = {
				width: item.view.size.width,
				height: item.view.size.height
			};
		}
		if (item.layers) {
			node.properties.layersCount = item.layers.length;
		}
		node.properties.type = 'Project';
	} else {
		// 普通 Item 对象的属性
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
	}
	// 处理子项 - 根据对象类型获取子项
	let children = null;
	if (isProject) {
		children = item.layers;
	} else {
		// 普通 Item 对象：使用 children 属性
		children = item.children;
	}

	if (children && children.length > 0) {
		children.forEach((child, index) => {
			const childNode = buildSceneTree(child, `${nodeId}_${index}`);
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

	// 跳过 'root'，从第一个子级开始
	for (let i = 1; i < parts.length; i++) {
		const index = parseInt(parts[i], 10);
		let children = null;

		// 根据当前对象类型获取子项
		const isProject = current.className === 'Project' || (current.activeLayer && current.layers);
		if (isProject) {
			// Project 对象：使用所有 layers
			children = current.layers;
		} else {
			// 普通 Item 对象：使用 children 属性
			children = current.children;
		}

		if (children && index < children.length) {
			current = children[index];
		} else {
			return null;
		}
	}
	return current;
}
// 监听来自内容脚本的消息
window.addEventListener('PAPER_DEVTOOLS_MESSAGE', function (event) {
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
					console.log('Click:', item);
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
