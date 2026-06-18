import React from 'react';
import {
  AimOutlined,
  EyeOutlined,
  SwapOutlined,
  SearchOutlined,
  FilterOutlined,
  CaretRightOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';

import './HelpContent.less';

const Icon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="help-icon-inline">{children}</span>
);

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="help-kbd">{children}</kbd>
);

const HelpContent: React.FC = () => (
  <div className="help-content">
    <div className="help-columns">
      <div className="help-col">
        <h2>交互操作</h2>

        <h3>场景树</h3>
        <ul>
          <li>点击节点 — 选中图元，右侧显示属性；再次点击取消选中</li>
          <li><Icon><EyeOutlined /></Icon> 眼睛图标 — 切换图元可见性</li>
          <li><Icon><CaretRightOutlined /></Icon> 箭头图标 — 展开/折叠子节点</li>
        </ul>

        <h3>拾取器</h3>
        <ul>
          <li><Icon><AimOutlined /></Icon> 按钮 — 激活拾取器，Canvas 光标变为十字</li>
          <li>点击 Canvas 上的图元 — 选中该图元</li>
          <li><Kbd>Ctrl</Kbd> + 点击 — 向上拾取父级图元（Group → Layer → Project）</li>
          <li>点击已选中图元 — 取消选中</li>
          <li>再次点击 <Icon><AimOutlined /></Icon> — 关闭拾取器</li>
        </ul>

        <h3>搜索与过滤</h3>
        <ul>
          <li><Icon><SearchOutlined /></Icon> 搜索框 — 按节点名称或类型模糊搜索</li>
          <li><Icon><FilterOutlined /></Icon> 类型过滤 — 多选过滤特定类型的图元</li>
          <li>
            <Tag className="help-vis-tag">全</Tag>
            <Tag className="help-vis-tag" color="green">显</Tag>
            <Tag className="help-vis-tag" color="red">隐</Tag>
            显隐切换 — 切换显示全部/仅可见/仅隐藏节点
          </li>
        </ul>
      </div>

      <div className="help-col">
        <h2>功能特性</h2>

        <h3>高亮覆盖层</h3>
        <ul>
          <li>选中节点 — Canvas 上显示红色实线边框高亮</li>
          <li>悬停节点 — Canvas 上显示蓝色虚线边框高亮</li>
          <li><Icon><EyeOutlined /></Icon> 按钮 — 开关高亮覆盖层</li>
        </ul>

        <h3>多画布管理</h3>
        <ul>
          <li>画布下拉框 — 多个 Canvas 时可切换活跃画布</li>
          <li><Icon><SwapOutlined /></Icon> 自动切换 — 点击 Canvas 自动切换到对应画布（默认开启）</li>
          <li><Icon><ReloadOutlined /></Icon> 刷新 — 手动刷新场景树</li>
          <li>新增/删除画布 — 自动检测并更新 DevTools</li>
        </ul>

        <h3>控制台调试</h3>
        <ul>
          <li>选中图元后，可在 Chrome 控制台通过 <code>$paper</code> 变量访问当前选中的图元对象</li>
        </ul>

        <h3>实时更新</h3>
        <ul>
          <li>场景树会自动跟随 Paper.js 画布变化实时刷新，无需手动操作</li>
        </ul>
      </div>
    </div>
  </div>
);

export default HelpContent;
