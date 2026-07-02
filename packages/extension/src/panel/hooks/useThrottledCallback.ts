import { useCallback, useRef } from 'react';

/**
 * 节流 hook（trailing）：连续调用时只执行最后一次，间隔 delay ms。
 *
 * 用于 Slider 拖拽、DragNumberInput 拖拽等高频场景，
 * 避免每次微调都触发 chrome 消息往返和场景树刷新。
 *
 * @param fn 需要节流的目标函数
 * @param delay 节流间隔（ms）
 */
export function useThrottledCallback<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fnRef.current(...args);
      timerRef.current = null;
    }, delay);
  }, [delay]) as T;
}
