import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { FileText, Upload, CheckCircle, XCircle } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept: Record<string, string[]>;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  accept, 
  onFileSelect, 
  selectedFile 
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept,
    maxFiles: 1
  });

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <motion.div
        {...getRootProps()}
        className={`cursor-pointer border-2 border-dashed rounded-lg p-6 
                   transition-colors duration-200 flex flex-col items-center justify-center
                   ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input {...getInputProps()} />
        
        {selectedFile ? (
          <div className="flex items-center w-full">
            <FileText className="text-blue-600 mr-3" size={24} />
            <div className="flex-grow">
              <p className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <motion.button
              type="button"
              onClick={handleClearFile}
              className="text-red-500 hover:text-red-700"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <XCircle size={20} />
            </motion.button>
          </div>
        ) : (
          <>
            <div className="mb-3 bg-blue-100 p-2 rounded-full">
              <Upload className="text-blue-600" size={24} />
            </div>
            <p className="text-sm text-slate-700 text-center mb-1">
              {isDragActive ? 'Drop the file here' : 'Drag and drop your file here, or click to browse'}
            </p>
            <p className="text-xs text-slate-500 text-center">
              PDF, DOC, DOCX up to 5MB
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default FileUpload;