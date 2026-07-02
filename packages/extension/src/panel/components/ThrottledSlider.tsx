import React, { useState, useEffect } from 'react';
import { Slider } from 'antd';

/**
 * 节流滑块组件
 * - 本地 state 实时更新，保证拖拽时滑块跟随鼠标
 * - onChange 回调（节流）仅负责向后端同步，不影响 UI 流畅度
 */
const ThrottledSlider: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  tooltipFormatter: (val?: number) => string;
}> = ({ value, onChange, min, max, step, tooltipFormatter }) => {
  const [localValue, setLocalValue] = useState(value);

  // 外部值变化时同步本地（如切换节点、后端回写）
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <Slider
      min={min}
      max={max}
      step={step}
      value={localValue}
      onChange={(val) => {
        setLocalValue(val);
        onChange(val);
      }}
      tooltip={{ formatter: tooltipFormatter }}
    />
  );
};

export default ThrottledSlider;
