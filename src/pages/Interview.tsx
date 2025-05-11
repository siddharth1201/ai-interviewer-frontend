import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, X } from 'lucide-react';

import { useInterview } from '../contexts/InterviewContext';
import AudioWaveform from '../components/AudioWaveform';
import LoadingAnimation from '../components/LoadingAnimation';

const Interview = () => {
  const navigate = useNavigate();
  const { 
    isInterviewActive,
    isInterviewReady,
    isSystemSpeaking,
    isMicActive,
    isLoading,
    error,
    candidateName,
    endInterview,
    toggleMicrophone
  } = useInterview();

  // Redirect to homepage if not in an active interview
  useEffect(() => {
    if (!isInterviewActive && !isLoading && !error) {
      navigate('/');
    }
  }, [isInterviewActive, isLoading, error, navigate]);

  const backgroundColor = isSystemSpeaking ? 'bg-blue-500' : 'bg-green-500';
  
  return (
    <AnimatePresence mode="wait">
      <motion.div 
        className={`min-h-screen flex flex-col transition-colors duration-500 ease-in-out ${backgroundColor}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <header className="p-4 flex justify-between items-center">
          <div className="text-white font-medium">
            Interview with {candidateName}
          </div>
          <motion.button
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2"
            onClick={endInterview}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X size={20} />
          </motion.button>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center p-6">
          {isLoading ? (
            <div className="bg-white bg-opacity-90 rounded-xl p-8 shadow-lg">
              <LoadingAnimation />
            </div>
          ) : error ? (
            <motion.div 
              className="bg-white bg-opacity-90 rounded-xl p-8 shadow-lg max-w-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h2 className="text-xl font-bold text-red-600 mb-3">Error</h2>
              <p className="text-slate-700 mb-4">{error}</p>
              <button 
                className="btn btn-primary w-full"
                onClick={() => navigate('/')}
              >
                Go Back
              </button>
            </motion.div>
          ) : isInterviewReady ? (
            <div className="w-full max-w-2xl">
              <motion.div 
                className="glass-panel bg-white bg-opacity-20 rounded-xl p-6 backdrop-blur-sm shadow-lg flex flex-col items-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-full flex justify-center mb-4">
                  {isSystemSpeaking ? (
                    <motion.div 
                      className="flex items-center gap-2 text-white font-medium"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-lg">System is speaking</span>
                      <div className="relative">
                        <div className="absolute -inset-0.5 rounded-full opacity-75 bg-white animate-ping"></div>
                        <div className="relative rounded-full h-3 w-3 bg-white"></div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="flex items-center gap-2 text-white font-medium"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-lg">Your turn to speak</span>
                      {isMicActive && (
                        <div className="relative">
                          <div className="absolute -inset-0.5 rounded-full opacity-75 bg-white animate-ping"></div>
                          <div className="relative rounded-full h-3 w-3 bg-white"></div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                <AudioWaveform isActive={!isSystemSpeaking && isMicActive} />

                <div className="mt-6 flex gap-4">
                  <motion.button
                    className={`btn ${isMicActive ? 'bg-green-600' : 'bg-white bg-opacity-50'} text-white rounded-full p-4`}
                    onClick={toggleMicrophone}
                    disabled={isSystemSpeaking}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isMicActive ? <Mic size={24} /> : <MicOff size={24} />}
                  </motion.button>

                  <motion.button
                    className="btn bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-4"
                    onClick={endInterview}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={24} />
                  </motion.button>
                </div>
              </motion.div>
            </div>
          ) : null}
        </main>

        {/* Status indicator */}
        <footer className="p-4 text-center text-white text-opacity-80">
          {isSystemSpeaking ? 'Listening...' : 'Speak now'}
        </footer>
      </motion.div>
    </AnimatePresence>
  );
};

export default Interview;