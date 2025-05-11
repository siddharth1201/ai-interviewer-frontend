import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Headphones } from 'lucide-react';

import { useInterview } from '../contexts/InterviewContext';
import FileUpload from '../components/FileUpload';
import NameInput from '../components/NameInput';
import LoadingAnimation from '../components/LoadingAnimation';

const Onboarding = () => {
  const navigate = useNavigate();
  const { 
    candidateName, 
    resumeFile, 
    jobDescriptionFile, 
    isLoading,
    error,
    setCandidateName, 
    setResumeFile, 
    setJobDescriptionFile,
    startInterview
  } = useInterview();

  const handleStartInterview = async () => {
    await startInterview();
    navigate('/interview');
  };

  const isFormComplete = candidateName.trim() !== '' && resumeFile !== null && jobDescriptionFile !== null;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <Headphones className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <motion.h1 
          className="text-2xl md:text-3xl font-bold text-center text-slate-800 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Interview Preparation
        </motion.h1>
        
        <motion.p 
          className="text-slate-600 text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Upload your resume and job description to start a simulated interview
        </motion.p>

        {error && (
          <motion.div 
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.div>
        )}

        {isLoading ? (
          <div className="py-16">
            <LoadingAnimation />
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleStartInterview(); }}>
            <NameInput 
              value={candidateName} 
              onChange={setCandidateName} 
            />
            
            <FileUpload 
              label="Upload your resume" 
              accept={{
                'application/pdf': ['.pdf'],
                'application/msword': ['.doc'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
              }}
              onFileSelect={setResumeFile}
              selectedFile={resumeFile}
            />
            
            <FileUpload 
              label="Upload job description" 
              accept={{
                'application/pdf': ['.pdf'],
                'application/msword': ['.doc'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'text/plain': ['.txt']
              }}
              onFileSelect={setJobDescriptionFile}
              selectedFile={jobDescriptionFile}
            />
            
            <motion.button
              type="submit"
              className={`btn w-full ${isFormComplete ? 'btn-primary' : 'bg-blue-400 cursor-not-allowed'}`}
              disabled={!isFormComplete}
              whileHover={isFormComplete ? { scale: 1.02 } : {}}
              whileTap={isFormComplete ? { scale: 0.98 } : {}}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              Start Interview
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default Onboarding;