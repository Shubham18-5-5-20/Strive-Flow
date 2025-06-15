import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Corrected imports from the 'src/components' folder
import SignUp from './components/SignUp';
import Calendar from './components/Calendar';
import KanbanTaskBoard from './components/KanbanTaskBoard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Use the component names exactly as you provided */}
        <Route path="/" element={<SignUp />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/board/:date" element={<KanbanTaskBoard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;