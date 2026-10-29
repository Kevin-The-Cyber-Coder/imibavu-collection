import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './portal.css';
import { initTheme } from './utils/theme';
import App from './App';

/* Light / dark follows the device setting until the person chooses a side. */
initTheme();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
