import React, { useEffect, useMemo } from 'react';
import { Button, Input, Select, Tag, Tooltip } from 'antd';
import { ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, AimOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';

import { usePaperStore, PaperNode } from '../store';
import { TreeNode } from './TreeNode';

import './SceneTreeView.less';

interface FilterOptions {
  searchQuery: string;
  typeFilter: string[];
  visibilityFilter: 'all' | 'visible' | 'hidden';
}

function filterTree(node: PaperNode, options: FilterOptions): PaperNode | null {
  const { searchQuery, typeFilter, visibilityFilter } = options;
  const hasSearch = !!searchQuery;
  const hasTypeFilter = typeFilter.length > 0;
  const hasVisibilityFilter = visibilityFilter !== 'all';

  if (!hasSearch && !hasTypeFilter && !hasVisibilityFilter) return node;

  const lowerQuery = searchQuery.toLowerCase();
  const textMatch = !hasSearch ||
    node.name.toLowerCase().includes(lowerQuery) ||
    node.type.toLowerCase().includes(lowerQuery);
  const typeFilterMatch = !hasTypeFilter || typeFilter.includes(node.type);
  const visibilityMatch = !hasVisibilityFilter ||
    (visibilityFilter === 'visible' && node.visible) ||
    (visibilityFilter === 'hidden' && !node.visible);

  const selfMatch = textMatch && typeFilterMatch && visibilityMatch;

  const filteredChildren = node.children
    .map(child => filterTree(child, options))
    .filter((child): child is PaperNode => child !== null);

  if (selfMatch || filteredChildren.length > 0) {
    return {
      ...node,
      children: filteredChildren,
    };
  }

  return null;
}

const TYPE_SORT_ORDER: Record<string, number> = {
  Layer: 0,
  Group: 1,
};

function collectNodeTypes(node: PaperNode): string[] {
  const types = new Set<string>();
  const walk = (n: PaperNode) => {
    if (n.type !== 'Project') {
      types.add(n.type);
    }
    n.children.forEach(walk);
  };
  walk(node);
  return Array.from(types).sort((a, b) => {
    const orderA = TYPE_SORT_ORDER[a] ?? 99;
    const orderB = TYPE_SORT_ORDER[b] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
}

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
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    visibilityFilter,
    setVisibilityFilter,
  } = usePaperStore();

  useEffect(() => {
    if (connected) {
      refreshSceneTree();
    }
  }, [connected, refreshSceneTree]);

  const nodeTypeOptions = useMemo(() => {
    if (!sceneTree) return [];
    return collectNodeTypes(sceneTree).map(type => ({ label: type, value: type }));
  }, [sceneTree]);

  const filteredTree = useMemo(() => {
    if (!sceneTree) return null;
    return filterTree(sceneTree, { searchQuery, typeFilter, visibilityFilter });
  }, [sceneTree, searchQuery, typeFilter, visibilityFilter]);

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
      <div className="scene-tree-search">
        <Input
          placeholder="搜索节点名称或类型..."
          prefix={<SearchOutlined />}
          allowClear
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="scene-tree-filters">
        <Select
          className="type-filter"
          mode="multiple"
          placeholder="类型过滤"
          prefix={<FilterOutlined />}
          allowClear
          size="small"
          maxTagCount={2}
          maxTagPlaceholder={(omitted) => `+${omitted.length}`}
          value={typeFilter}
          onChange={setTypeFilter}
          options={nodeTypeOptions}
        />
        <Select
          className="visibility-filter"
          size="small"
          value={visibilityFilter}
          onChange={setVisibilityFilter}
          options={[
            { label: '全部', value: 'all' },
            { label: '可见', value: 'visible' },
            { label: '隐藏', value: 'hidden' },
          ]}
        />
      </div>
      <div className="scene-tree-content">
        {filteredTree ? (
          <TreeNode node={filteredTree} level={0} searchQuery={searchQuery} />
        ) : (
          <div className="scene-tree-empty">未找到匹配的节点</div>
        )}
      </div>
    </div>
  );
};
