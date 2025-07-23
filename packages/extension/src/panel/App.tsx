import React, { useState, useEffect } from 'react';
import { SceneTreeView } from './components/SceneTreeView';
import { PropertiesPanel } from './components/PropertiesPanel';
import { usePaperStore } from './store';
import './App.css';

const App: React.FC = () => {
  const { connected, connectionStatus, initialize } = usePaperStore();
  const [activeTab, setActiveTab] = useState<string>('scene');

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
        <div className="tabs">
          <button 
            className={activeTab === 'scene' ? 'active' : ''} 
            onClick={() => setActiveTab('scene')}
          >
            场景树
          </button>
          <button 
            className={activeTab === 'properties' ? 'active' : ''} 
            onClick={() => setActiveTab('properties')}
          >
            属性
          </button>
        </div>
      </div>
      <div className="app-content">
        {activeTab === 'scene' && <SceneTreeView />}
        {activeTab === 'properties' && <PropertiesPanel />}
      </div>
    </div>
  );
};

export default App; 