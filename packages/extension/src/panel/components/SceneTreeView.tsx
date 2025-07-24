import React, { useEffect } from 'react';
import { EyeOutlined, EyeInvisibleOutlined, CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';

import { usePaperStore, PaperNode } from '../store';

import './SceneTreeView.less';
import { Button } from 'antd';

interface TreeNodeProps {
  node: PaperNode;
  level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level }) => {
  const { 
    expandedNodes, 
    toggleNodeExpanded, 
    selectNode, 
    toggleNodeVisibility,
    selectedNode
  } = usePaperStore();
  
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeExpanded(node.id);
  };
  
  const handleSelect = () => {
    selectNode(node.id);
  };
  
  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeVisibility(node.id);
  };
  
  return (
    <div className="tree-node-container">
      <div 
        className={`tree-node ${isSelected ? 'selected' : ''}`} 
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={handleSelect}
      >
        {node.children.length > 0 && (
          <span className="expand-icon" onClick={handleToggleExpand}>
            {isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
          </span>
        )}
        <span 
          className="visibility-icon" 
          onClick={handleToggleVisibility}
        >
          {node.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
        </span>
        <span className="node-type">{node.type}</span>
        <span className="node-name">{node.name || '<无名称>'}</span>
      </div>
      
      {isExpanded && node.children.length > 0 && (
        <div className="tree-node-children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

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