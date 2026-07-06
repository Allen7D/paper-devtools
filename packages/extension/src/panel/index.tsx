import ReactDOM from "react-dom/client";
import { ConfigProvider, theme } from "antd";
import { setBridge } from "@/shared/bridge";
import { ExtensionBridge } from "@/shared/extensionBridge";

import App from "./App";
import "./index.less";

// 注入扩展通信桥接（Panel ↔ Content Script ↔ Injected Script）
setBridge(new ExtensionBridge());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ConfigProvider
    theme={{
      algorithm: theme.compactAlgorithm,
    }}
  >
    <App />
  </ConfigProvider>
);
