import React, { useContext, useEffect, useRef, useState } from 'react';
import paper from 'paper';
import { Card, Tooltip, Radio } from 'antd';
import {
	SelectOutlined,
	BorderOuterOutlined,
	AimOutlined,
	BorderInnerOutlined,
	LineOutlined,
	EditOutlined,
	StarOutlined
} from '@ant-design/icons';
import { PaperContext } from '@/context/PaperContext';
import { createRandomInitShapeSet } from '@/utils/paperShapes';
import { ToolManager, ToolType } from '@/utils/tools';

const CanvasContainer: React.FC = () => {
	const { setSelectedItem } = useContext(PaperContext);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const toolManagerRef = useRef<ToolManager | null>(null);
	const [activeToolType, setActiveToolType] = useState<ToolType>(ToolType.SELECT);

	// 初始化Paper.js和工具
	useEffect(() => {
		if (canvasRef.current) {
			// 设置Paper.js
			paper.setup(canvasRef.current);
			
			// 创建初始图形
			createRandomInitShapeSet();
			
			// 初始化工具管理器
			toolManagerRef.current = new ToolManager();
			
			// 监听选择事件，同步到React状态
			window.addEventListener('paper:item:selected', ((e: CustomEvent) => {
				setSelectedItem(e.detail.item);
			}) as EventListener);
			
			// 监听取消选择事件
			window.addEventListener('paper:item:unselected', () => {
				setSelectedItem(null);
			});
			
			// 监听工具变化事件
			window.addEventListener('paper:tool:changed', ((e: CustomEvent) => {
				setActiveToolType(e.detail.toolType);
			}) as EventListener);
			
			// 更新视图
			paper.view.update();
		}
		
		// 清理函数
		return () => {
			window.removeEventListener('paper:item:selected', (() => {}) as EventListener);
			window.removeEventListener('paper:item:unselected', () => {});
			window.removeEventListener('paper:tool:changed', (() => {}) as EventListener);
			
			if (paper.project) {
				paper.project.clear();
			}
			
			// 清理工具
			toolManagerRef.current = null;
		};
	}, [setSelectedItem]);

	// 激活工具的处理函数
	const handleActivateTool = (toolType: ToolType) => {
		if (toolManagerRef.current) {
			toolManagerRef.current.activateTool(toolType);
		}
	};

	return (
		<Card className="canvas-container" bordered={false}>
			<div className="canvas-wrapper">
				<canvas ref={canvasRef} id="paperCanvas" data-paper-resize></canvas>
				<Card 
					className="canvas-tools" 
					size="small" 
					bordered={true}
					style={{ width: 'auto' }}
				>
					<Radio.Group 
						value={activeToolType} 
						onChange={(e) => handleActivateTool(e.target.value)}
						buttonStyle="solid"
						size="middle"
					>
						<Tooltip title="选择工具">
							<Radio.Button value={ToolType.SELECT}>
								<SelectOutlined />
							</Radio.Button>
						</Tooltip>
						<Tooltip title="矩形工具">
							<Radio.Button value={ToolType.RECTANGLE}>
								<BorderOuterOutlined />
							</Radio.Button>
						</Tooltip>
						<Tooltip title="圆形工具">
							<Radio.Button value={ToolType.CIRCLE}>
								<AimOutlined />
							</Radio.Button>
						</Tooltip>
						<Tooltip title="椭圆工具">
							<Radio.Button value={ToolType.ELLIPSE}>
								<BorderInnerOutlined />
							</Radio.Button>
						</Tooltip>
						<Tooltip title="线条工具">
							<Radio.Button value={ToolType.LINE}>
								<LineOutlined />
							</Radio.Button>
						</Tooltip>
						<Tooltip title="自由绘制工具">
							<Radio.Button value={ToolType.FREEHAND}>
								<EditOutlined />
							</Radio.Button>
						</Tooltip>
						<Tooltip title="多边形工具">
							<Radio.Button value={ToolType.POLYGON}>
								<StarOutlined />
							</Radio.Button>
						</Tooltip>
					</Radio.Group>
				</Card>
			</div>
			<Card 
				className="canvas-instructions" 
				size="small" 
				title="操作说明" 
			>
				<ul>
					<li>点击工具按钮选择绘图工具</li>
					<li>在画布上绘制图形</li>
					<li>选择工具可选中、移动和调整图形</li>
					<li>拖动蓝色控制点可调整大小</li>
				</ul>
			</Card>
		</Card>
	);
};

export default CanvasContainer; 