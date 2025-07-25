import React from 'react';
import { 
  Card, 
  Input, 
  Typography, 
  Space, 
  Row, 
  Col, 
  Descriptions, 
  Switch,
  InputNumber,
  ColorPicker,
  Slider,
  Collapse,
  message 
} from 'antd';
import type { Color } from 'antd/es/color-picker';
import { usePaperStore } from '../store';

import './PropertiesPanel.less';

const { Text } = Typography;

// 智能属性类型检测
const detectPropertyType = (propName: string, propValue: any): string => {
  const name = propName.toLowerCase();
  
  // 颜色属性检测
  if (name.includes('color')) {
    return 'color';
  }
  
  // 透明度属性
  if (name.includes('opacity') || name.includes('alpha')) {
    return 'opacity';
  }
  
  // 角度属性
  if (name.includes('angle') || name.includes('rotation') || name === 'rotate') {
    return 'angle';
  }
  
  // 坐标点属性
  if (typeof propValue === 'object' && propValue !== null && 
      ('x' in propValue && 'y' in propValue)) {
    return 'point';
  }
  
  // 尺寸属性
  if (typeof propValue === 'object' && propValue !== null && 
      ('width' in propValue && 'height' in propValue)) {
    return 'size';
  }
  
  // 矩形属性
  if (typeof propValue === 'object' && propValue !== null && 
      ('x' in propValue && 'y' in propValue && 'width' in propValue && 'height' in propValue)) {
    return 'rectangle';
  }
  
  // 数组属性
  if (Array.isArray(propValue)) {
    return 'array';
  }
  
  // 对象属性
  if (typeof propValue === 'object' && propValue !== null) {
    return 'object';
  }
  
  // 基础类型
  if (typeof propValue === 'boolean') return 'boolean';
  if (typeof propValue === 'number') return 'number';
  return 'string';
};

// 颜色编辑器组件
const ColorEditor: React.FC<{ value: any; onChange: (value: any) => void }> = ({ value, onChange }) => {
  const handleColorChange = (color: Color) => {
    const hex = color.toHexString();
    onChange(hex);
  };
  
  return (
    <ColorPicker
      value={value}
      onChange={handleColorChange}
      showText
      size="small"
      presets={[
        {
          label: '常用颜色',
          colors: [
            '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
            '#000000', '#ffffff', '#808080', '#ffa500', '#800080', '#008000'
          ]
        }
      ]}
    />
  );
};

// 坐标点编辑器
const PointEditor: React.FC<{ value: any; onChange: (value: any) => void }> = ({ value, onChange }) => {
  const handleXChange = (x: number | null) => {
    if (x !== null) onChange({ ...value, x });
  };
  
  const handleYChange = (y: number | null) => {
    if (y !== null) onChange({ ...value, y });
  };
  
  return (
    <Row gutter={4}>
      <Col span={12}>
        <InputNumber
          value={value.x}
          onChange={handleXChange}
          placeholder="X"
          size="small"
          precision={2}
          addonBefore="X"
        />
      </Col>
      <Col span={12}>
        <InputNumber
          value={value.y}
          onChange={handleYChange}
          placeholder="Y"
          size="small"
          precision={2}
          addonBefore="Y"
        />
      </Col>
    </Row>
  );
};

// 尺寸编辑器
const SizeEditor: React.FC<{ value: any; onChange: (value: any) => void }> = ({ value, onChange }) => {
  const handleWidthChange = (width: number | null) => {
    if (width !== null) onChange({ ...value, width });
  };
  
  const handleHeightChange = (height: number | null) => {
    if (height !== null) onChange({ ...value, height });
  };
  
  return (
    <Row gutter={4}>
      <Col span={12}>
        <InputNumber
          value={value.width}
          onChange={handleWidthChange}
          placeholder="宽度"
          size="small"
          precision={2}
          addonBefore="W"
        />
      </Col>
      <Col span={12}>
        <InputNumber
          value={value.height}
          onChange={handleHeightChange}
          placeholder="高度"
          size="small"
          precision={2}
          addonBefore="H"
        />
      </Col>
    </Row>
  );
};

// 对象编辑器（折叠面板形式）
const ObjectEditor: React.FC<{ 
  value: any; 
  onChange: (value: any) => void;
  propName: string;
  nodeId: string;
}> = ({ value, onChange, propName, nodeId }) => {
  const entries = Object.entries(value);
  
  const handleNestedChange = (key: string, newValue: any) => {
    onChange({ ...value, [key]: newValue });
  };
  
  return (
    <Collapse size="small" ghost>
      <Collapse.Panel header={`${propName} (${entries.length} 项)`} key="1">
        <div style={{ paddingLeft: 12 }}>
          {entries.map(([key, val]) => (
            <PropertyEditor
              key={key}
              nodeId={nodeId}
              propName={key}
              propValue={val}
              onNestedChange={(newVal) => handleNestedChange(key, newVal)}
              isNested
            />
          ))}
        </div>
      </Collapse.Panel>
    </Collapse>
  );
};

