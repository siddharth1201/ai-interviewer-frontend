import React from 'react';
import { motion } from 'framer-motion';
import { Routes, Route } from 'react-router-dom';

import { InterviewProvider } from './contexts/InterviewContext';
import { MicrophoneProvider } from './contexts/MicrophoneContext';
import Onboarding from './pages/Onboarding';
import Interview from './pages/Interview';

function App() {
  return (
    <motion.div 
      className="min-h-screen bg-slate-50 font-sans"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <InterviewProvider>
        <MicrophoneProvider>
          <Routes>
            <Route path="/" element={<Onboarding />} />
            <Route path="/interview" element={<Interview />} />
          </Routes>
        </MicrophoneProvider>
      </InterviewProvider>
    </motion.div>
  );
}

export default App;