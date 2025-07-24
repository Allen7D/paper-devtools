import React, { useEffect } from 'react';
import { Button } from 'antd';

import { usePaperStore } from '../store';
import { TreeNode } from './TreeNode';
import './SceneTreeView.less';

export const SceneTreeView: React.FC = () => {
  const { sceneTree, refreshSceneTree, connected } = usePaperStore();
  
  useEffect(() => {
    if (connected) {
      refreshSceneTree();
    }
  }, [connected, refreshSceneTree]);
  
  if (!connected) {
    return <div className="scene-tree-container">等待连接 Paper.js 应用...</div>;
  }
  
  if (!sceneTree) {
    return <div className="scene-tree-container">加载场景树...</div>;
  }

  console.log('sceneTree', sceneTree);
  
  return (
    <div className="scene-tree-container">
      <div className="scene-tree-header">
        <h5>场景树</h5>
        <Button onClick={refreshSceneTree}>刷新</Button>
      </div>
      <div className="scene-tree-content">
        <TreeNode node={sceneTree} level={0} />
      </div>
    </div>
  );
}; 