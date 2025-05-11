import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AudioWaveformProps {
  isActive: boolean;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let mediaStream: MediaStream | null = null;

    const setupAudio = async () => {
      if (!isActive) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        return;
      }

      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        source.connect(analyser);
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        
        renderFrame();
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };

    const renderFrame = () => {
      if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;
      
      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;
      
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      
      const width = canvas.width;
      const height = canvas.height;
      
      analyser.getByteFrequencyData(dataArray);
      
      canvasCtx.clearRect(0, 0, width, height);
      
      const barWidth = (width / dataArray.length) * 2.5;
      let x = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        
        const r = 16; // green
        const g = 185;
        const b = 129;
        
        canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
      
      animationRef.current = requestAnimationFrame(renderFrame);
    };

    setupAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [isActive]);

  return (
    <motion.div 
      className="w-full h-24 rounded-lg overflow-hidden bg-slate-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0.5 }}
      transition={{ duration: 0.3 }}
    >
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={100}
        className="w-full h-full"
      />
    </motion.div>
  );
};

export default AudioWaveform;