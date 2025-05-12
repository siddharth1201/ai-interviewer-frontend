import React, { createContext, useContext, useRef, useEffect, ReactNode } from 'react';
import { useInterview } from './InterviewContext';

interface MicrophoneContextType {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

const MicrophoneContext = createContext<MicrophoneContextType | undefined>(undefined);

interface MicrophoneProviderProps {
  children: ReactNode;
}

// Add workletNode ref and fix cleanup/setup logic
export function MicrophoneProvider({ children }: MicrophoneProviderProps) {
  const { websocket, isMicActive, isInterviewActive } = useInterview();
  
  const workletNode = useRef<AudioWorkletNode | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const analyserNode = useRef<AnalyserNode | null>(null);
  const isSetup = useRef<boolean>(false);
  const micOffTimeout = useRef<number | null>(null);

  function createSilentAudioBase64() {
    const silence = new Int16Array(24000); // 1 second of silence at 24kHz
    let binary = '';
    const bytes = new Uint8Array(silence.buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  const cleanup = () => {
    try {
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach((track) => track.stop());
        mediaStream.current = null;
      }
      if (workletNode.current) {
        workletNode.current.disconnect();
        workletNode.current = null;
      }
      if (analyserNode.current) {
        analyserNode.current.disconnect();
        analyserNode.current = null;
      }
      if (audioContext.current && audioContext.current.state !== 'closed') {
        audioContext.current.close();
      }
      audioContext.current = null;
      isSetup.current = false;
    } catch (error) {
      console.error('Cleanup error:', error);
      isSetup.current = false;
      audioContext.current = null;
      mediaStream.current = null;
      workletNode.current = null;
      analyserNode.current = null;
    }
  };

  const setupAudioProcessing = async () => {
    try {

      if (isSetup.current && audioContext.current && audioContext.current.state !== 'closed') {
        if (audioContext.current.state === 'suspended') {
          await audioContext.current.resume();
        }
        return;
      }
      if (isSetup.current) {
        if (audioContext.current?.state === 'suspended') {
          await audioContext.current.resume();
        }
        return;
      }

      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (!audioContext.current || audioContext.current.state === 'closed') {
        audioContext.current = new AudioContext({ 
          sampleRate: 24000,
          latencyHint: 'interactive'
        });
      }

      await audioContext.current.audioWorklet.addModule('/audioProcessor.js');
      
      const source = audioContext.current.createMediaStreamSource(mediaStream.current);
      analyserNode.current = audioContext.current.createAnalyser();
      analyserNode.current.fftSize = 2048;
      
      workletNode.current = new AudioWorkletNode(audioContext.current, 'audio-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        processorOptions: {
          bufferSize: 2732
        }
      });

      workletNode.current.port.onmessage = (event) => {
        if (isMicActive && websocket && websocket.readyState === WebSocket.OPEN) {
          try {
            const inputData = event.data.audioData;
            const pcmData = convertFloat32ToInt16(inputData);

            function convertFloat32ToInt16(buffer: Float32Array): Int16Array {
              const l = buffer.length;
              const int16Array = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16Array[i] = Math.min(1, buffer[i]) * 0x7FFF;
              }
              return int16Array;
            }
            const base64Audio = arrayBufferToBase64(pcmData.buffer);

            function arrayBufferToBase64(buffer: ArrayBuffer): string {
              let binary = '';
              const bytes = new Uint8Array(buffer);
              const len = bytes.byteLength;
              for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              return btoa(binary);
            }
            
            console.log(`Sending audio data: ${pcmData.length} samples`);
            
            websocket.send(JSON.stringify({
              audio: base64Audio
            }));
          } catch (error) {
            console.error('Error processing audio:', error);
          }
        }
      };

      // Connect nodes
      source.connect(analyserNode.current);
      analyserNode.current.connect(workletNode.current);
      workletNode.current.connect(audioContext.current.destination);

      isSetup.current = true;
      console.log('Audio processing setup complete');

    } catch (error) {
      console.error('Error setting up audio:', error);
      cleanup();
      throw error;
    }
  };

  const startRecording = async () => {
    try {
      await setupAudioProcessing();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    cleanup();
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
      // Only close AudioContext when component unmounts
      if (audioContext.current?.state !== 'closed') {
        audioContext.current?.close();
      }
      audioContext.current = null;
    };
  }, []);

  useEffect(() => {
    if (isInterviewActive && isMicActive) {
      console.log('Starting recording...');
      startRecording();
    } else {
      console.log('Stopping recording...');
      stopRecording();
    }
  }, [isInterviewActive, isMicActive]);


useEffect(() => {
  if (
    !isMicActive &&
    isInterviewActive &&
    websocket &&
    websocket.readyState === WebSocket.OPEN
  ) {
  micOffTimeout.current = window.setTimeout(() => {
    const base64Audio = createSilentAudioBase64();
    websocket.send(JSON.stringify({
      audio: base64Audio,
      end_of_turn: true
    }));
  }, 3000); // 2 seconds
  } else if (isMicActive && micOffTimeout.current) {
    clearTimeout(micOffTimeout.current);
    micOffTimeout.current = null;
  }
  return () => {
    if (micOffTimeout.current) {
      clearTimeout(micOffTimeout.current);
      micOffTimeout.current = null;
    }
  };
}, [isMicActive, isInterviewActive, websocket]);


  // Move hook export outside component
  const value = {
    startRecording,
    stopRecording
  };

  return (
    <MicrophoneContext.Provider value={value}>
      {children}
    </MicrophoneContext.Provider>
  );
}


// Export hook separately for Fast Refresh compatibility
export const useMicrophone = () => {
  const context = useContext(MicrophoneContext);
  if (!context) {
    throw new Error('useMicrophone must be used within a MicrophoneProvider');
  }
  return context;
};