// 智能属性编辑器组件
const PropertyEditor: React.FC<{
  nodeId: string;
  propName: string;
  propValue: any;
  onNestedChange?: (value: any) => void;
  isNested?: boolean;
}> = ({ nodeId, propName, propValue, onNestedChange, isNested = false }) => {
  const { updateNodeProperty } = usePaperStore();
  
  // 实时更新属性值
  const handleChange = async (newValue: any) => {
    try {
      if (onNestedChange) {
        // 嵌套属性更新
        onNestedChange(newValue);
      } else {
        // 根级属性更新
        await updateNodeProperty(nodeId, propName, newValue);
      }
    } catch (error) {
      console.error('无法更新属性:', error);
      message.error(`更新属性 ${propName} 失败`);
    }
  };

  // 根据属性类型智能选择编辑器
  const renderEditor = () => {
    const propertyType = detectPropertyType(propName, propValue);
    
    switch (propertyType) {
      case 'color':
        return <ColorEditor value={propValue} onChange={handleChange} />;
        
      case 'opacity':
        return (
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={propValue}
            onChange={handleChange}
            tooltip={{ formatter: (val) => `${Math.round((val || 0) * 100)}%` }}
          />
        );
        
      case 'angle':
        return (
          <Slider
            min={0}
            max={360}
            step={1}
            value={propValue}
            onChange={handleChange}
            tooltip={{ formatter: (val) => `${val}°` }}
          />
        );
        
      case 'point':
        return <PointEditor value={propValue} onChange={handleChange} />;
        
      case 'size':
        return <SizeEditor value={propValue} onChange={handleChange} />;
        
      case 'boolean':
        return (
          <Switch
            checked={propValue}
            onChange={handleChange}
            checkedChildren="是"
            unCheckedChildren="否"
            size="small"
          />
        );
        
      case 'number':
        return (
          <InputNumber
            value={propValue}
            onChange={(val) => val !== null && handleChange(val)}
            style={{ width: '100%' }}
            precision={2}
            size="small"
          />
        );
        
      case 'object':
        return (
          <ObjectEditor
            value={propValue}
            onChange={handleChange}
            propName={propName}
            nodeId={nodeId}
          />
        );
        
      case 'array':
        return (
          <Input.TextArea
            value={JSON.stringify(propValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleChange(parsed);
              } catch {
                // JSON 格式无效时不更新
              }
            }}
            rows={3}
            placeholder="JSON 数组格式"
            size="small"
          />
        );
        
      default:
        return (
          <Input
            value={String(propValue)}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="输入属性值"
            size="small"
          />
        );
    }
  };

  const colSpan = isNested ? { label: 10, value: 14 } : { label: 8, value: 16 };

  return (
    <Row gutter={[8, 8]} align="middle" style={{ marginBottom: isNested ? 8 : 12 }}>
      <Col span={colSpan.label}>
        <Text strong style={{ fontSize: isNested ? '12px' : '13px' }}>
          {propName}
        </Text>
      </Col>
      <Col span={colSpan.value}>
        {renderEditor()}
      </Col>
    </Row>
  );
};

// 主属性面板组件
export const PropertiesPanel: React.FC = () => {
  const { selectedNode } = usePaperStore();

  if (!selectedNode) {
    return (
      <div className="properties-panel">
        <div className="properties-content">
          <Card size="small" style={{ textAlign: 'center', margin: '20px 0' }}>
            <Text type="secondary">请在场景树中选择一个节点</Text>
          </Card>
        </div>
      </div>
    );
  }

  // 获取所有要显示的属性
  const properties = selectedNode.properties || {};
  const propertyEntries = Object.entries(properties);

  return (
    <div className="properties-panel">
      <div className="properties-content">
        {/* 节点基本信息 */}
        <Card size="small" title={
          <Space>
            <Text strong>{selectedNode.name || selectedNode.type}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              ({selectedNode.type})
            </Text>
          </Space>
        } style={{ marginBottom: 16 }}>
          <Descriptions size="small" column={3} bordered={false}>
            <Descriptions.Item label="ID">
              <Text code>{selectedNode.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="类型">
              <Text>{selectedNode.type}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="显隐">
              <Text type={selectedNode.visible ? 'success' : 'secondary'}>
                {selectedNode.visible ? '显示' : '隐藏'}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
        
        {/* 属性编辑区域 */}
        <Card 
          size="small" 
          title={
            <Space>
              <Text strong>属性</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ({propertyEntries.length} 项)
              </Text>
            </Space>
          }
        >
          {propertyEntries.length === 0 ? (
            <Text type="secondary" style={{ fontStyle: 'italic' }}>
              没有可编辑的属性
            </Text>
          ) : (
            <div>
              {propertyEntries.map(([propName, propValue]) => (
                <PropertyEditor
                  key={propName}
                  nodeId={selectedNode.id}
                  propName={propName}
                  propValue={propValue}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}; 