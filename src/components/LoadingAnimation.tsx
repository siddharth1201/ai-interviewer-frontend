import React from 'react';
import { motion } from 'framer-motion';

interface LoadingAnimationProps {
  message?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ 
  message = 'Preparing your interview, please wait...' 
}) => {
  const containerVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const dotVariants = {
    initial: { y: 0 },
    animate: {
      y: [0, -10, 0],
      transition: {
        repeat: Infinity,
        duration: 1,
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div 
        className="flex items-center justify-center space-x-2 mb-4"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {[...Array(3)].map((_, i) => (
          <motion.div 
            key={i}
            className="w-4 h-4 bg-blue-600 rounded-full"
            variants={dotVariants}
            custom={i}
          />
        ))}
      </motion.div>
      <p className="text-slate-700 text-lg font-medium">{message}</p>
    </div>
  );
};

export default LoadingAnimation;