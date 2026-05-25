import React from 'react';
import ReactDOM from 'react-dom/client';
import Bugsnag from '@bugsnag/js';
import BugsnagPluginReact from '@bugsnag/plugin-react';
import BugsnagPerformance from '@bugsnag/browser-performance';
import App from './app/App';
import './styles/index.css';

Bugsnag.start({
  apiKey: 'a612c190c6467efcdcbb47faccd1b9c9',
  plugins: [new BugsnagPluginReact(React)],
  releaseStage: import.meta.env.MODE,
  enabledReleaseStages: ['production', 'staging', 'development'],
});

BugsnagPerformance.start({
  apiKey: 'a612c190c6467efcdcbb47faccd1b9c9',
  releaseStage: import.meta.env.MODE,
});

const ErrorBoundary =
  Bugsnag.getPlugin('react')?.createErrorBoundary(React) ?? React.Fragment;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
