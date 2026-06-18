import React, { useState } from 'react';
import { Modal, Splitter } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { SceneTreeView } from './components/SceneTreeView';
import { PropertiesPanel } from './components/PropertiesPanel';
import HelpContent from './components/HelpContent';
import { useDevToolsCleanup } from './hooks/useDevToolsCleanup';
import { usePaperStore } from './store';
import './App.less';

const App: React.FC = () => {
  const { connected, connectionStatus, initialize } = usePaperStore();
  const [helpOpen, setHelpOpen] = useState(false);

  useDevToolsCleanup();

  React.useEffect(() => {
    initialize();
  }, [initialize]);

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
        width={740}
      >
        <HelpContent />
      </Modal>
    </div>
  );
};

export default App;
