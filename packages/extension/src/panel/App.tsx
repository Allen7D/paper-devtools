import React, { useEffect, useState } from 'react';
import { Modal, Splitter } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { SceneTreeView } from './components/SceneTreeView';
import { PropertiesPanel } from './components/PropertiesPanel';
import { usePaperStore } from './store';
import './App.less';

const HELP_CONTENT = (
  <div className="help-content">
    <h3>场景树</h3>
    <ul>
      <li><b>点击节点</b> — 选中图元，右侧显示属性；再次点击取消选中</li>
      <li><b>点击眼睛图标</b> — 切换图元可见性</li>
      <li><b>点击箭头图标</b> — 展开/折叠子节点</li>
    </ul>

    <h3>拾取器</h3>
    <ul>
      <li><b>点击 🎯 按钮</b> — 激活拾取器，Canvas 光标变为十字</li>
      <li><b>点击 Canvas 上的图元</b> — 选中该图元</li>
      <li><b>Ctrl + 点击</b> — 向上拾取父级图元（Group → Layer → Project）</li>
      <li><b>点击已选中图元</b> — 取消选中</li>
      <li><b>再次点击 🎯 按钮</b> — 关闭拾取器</li>
    </ul>

    <h3>高亮覆盖层</h3>
    <ul>
      <li><b>选中节点</b> — Canvas 上显示红色实线边框高亮</li>
      <li><b>悬停节点</b> — Canvas 上显示蓝色虚线边框高亮</li>
      <li><b>点击 👁 按钮</b> — 开关高亮覆盖层</li>
    </ul>

    <h3>搜索与过滤</h3>
    <ul>
      <li><b>搜索框</b> — 按节点名称或类型模糊搜索</li>
      <li><b>类型过滤</b> — 多选过滤特定类型的图元</li>
      <li><b>显隐切换</b> — 点击「全/显/隐」切换显示全部/仅可见/仅隐藏节点</li>
    </ul>

    <h3>多画布管理</h3>
    <ul>
      <li><b>画布下拉框</b> — 多个 Canvas 时可切换活跃画布</li>
      <li><b>🔄 自动切换</b> — 点击 Canvas 自动切换到对应画布（默认开启）</li>
      <li><b>新增/删除画布</b> — 自动检测并更新 DevTools</li>
    </ul>

    <h3>控制台调试</h3>
    <ul>
      <li>选中图元后，可在 Chrome 控制台通过 <code>$paper</code> 变量访问当前选中的图元对象</li>
    </ul>

    <h3>实时更新</h3>
    <ul>
      <li>场景树会自动跟随 Paper.js 画布变化实时刷新，无需手动操作</li>
    </ul>
  </div>
);

const App: React.FC = () => {
  const { connected, connectionStatus, initialize } = usePaperStore();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const handleUnload = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { action: 'DEVTOOLS_CLEANUP' });
        }
      });
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      handleUnload();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>Paper.js DevTools</h1>
        <div className="header-right">
          <div className="connection-status">状态: {connected ? '已连接' : connectionStatus}</div>
          <QuestionCircleOutlined
            className="help-icon"
            onClick={() => setHelpOpen(true)}
          />
        </div>
      </div>
      <div className="app-content">
        <Splitter>
          <Splitter.Panel defaultSize="50%" min="20%" max="80%">
            <div className="scene-panel">
              <div className="panel-content">
                <SceneTreeView />
              </div>
            </div>
          </Splitter.Panel>
          <Splitter.Panel defaultSize="50%">
            <div className="properties-panel">
              <div className="panel-content">
                <PropertiesPanel />
              </div>
            </div>
          </Splitter.Panel>
        </Splitter>
      </div>
      <Modal
        title="Paper.js DevTools 使用说明"
        open={helpOpen}
        onCancel={() => setHelpOpen(false)}
        footer={null}
        width={520}
      >
        {HELP_CONTENT}
      </Modal>
    </div>
  );
};

export default App;
