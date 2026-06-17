import React, { useEffect } from 'react';
import { Button, Select, Tag, Tooltip } from 'antd';
import { ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, AimOutlined } from '@ant-design/icons';

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
    overlayEnabled,
    setOverlayEnabled,
    pickerEnabled,
    togglePicker,
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
        <Tooltip title={pickerEnabled ? '关闭拾取器' : '拾取器：点击画布选中图元'}>
          <Button
            onClick={togglePicker}
            icon={<AimOutlined />}
            size="small"
            type={pickerEnabled ? 'primary' : 'default'}
            danger={pickerEnabled}
          />
        </Tooltip>
        <Tooltip title={overlayEnabled ? '关闭高亮覆盖层' : '开启高亮覆盖层'}>
          <Button
            onClick={() => setOverlayEnabled(!overlayEnabled)}
            icon={overlayEnabled ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            size="small"
            type={overlayEnabled ? 'primary' : 'default'}
          />
        </Tooltip>
        <Button onClick={refreshSceneTree} icon={<ReloadOutlined />} size="small" />
      </div>
      <div className="scene-tree-content">
        <TreeNode node={sceneTree} level={0} />
      </div>
    </div>
  );
};
