import React, { useEffect, useRef } from 'react';
import { useInterview } from './InterviewContext';

// This component handles direct audio playback when audio data is received
// It's an alternative approach that doesn't rely on the audio queue
const AudioPlayer: React.FC = () => {
  const { isInterviewActive, volume } = useInterview();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Create audio element on component mount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    
    // Listen for custom audio events
    const handleAudioEvent = (event: CustomEvent) => {
      if (!audioRef.current || !event.detail) return;
      
      try {
        const { audioData } = event.detail;
        
        // Convert base64 to binary
        const binaryString = atob(audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create blob and object URL
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        // Set source and play
        audioRef.current.src = url;
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url);
          // Dispatch event that audio has finished
          window.dispatchEvent(new CustomEvent('audioEnded'));
        };
        
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
          URL.revokeObjectURL(url);
        });
      } catch (error) {
        console.error('Error processing audio data:', error);
      }
    };
    
    // Add event listener
    window.addEventListener('playAudio' as any, handleAudioEvent as EventListener);
    
    return () => {
      // Clean up
      window.removeEventListener('playAudio' as any, handleAudioEvent as EventListener);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);
  
  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  
  return null; // This is a non-visual component
};

export default AudioPlayer;

// Usage in your WebSocket message handler:
/*
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.audio) {
    // Dispatch custom event with audio data
    window.dispatchEvent(new CustomEvent('playAudio', {
      detail: { audioData: data.audio }
    }));
    
    setState(prev => ({
      ...prev,
      isSystemSpeaking: true,
      isMicActive: false
    }));
  }
  
  // ... handle other message types
};
*/