import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import App from './App.jsx';
import './index.css';

// HashRouter so the app also works on GitHub Pages (URLs like /#/cows)
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>
);
