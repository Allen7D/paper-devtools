import ReactDOM from 'react-dom/client';
import { Inspector } from 'react-dev-inspector';
import App from './App';

import './style.less';


// 仅在开发环境中启用Inspector
const InspectorWrapper = import.meta.env.DEV 
  ? () => <Inspector keys={['control', 'shift', 'F']} /> 
  : () => null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <InspectorWrapper />
    <App />
  </>
); 