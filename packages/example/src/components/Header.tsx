import React from 'react';
import paper from 'paper';
import { Layout, Typography, Button, Space, Divider, Upload, message } from 'antd';
import {
  BorderOuterOutlined,
  AimOutlined,
  DeploymentUnitOutlined,
  ApartmentOutlined,
  ClearOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { createRectangle, createCircle, createPath, createGroup, clearCanvas } from '@/utils/paperShapes';

const { Header: AntHeader } = Layout;
const { Title } = Typography;

const Header: React.FC = () => {
  const handleCreateRectangle = () => {
    if (paper) createRectangle();
  };

  const handleCreateCircle = () => {
    if (paper) createCircle();
  };

  const handleCreatePath = () => {
    if (paper) createPath();
  };

  const handleCreateGroup = () => {
    if (paper) createGroup();
  };

  const handleClearCanvas = () => {
    if (paper) clearCanvas();
  };

  const handleExportJson = () => {
    if (paper && paper.project) {
      // 获取 project 的 JSON 数据
      const json = paper.project.exportJSON({ asString: true });
      
      // 创建下载
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // 创建临时下载链接
      const a = document.createElement('a');
      a.href = url;
      a.download = 'paper-canvas.json';
      a.click();
      
      // 清理
      URL.revokeObjectURL(url);
      
      message.success('导出JSON成功');
    }
  };

  const handleFileImport = (file: File) => {
    if (!file || !paper) return false;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      if (json) {
        try {
          // 清空当前画布
          clearCanvas();
          
          // 导入 JSON 数据
          paper.project.importJSON(json);
          
          // 更新视图
          paper.view.update();
          
          message.success('导入JSON成功');
        } catch (error) {
          console.error('导入 JSON 失败:', error);
          message.error('导入失败，请检查JSON格式是否正确');
        }
      }
    };
    
    reader.readAsText(file);
    
    // 返回 false 防止默认上传行为
    return false;
  };

  return (
    <AntHeader className="app-header">
      <div className="header-content">
        <Title level={3} className="app-title">Paper.js DevTools 测试示例</Title>
        <div className="header-tools">
          <Space size="small">
            <Button icon={<BorderOuterOutlined />} onClick={handleCreateRectangle}>创建矩形</Button>
            <Button icon={<AimOutlined />} onClick={handleCreateCircle}>创建圆形</Button>
            <Button icon={<DeploymentUnitOutlined />} onClick={handleCreatePath}>创建路径</Button>
            <Button icon={<ApartmentOutlined />} onClick={handleCreateGroup}>创建组</Button>
            <Button icon={<ClearOutlined />} onClick={handleClearCanvas}>清空画布</Button>
            <Divider type="vertical" />
            <Button type="primary" icon={<ExportOutlined />} onClick={handleExportJson}>导出JSON</Button>
            <Upload 
              showUploadList={false}
              beforeUpload={handleFileImport}
              accept=".json"
            >
              <Button type="primary" icon={<ImportOutlined />}>导入JSON</Button>
            </Upload>
          </Space>
        </div>
      </div>
    </AntHeader>
  );
};

export default Header; 