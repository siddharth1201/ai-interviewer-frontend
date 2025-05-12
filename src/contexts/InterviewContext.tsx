import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Add these utility functions at the top of the file
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function createWAVHeader(
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number,
  dataLength: number
): ArrayBuffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  function writeString(view: DataView, offset: number, text: string) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  return buffer;
}

function createWAVBlob(
  pcmData: ArrayBuffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Blob {
  const wavHeader = createWAVHeader(
    sampleRate,
    numChannels,
    bitsPerSample,
    pcmData.byteLength
  );

  const wavBuffer = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
  wavBuffer.set(new Uint8Array(wavHeader), 0);
  wavBuffer.set(new Uint8Array(pcmData), wavHeader.byteLength);

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

// Add this utility function at the top
function concatenateAudioBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  buffers.forEach(buffer => {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  });
  
  return result.buffer;
}

// Add this interface at the top with other interfaces

interface InterviewState {
  candidateName: string;
  resumeFile: File | null;
  jobDescriptionFile: File | null;
  isInterviewReady: boolean;
  isInterviewActive: boolean;
  isSystemSpeaking: boolean;
  isMicActive: boolean;
  isLoading: boolean;
  websocket: WebSocket | null;
  error: string | null;
  volume: number;
  isTurnComplete: boolean;
}

interface InterviewContextType extends InterviewState {
  setCandidateName: (name: string) => void;
  setResumeFile: (file: File | null) => void;
  setJobDescriptionFile: (file: File | null) => void;
  startInterview: () => void;
  endInterview: () => void;
  toggleMicrophone: () => void;
  setVolume: (value: number) => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

interface InterviewProviderProps {
  children: ReactNode;
}

export function InterviewProvider({ children }: InterviewProviderProps) {
  const [state, setState] = useState<InterviewState>({
    candidateName: '',
    resumeFile: null,
    jobDescriptionFile: null,
    isInterviewReady: false,
    isInterviewActive: false,
    isSystemSpeaking: false,
    isMicActive: false,
    isLoading: false,
    websocket: null,
    error: null,
    volume: 1.0,
    isTurnComplete: false,
  });

  // Remove audioElement and its related refs
  const pendingBuffers = React.useRef<ArrayBuffer[]>([]);
  const audioContext = React.useRef<AudioContext | null>(null);
  const sourceNode = React.useRef<AudioBufferSourceNode | null>(null);
  const isProcessing = React.useRef(false);

  const processAudioChunk = async (newPCMData: ArrayBuffer) => {
    try {
      if (!audioContext.current) {
        audioContext.current = new AudioContext({
          sampleRate: 24000
        });
      }

      if (isProcessing.current) {
        // If already processing, just add to pending buffers
        pendingBuffers.current.push(newPCMData);
        return;
      }

      // Add new buffer to pending buffers
      pendingBuffers.current.push(newPCMData);

      // Start processing if we're not already playing
      if (!sourceNode.current) {
        isProcessing.current = true;

        // Concatenate all pending PCM buffers
        const concatenatedPCM = concatenateAudioBuffers(pendingBuffers.current);
        pendingBuffers.current = []; // Clear pending buffers

        // Create WAV blob with proper headers
        const wavBlob = createWAVBlob(
          concatenatedPCM,
          24000,
          1,
          16
        );

        try {
          const wavArrayBuffer = await wavBlob.arrayBuffer();
          const audioBuffer = await audioContext.current.decodeAudioData(wavArrayBuffer);
          
          sourceNode.current = audioContext.current.createBufferSource();
          sourceNode.current.buffer = audioBuffer;
          
          const gainNode = audioContext.current.createGain();
          gainNode.gain.value = state.volume;
          
          sourceNode.current.connect(gainNode);
          gainNode.connect(audioContext.current.destination);
          
          sourceNode.current.onended = () => {
            sourceNode.current = null;
            isProcessing.current = false;
            
            // If we have more pending buffers, process them
            if (pendingBuffers.current.length > 0) {
              processAudioChunk(new ArrayBuffer(0));
            } else {
              setState(prev => ({
                ...prev,
                isSystemSpeaking: false,
                isMicActive: true
              }));
            }
          };
          
          sourceNode.current.start();
          console.log('Started playing concatenated audio chunks');
        } catch (decodeError) {
          console.error('Failed to decode audio data:', decodeError);
          pendingBuffers.current = [];
          isProcessing.current = false;
          setState(prev => ({
            ...prev,
            error: 'Failed to decode audio data'
          }));
        }
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      isProcessing.current = false;
      setState(prev => ({
        ...prev,
        error: 'Failed to process audio data'
      }));
    }
  };

  // Single handleAudioEvent function
  const handleAudioEvent = (event: CustomEvent<{ audioData: string }>) => {
    try {
      if (!event.detail.audioData || typeof event.detail.audioData !== 'string') {
        throw new Error('Invalid audio data received');
      }

      const pcmData = base64ToArrayBuffer(event.detail.audioData);
      processAudioChunk(pcmData);

      setState(prev => ({
        ...prev,
        isSystemSpeaking: true,
        isMicActive: false
      }));

    } catch (error) {
      console.error('Error processing audio data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to process audio data'
      }));
    }
  };

  // Single useEffect for audio setup and cleanup
  useEffect(() => {
    window.addEventListener('playAudio', handleAudioEvent as EventListener);

    return () => {
      if (sourceNode.current) {
        sourceNode.current.stop();
        sourceNode.current.disconnect();
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
      pendingBuffers.current = [];
      isProcessing.current = false;
      window.removeEventListener('playAudio', handleAudioEvent as EventListener);
    };
  }, []);

  

  // Update volume effect
  useEffect(() => {
    if (audioContext.current && sourceNode.current) {
      const gainNode = audioContext.current.createGain();
      gainNode.gain.value = state.volume;
      sourceNode.current.connect(gainNode);
      gainNode.connect(audioContext.current.destination);
    }
  }, [state.volume]);

  const setCandidateName = (name: string) => {
    setState(prev => ({ ...prev, candidateName: name }));
  };

  const setResumeFile = (file: File | null) => {
    setState(prev => ({ ...prev, resumeFile: file }));
  };

  const setJobDescriptionFile = (file: File | null) => {
    setState(prev => ({ ...prev, jobDescriptionFile: file }));
  };

  const setVolume = (value: number) => {
    const clampedValue = Math.max(0, Math.min(1, value));
    setState(prev => ({ ...prev, volume: clampedValue }));
  };

  const startInterview = async () => {
    if (!state.resumeFile || !state.jobDescriptionFile || !state.candidateName) {
      setState(prev => ({ 
        ...prev, 
        error: 'Please provide your name, resume, and job description' 
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Upload resume
      const resumeFormData = new FormData();
      resumeFormData.append('file', state.resumeFile);
      const resumeResponse = await fetch('http://localhost:8000/upload/resume', {
        method: 'POST',
        body: resumeFormData,
      });
      
      if (!resumeResponse.ok) {
        throw new Error('Failed to upload resume');
      }

      // Upload job description
      const jdFormData = new FormData();
      jdFormData.append('file', state.jobDescriptionFile);
      const jdResponse = await fetch('http://localhost:8000/upload/jd', {
        method: 'POST',
        body: jdFormData,
      });
      
      if (!jdResponse.ok) {
        throw new Error('Failed to upload job description');
      }

      // Initialize WebSocket connection
      const websocketUrl = `ws://localhost:8765?name=${encodeURIComponent(state.candidateName)}&gain=${state.volume}`;
      const ws = new WebSocket(websocketUrl);

      ws.onopen = () => {
        console.log('WebSocket connection established');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received websocket message:', data);
        
        if (data.error) {
          setState(prev => ({ 
            ...prev, 
            error: data.error, 
            isLoading: false,
            isInterviewActive: false
          }));
        } else if (data.success === 'Interview prepared successfully') {
          console.log('Interview preparation successful');
          setState(prev => ({ 
            ...prev, 
            isInterviewReady: true,
            isLoading: false,
            isInterviewActive: true,
            isMicActive: true, // Start with mic active for first turn
            isTurnComplete: false,
            error: null
          }));
        } else if (data.turn_complete) {
          console.log('Server turn complete - activating microphone');
          setState(prev => ({ 
            ...prev, 
            isSystemSpeaking: false, 
            isMicActive: true,
            isTurnComplete: true
          }));
        } else if (data.audio) {
          console.log(`Received audio data of length: ${data.audio.length}`);
          // Dispatch custom event with audio data
          window.dispatchEvent(new CustomEvent('playAudio', {
            detail: { audioData: data.audio }  // This matches the base64 string from the server
          }));
          
          setState(prev => ({ 
            ...prev, 
            isSystemSpeaking: true,
            isMicActive: false,
            isTurnComplete: false
          }));
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Connection error. Please try again.', 
          isLoading: false,
          isInterviewActive: false
        }));
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setState(prev => ({ 
          ...prev, 
          isInterviewActive: false,
          websocket: null
        }));
      };

      setState(prev => ({ ...prev, websocket: ws }));
    } catch (error) {
      console.error('Error starting interview:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        isLoading: false 
      }));
    }
  };

  const endInterview = () => {
    // Stop any playing audio
    if (state.websocket) {
      state.websocket.close();
    }
    
    setState(prev => ({
      ...prev,
      isInterviewActive: false,
      isInterviewReady: false,
      isSystemSpeaking: false,
      isMicActive: false,
      websocket: null
    }));
  };

  const toggleMicrophone = () => {
    if (state.isInterviewActive && !state.isSystemSpeaking) {
      setState(prev => ({ ...prev, isMicActive: !prev.isMicActive }));
    }
  };

  const value = {
    ...state,
    setCandidateName,
    setResumeFile,
    setJobDescriptionFile,
    startInterview,
    endInterview,
    toggleMicrophone,
    setVolume,
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (context === undefined) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
}