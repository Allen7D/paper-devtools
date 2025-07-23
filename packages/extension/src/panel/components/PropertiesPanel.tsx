import React, { useState } from 'react';
import { usePaperStore } from '../store';
import './PropertiesPanel.css';

// 属性编辑器组件
const PropertyEditor: React.FC<{
  nodeId: string;
  propName: string;
  propValue: any;
}> = ({ nodeId, propName, propValue }) => {
  const { updateNodeProperty } = usePaperStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(() => {
    // 转换属性值为字符串
    if (typeof propValue === 'object' && propValue !== null) {
      return JSON.stringify(propValue);
    }
    return String(propValue);
  });

  const handleEdit = () => {
    setEditing(true);
  };

  const handleSave = () => {
    setEditing(false);
    
    try {
      let newValue: any = value;
      
      // 尝试转换为合适的数据类型
      if (value === 'true' || value === 'false') {
        newValue = value === 'true';
      } else if (!isNaN(Number(value)) && value.trim() !== '') {
        newValue = Number(value);
      } else if (value.startsWith('{') || value.startsWith('[')) {
        newValue = JSON.parse(value);
      }
      
      updateNodeProperty(nodeId, propName, newValue);
    } catch (error) {
      console.error('无法保存属性:', error);
      // 重置为原始值
      setValue(String(propValue));
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setValue(String(propValue));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  // 对于对象类型的值，以 JSON 格式显示
  const displayValue = typeof propValue === 'object' && propValue !== null
    ? JSON.stringify(propValue)
    : String(propValue);

  return (
    <div className="property-editor">
      <div className="property-name">{propName}</div>
      <div className="property-value">
        {editing ? (
          <div className="edit-controls">
            <input
              type="text"
              value={value}
              onChange={handleChange}
              autoFocus
            />
            <div className="edit-actions">
              <button onClick={handleSave}>✓</button>
              <button onClick={handleCancel}>✗</button>
            </div>
          </div>
        ) : (
          <div className="display-value" onClick={handleEdit}>
            {displayValue}
          </div>
        )}
      </div>
    </div>
  );
};

// 主属性面板组件
export const PropertiesPanel: React.FC = () => {
  const { selectedNode } = usePaperStore();

  if (!selectedNode) {
    return (
      <div className="properties-panel">
        <div className="properties-header">
          <h3>属性</h3>
        </div>
        <div className="properties-content">
          <p className="no-selection">请在场景树中选择一个节点</p>
        </div>
      </div>
    );
  }

  // 获取所有要显示的属性
  const properties = selectedNode.properties || {};
  const propertyEntries = Object.entries(properties);

  return (
    <div className="properties-panel">
      <div className="properties-header">
        <h3>属性: {selectedNode.name || selectedNode.type}</h3>
      </div>
      <div className="properties-content">
        <div className="node-info">
          <div className="info-item">
            <span className="info-label">类型:</span>
            <span className="info-value">{selectedNode.type}</span>
          </div>
          <div className="info-item">
            <span className="info-label">ID:</span>
            <span className="info-value">{selectedNode.id}</span>
          </div>
          <div className="info-item">
            <span className="info-label">可见:</span>
            <span className="info-value">{selectedNode.visible ? '是' : '否'}</span>
          </div>
        </div>
        
        <div className="properties-list">
          <h4>属性列表</h4>
          {propertyEntries.length === 0 ? (
            <p>没有可编辑的属性</p>
          ) : (
            propertyEntries.map(([propName, propValue]) => (
              <PropertyEditor
                key={propName}
                nodeId={selectedNode.id}
                propName={propName}
                propValue={propValue}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}; 