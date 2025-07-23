import React, { useState, useEffect, useContext } from 'react';
import paper from 'paper';
import { Card, Form, Button, Typography, Badge, Space, Divider, InputNumber, ColorPicker } from 'antd';
import { PaperContext } from '@/context/PaperContext';

const { Title, Text } = Typography;

const ControlPanel: React.FC = () => {
  const { selectedItem } = useContext(PaperContext);
  const [form] = Form.useForm();
  
  // 状态
  const [itemName, setItemName] = useState<string>('无');
  const [posX, setPosX] = useState<number>(0);
  const [posY, setPosY] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [fillColor, setFillColor] = useState<string>('#000000');
  const [strokeColor, setStrokeColor] = useState<string>('#000000');
  
  // 当选中项目变化时更新UI
  useEffect(() => {
    if (selectedItem) {
      setItemName(selectedItem.name || selectedItem.className);
      
      // 更新位置输入框
      if (selectedItem.position) {
        setPosX(Math.round(selectedItem.position.x));
        setPosY(Math.round(selectedItem.position.y));
      }
      
      // 更新尺寸输入框
      if (selectedItem.bounds) {
        setWidth(Math.round(selectedItem.bounds.width));
        setHeight(Math.round(selectedItem.bounds.height));
      }
      
      // 更新颜色选择器
      if ((selectedItem as any).fillColor) {
        setFillColor((selectedItem as any).fillColor.toCSS ? 
          (selectedItem as any).fillColor.toCSS(true) : '#000000');
      }
      
      if ((selectedItem as any).strokeColor) {
        setStrokeColor((selectedItem as any).strokeColor.toCSS ? 
          (selectedItem as any).strokeColor.toCSS(true) : '#000000');
      }
      
      // 更新表单值
      form.setFieldsValue({
        posX: Math.round(selectedItem.position.x),
        posY: Math.round(selectedItem.position.y),
        width: Math.round(selectedItem.bounds.width),
        height: Math.round(selectedItem.bounds.height),
        fillColor: (selectedItem as any).fillColor?.toCSS ? 
          (selectedItem as any).fillColor.toCSS(true) : '#000000',
        strokeColor: (selectedItem as any).strokeColor?.toCSS ? 
          (selectedItem as any).strokeColor.toCSS(true) : '#000000'
      });
    } else {
      setItemName('无');
      setPosX(0);
      setPosY(0);
      setWidth(0);
      setHeight(0);
      setFillColor('#000000');
      setStrokeColor('#000000');
      
      form.resetFields();
    }
  }, [selectedItem, form]);
  
  // 更新位置
  const handleUpdatePosition = () => {
    if (!selectedItem || !paper) return;
    
    if (posX !== undefined && posY !== undefined) {
      selectedItem.position = new paper.Point(posX, posY);
      paper.view.update();
    }
  };
  
  // 更新尺寸
  const handleUpdateSize = () => {
    if (!selectedItem || !selectedItem.bounds || !paper) return;
    
    if (width !== undefined && height !== undefined && width > 0 && height > 0) {
      // 保存原始中心点
      const center = selectedItem.position.clone();
      
      // 计算缩放比例
      const scaleX = width / selectedItem.bounds.width;
      const scaleY = height / selectedItem.bounds.height;
      
      // 应用缩放
      selectedItem.scale(scaleX, scaleY);
      
      // 恢复原始中心点
      selectedItem.position = center;
      
      paper.view.update();
    }
  };
  
  // 更新填充颜色
  const handleUpdateFillColor = () => {
    if (!selectedItem || !paper) return;
    
    (selectedItem as any).fillColor = fillColor;
    paper.view.update();
  };
  
  // 更新边框颜色
  const handleUpdateStrokeColor = () => {
    if (!selectedItem || !paper) return;
    
    (selectedItem as any).strokeColor = strokeColor;
    paper.view.update();
  };
  
  return (
    <Card 
      className="control-panel" 
      title={<Title level={5}>选中元素控制</Title>}
      bordered={false}
    >
      <Space align="center" style={{ marginBottom: 16 }}>
        <Text strong>当前选中：</Text>
        <Badge 
          status={selectedItem ? "processing" : "default"} 
          text={itemName} 
        />
      </Space>
      
      <Form
        form={form}
        layout="vertical"
        disabled={!selectedItem}
      >
        <Divider orientation="left">位置</Divider>
        <Space style={{ display: 'flex', marginBottom: 16 }}>
          <Form.Item
            label="X坐标"
            name="posX"
            style={{ marginBottom: 0, marginRight: 8 }}
          >
            <InputNumber 
              value={posX}
              onChange={(value) => setPosX(value !== null ? value : 0)}
            />
          </Form.Item>
          
          <Form.Item
            label="Y坐标"
            name="posY"
            style={{ marginBottom: 0, marginRight: 8 }}
          >
            <InputNumber 
              value={posY}
              onChange={(value) => setPosY(value !== null ? value : 0)}
            />
          </Form.Item>
          
          <Button 
            type="primary" 
            onClick={handleUpdatePosition}
            disabled={!selectedItem}
            style={{ marginTop: 22 }}
          >
            应用
          </Button>
        </Space>
        
        <Divider orientation="left">尺寸</Divider>
        <Space style={{ display: 'flex', marginBottom: 16 }}>
          <Form.Item
            label="宽度"
            name="width"
            style={{ marginBottom: 0, marginRight: 8 }}
          >
            <InputNumber 
              min={1}
              value={width}
              onChange={(value) => setWidth(value !== null ? value : 0)}
            />
          </Form.Item>
          
          <Form.Item
            label="高度"
            name="height"
            style={{ marginBottom: 0, marginRight: 8 }}
          >
            <InputNumber 
              min={1}
              value={height}
              onChange={(value) => setHeight(value !== null ? value : 0)}
            />
          </Form.Item>
          
          <Button 
            type="primary" 
            onClick={handleUpdateSize} 
            disabled={!selectedItem}
            style={{ marginTop: 22 }}
          >
            应用
          </Button>
        </Space>
        
        <Divider orientation="left">颜色</Divider>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space style={{ display: 'flex' }}>
            <Form.Item
              label="填充颜色"
              name="fillColor"
              style={{ marginBottom: 8 }}
            >
              <ColorPicker 
                value={fillColor}
                onChange={(color) => setFillColor(color.toHexString())}
                showText
              />
            </Form.Item>
            
            <Button 
              type="primary" 
              onClick={handleUpdateFillColor} 
              disabled={!selectedItem}
              style={{ marginTop: 22 }}
            >
              应用
            </Button>
          </Space>
          
          <Space style={{ display: 'flex' }}>
            <Form.Item
              label="边框颜色"
              name="strokeColor"
              style={{ marginBottom: 0 }}
            >
              <ColorPicker 
                value={strokeColor}
                onChange={(color) => setStrokeColor(color.toHexString())}
                showText
              />
            </Form.Item>
            
            <Button 
              type="primary" 
              onClick={handleUpdateStrokeColor} 
              disabled={!selectedItem}
              style={{ marginTop: 22 }}
            >
              应用
            </Button>
          </Space>
        </Space>
      </Form>
    </Card>
  );
};

export default ControlPanel; 