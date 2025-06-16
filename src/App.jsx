import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Corrected imports from the 'src/components' folder
import SignUp from './components/SignUp';
import Calendar from './components/Calendar';
import KanbanTaskBoard from './components/KanbanTaskBoard';
// --- NEW: Import the AuthProvider ---
import { AuthProvider } from './components/AuthContext';

function App() {
  return (
    // --- NEW: Wrap everything in AuthProvider ---
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SignUp />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/board/:date" element={<KanbanTaskBoard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;