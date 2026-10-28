import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SpotApp } from './features/spot/SpotApp.js';
import './features/spot/style.css';
const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><SpotApp /></StrictMode>);
