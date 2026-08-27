import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { configureNativeShell } from './services/device';
import { AppStoreProvider } from './store/AppStore';
import './styles.css';

void configureNativeShell();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStoreProvider>
      <App />
    </AppStoreProvider>
  </StrictMode>,
);
