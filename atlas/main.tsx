import React from 'react';
import {createRoot} from 'react-dom/client';
import AnatomyApp from './components/anatomy/AnatomyApp';
import AnatomyErrorBoundary from './components/anatomy/AnatomyErrorBoundary';
import './atlas.css';
createRoot(document.getElementById('root')!).render(<AnatomyErrorBoundary><AnatomyApp/></AnatomyErrorBoundary>);
