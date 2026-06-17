import React, { useEffect } from 'react';
import { Button, Select, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import { usePaperStore } from '../store';
import { TreeNode } from './TreeNode';

import './SceneTreeView.less';

export const SceneTreeView: React.FC = () => {
  const {
    sceneTree,
    refreshSceneTree,
    connected,
    availableScopes,
    activeScopeId,
    setActiveScope,
  } = usePaperStore();

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

  return (
    <div className="scene-tree-container">
      <div className="scene-tree-header">
        {availableScopes.length > 1 && (
          <Select
            className="scope-selector"
            value={activeScopeId || undefined}
            onChange={setActiveScope}
            size="small"
            options={availableScopes.map((scope) => ({
              value: scope.id,
              label: (
                <span className="scope-option">
                  <Tag color={scope.active ? 'blue' : 'default'}>
                    {scope.active ? '活跃' : ''}
                  </Tag>
                  {scope.canvasId || scope.id}
                </span>
              ),
            }))}
          />
        )}
        {availableScopes.length <= 1 && availableScopes.length > 0 && (
          <span className="scope-label">
            {availableScopes[0].canvasId || availableScopes[0].id}
          </span>
        )}
        <Button onClick={refreshSceneTree} icon={<ReloadOutlined />} size="small" />
      </div>
      <div className="scene-tree-content">
        <TreeNode node={sceneTree} level={0} />
      </div>
    </div>
  );
};
