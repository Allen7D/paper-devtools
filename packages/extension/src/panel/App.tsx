import React, { useEffect } from 'react';
import { Splitter } from 'antd';
import { SceneTreeView } from './components/SceneTreeView';
import { PropertiesPanel } from './components/PropertiesPanel';
import { usePaperStore } from './store';
import './App.less';

const App: React.FC = () => {
  const { connected, connectionStatus, initialize } = usePaperStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>Paper.js DevTools</h1>
        <div className="connection-status">
          状态: {connected ? '已连接' : connectionStatus}
        </div>
      </div>
      <div className="app-content">
        <Splitter>
          <Splitter.Panel size="50%" min="20%" max="80%">
            <div className="scene-panel">
              <div className="panel-content">
                <SceneTreeView />
              </div>
            </div>
          </Splitter.Panel>
          <Splitter.Panel>
            <div className="properties-panel">
              <div className="panel-content">
                <PropertiesPanel />
              </div>
            </div>
          </Splitter.Panel>
        </Splitter>
      </div>
    </div>
  );
};

export default App; 