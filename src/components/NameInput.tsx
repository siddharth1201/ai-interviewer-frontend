import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

interface NameInputProps {
  value: string;
  onChange: (value: string) => void;
}

const NameInput: React.FC<NameInputProps> = ({ value, onChange }) => {
  return (
    <div className="mb-6">
      <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
        Your Name
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <User className="h-5 w-5 text-slate-400" />
        </div>
        <motion.input
          type="text"
          id="name"
          className="input-field pl-10"
          placeholder="Enter your full name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          whileFocus={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
      </div>
    </div>
  );
};

export default NameInput;