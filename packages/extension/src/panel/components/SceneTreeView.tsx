import React, { useEffect, useMemo } from 'react';
import { Button, Input, Select, Tag, Tooltip } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, AimOutlined, SearchOutlined, FilterOutlined, SwapOutlined } from '@ant-design/icons';

import { usePaperStore, PaperNode } from '../store';
import { TreeNode } from './TreeNode';
import { getVisibleNodeIds } from '../utils/navigation';

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
    autoSwitchScope,
    setAutoSwitchScope,
    expandedNodes,
    selectNode,
    toggleNodeExpanded,
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

  const visibleNodeIds = useMemo(() => {
    if (!filteredTree) return [];
    return getVisibleNodeIds(filteredTree, expandedNodes);
  }, [filteredTree, expandedNodes]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { selectedNode, expandedNodes } = usePaperStore.getState();
    // 防止输入框等可编辑元素被拦截
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const currentId = selectedNode?.id;
    const visibleIds = visibleNodeIds;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (!currentId || visibleIds.length === 0) {
          // 无选中时，选中第一个
          if (visibleIds.length > 0) selectNode(visibleIds[0]);
          return;
        }
        const idx = visibleIds.indexOf(currentId);
        if (idx >= 0 && idx < visibleIds.length - 1) {
          selectNode(visibleIds[idx + 1]);
        } else if (idx === -1 && visibleIds.length > 0) {
          // 当前选中不在可见列表中（可能被过滤），选第一个
          selectNode(visibleIds[0]);
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (!currentId || visibleIds.length === 0) return;
        const idx = visibleIds.indexOf(currentId);
        if (idx > 0) {
          selectNode(visibleIds[idx - 1]);
        } else if (idx === -1 && visibleIds.length > 0) {
          selectNode(visibleIds[0]);
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (!currentId) return;
        // 已展开则折叠
        if (expandedNodes.has(currentId)) {
          toggleNodeExpanded(currentId);
        } else {
          // 已折叠则选中父节点（由 ID 路径推导）
          const parts = currentId.split('_');
          if (parts.length > 1) {
            const parentId = parts.slice(0, -1).join('_');
            selectNode(parentId);
          }
        }
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        if (!currentId || !filteredTree) return;
        // 在 filteredTree 中查找当前节点
        const findNode = (node: PaperNode, id: string): PaperNode | null => {
          if (node.id === id) return node;
          for (const child of node.children) {
            const found = findNode(child, id);
            if (found) return found;
          }
          return null;
        };
        const currentNode = findNode(filteredTree, currentId);
        if (!currentNode) return;
        if (currentNode.children.length === 0) return; // 无子节点
        // 已折叠则展开
        if (!expandedNodes.has(currentId)) {
          toggleNodeExpanded(currentId);
        } else {
          // 已展开则选中第一个子节点
          selectNode(currentNode.children[0].id);
        }
        break;
      }
    }
  };

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
        <Tooltip title={autoSwitchScope ? '关闭点击画布自动切换' : '开启点击画布自动切换'}>
          <Button
            onClick={() => setAutoSwitchScope(!autoSwitchScope)}
            icon={<SwapOutlined />}
            size="small"
            type={autoSwitchScope ? 'primary' : 'default'}
          />
        </Tooltip>
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
        <Input
          className="search-input"
          placeholder="搜索节点名称或类型..."
          prefix={<SearchOutlined />}
          allowClear
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <span
          className={`visibility-toggle ${visibilityFilter}`}
          onClick={() => {
            const next = visibilityFilter === 'all' ? 'visible' : visibilityFilter === 'visible' ? 'hidden' : 'all';
            setVisibilityFilter(next);
          }}
          title={visibilityFilter === 'all' ? '显示全部节点' : visibilityFilter === 'visible' ? '仅显示可见节点' : '仅显示隐藏节点'}
        >
          {visibilityFilter === 'all' ? '全' : visibilityFilter === 'visible' ? '显' : '隐'}
        </span>
      </div>
      <div
        className="scene-tree-content"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {filteredTree ? (
          <TreeNode node={filteredTree} level={0} searchQuery={searchQuery} />
        ) : (
          <div className="scene-tree-empty">未找到匹配的节点</div>
        )}
      </div>
    </div>
  );
};
