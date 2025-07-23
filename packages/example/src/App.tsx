import React, { useState, useEffect } from 'react';
import { Layout, ConfigProvider, theme } from 'antd';
import Header from '@/components/Header';
import CanvasContainer from '@/components/CanvasContainer';
import ControlPanel from '@/components/ControlPanel';
import Footer from '@/components/Footer';
import { PaperContext } from '@/context/PaperContext';
import { initPaper } from '@/utils/paperSetup';

import './style.less';

const { Content } = Layout;

const App: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  useEffect(() => {
    // 初始化 Paper.js 并暴露给 DevTools
    const paperObj = initPaper();
    
    return () => {
      // 清理资源
      if (paperObj?.project) {
        paperObj.project.clear();
      }
    };
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#4285F4',
        },
      }}
    >
      <PaperContext.Provider value={{ selectedItem, setSelectedItem }}>
        <Layout className="app">
          <Header />
          <Content className="main-content">
            <div className="main-container">
              <CanvasContainer />
              <ControlPanel />
            </div>
          </Content>
          <Footer />
        </Layout>
      </PaperContext.Provider>
    </ConfigProvider>
  );
};

export default App; 