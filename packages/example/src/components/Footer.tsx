import React from 'react';
import { Layout, Typography } from 'antd';

const { Footer: AntFooter } = Layout;
const { Text } = Typography;

const Footer: React.FC = () => {
  return (
    <AntFooter className="app-footer">
      <Text type="secondary">提示: 点击画布中的图形可选中并编辑；F12 打开开发者工具，然后点击 "Paper.js" 标签页进行调试</Text>
    </AntFooter>
  );
};

export default Footer; 