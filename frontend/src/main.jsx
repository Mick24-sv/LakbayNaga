import React from 'react';
import { createRoot } from 'react-dom/client';
import Home from './Home.jsx';
import './style.css';

// TODO: Add navigation, attractions, attraction details, and saved places.
function App() {
  return <main><Home /></main>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
