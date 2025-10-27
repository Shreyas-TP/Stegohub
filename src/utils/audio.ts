/**
 * Audio Steganography Implementation
 * Methods for hiding data in audio files with different techniques
 */

// Common constants
const END_MARKER = "<<<END>>>";
const SAMPLE_RATE = 44100;

/**
 * Convert string to binary
 */
const stringToBinary = (str: string): string => {
  let binary = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const bin = charCode.toString(2).padStart(8, "0");
    binary += bin;
  }
  return binary;
};

/**
 * Convert binary to string
 */
const binaryToString = (binary: string): string => {
  let str = "";
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.substr(i, 8);
    if (byte.length === 8) {
      const charCode = parseInt(byte, 2);
      str += String.fromCharCode(charCode);
    }
  }
  return str;
};

/**
 * Phase Coding Steganography
 * Embeds data by modifying the phase of audio segments
 */
export const encodeAudioPhase = async (audioDataUrl: string, message: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Convert data URL to ArrayBuffer
      const base64 = audioDataUrl.split(',')[1];
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decode audio data
      audioContext.decodeAudioData(bytes.buffer, (audioBuffer) => {
        // Add end marker to detect message boundaries
        const fullMessage = message + END_MARKER;
        const binaryMessage = stringToBinary(fullMessage);
        
        // Get audio data
        const channelData = audioBuffer.getChannelData(0);
        
        // Check if audio can hold the message (1 bit per 1000 samples as a conservative estimate)
        const capacity = Math.floor(channelData.length / 1000);
        if (binaryMessage.length > capacity) {
          reject(new Error("Message too large for this audio file"));
          return;
        }
        
        // Embed message in phase
        const segmentLength = 1000;
        let messageIndex = 0;
        
        for (let i = 0; i < channelData.length && messageIndex < binaryMessage.length; i += segmentLength) {
          if (messageIndex < binaryMessage.length) {
            // Modify phase based on message bit
            const bit = parseInt(binaryMessage[messageIndex]);
            const phase = bit === 1 ? 0.1 : -0.1;
            
            // Apply phase shift to segment
            for (let j = 0; j < segmentLength && (i + j) < channelData.length; j++) {
              channelData[i + j] = channelData[i + j] * Math.cos(phase);
            }
            
            messageIndex++;
          }
        }
        
        // Create modified audio buffer
        const modifiedBuffer = audioContext.createBuffer(
          audioBuffer.numberOfChannels,
          audioBuffer.length,
          audioBuffer.sampleRate
        );
        
        // Copy modified data to new buffer
        const modifiedChannelData = modifiedBuffer.getChannelData(0);
        for (let i = 0; i < channelData.length; i++) {
          modifiedChannelData[i] = channelData[i];
        }
        
        // Convert buffer to WAV
        const wavData = bufferToWav(modifiedBuffer);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        
        // Convert to data URL
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
      }, (error) => {
        reject(new Error("Failed to decode audio data: " + error.message));
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const decodeAudioPhase = async (audioDataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Convert data URL to ArrayBuffer
      const base64 = audioDataUrl.split(',')[1];
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decode audio data
      audioContext.decodeAudioData(bytes.buffer, (audioBuffer) => {
        // Get audio data
        const channelData = audioBuffer.getChannelData(0);
        
        // Extract message from phase
        const segmentLength = 1000;
        let binaryMessage = "";
        
        for (let i = 0; i < channelData.length; i += segmentLength) {
          // Calculate average phase in segment
          let phaseSum = 0;
          let count = 0;
          
          for (let j = 0; j < segmentLength && (i + j) < channelData.length; j++) {
            phaseSum += Math.atan2(0, channelData[i + j]);
            count++;
          }
          
          const avgPhase = phaseSum / count;
          binaryMessage += avgPhase > 0 ? "1" : "0";
          
          // Check if we've found the end marker
          const message = binaryToString(binaryMessage);
          const endIndex = message.indexOf(END_MARKER);
          
          if (endIndex !== -1) {
            resolve(message.substring(0, endIndex));
            return;
          }
          
          // Limit extraction to avoid excessive processing
          if (binaryMessage.length > 10000) {
            break;
          }
        }
        
        reject(new Error("No hidden message found in this audio file"));
      }, (error) => {
        reject(new Error("Failed to decode audio data: " + error.message));
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Echo Hiding Steganography
 * Embeds data by introducing subtle echoes
 */
export const encodeAudioEcho = async (audioDataUrl: string, message: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Convert data URL to ArrayBuffer
      const base64 = audioDataUrl.split(',')[1];
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decode audio data
      audioContext.decodeAudioData(bytes.buffer, (audioBuffer) => {
        // Add end marker to detect message boundaries
        const fullMessage = message + END_MARKER;
        const binaryMessage = stringToBinary(fullMessage);
        
        // Get audio data
        const channelData = audioBuffer.getChannelData(0);
        
        // Check if audio can hold the message (1 bit per 2000 samples as a conservative estimate)
        const capacity = Math.floor(channelData.length / 2000);
        if (binaryMessage.length > capacity) {
          reject(new Error("Message too large for this audio file"));
          return;
        }
        
        // Embed message using echo hiding
        const segmentLength = 2000;
        const delay0 = 5; // Delay for bit 0 (in samples)
        const delay1 = 10; // Delay for bit 1 (in samples)
        const alpha = 0.3; // Echo intensity
        
        let messageIndex = 0;
        
        for (let i = 0; i < channelData.length && messageIndex < binaryMessage.length; i += segmentLength) {
          if (messageIndex < binaryMessage.length) {
            // Choose delay based on message bit
            const bit = parseInt(binaryMessage[messageIndex]);
            const delay = bit === 1 ? delay1 : delay0;
            
            // Apply echo to segment
            for (let j = 0; j < segmentLength && (i + j + delay) < channelData.length; j++) {
              channelData[i + j + delay] += alpha * channelData[i + j];
            }
            
            messageIndex++;
          }
        }
        
        // Create modified audio buffer
        const modifiedBuffer = audioContext.createBuffer(
          audioBuffer.numberOfChannels,
          audioBuffer.length,
          audioBuffer.sampleRate
        );
        
        // Copy modified data to new buffer
        const modifiedChannelData = modifiedBuffer.getChannelData(0);
        for (let i = 0; i < channelData.length; i++) {
          modifiedChannelData[i] = channelData[i];
        }
        
        // Convert buffer to WAV
        const wavData = bufferToWav(modifiedBuffer);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        
        // Convert to data URL
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
      }, (error) => {
        reject(new Error("Failed to decode audio data: " + error.message));
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const decodeAudioEcho = async (audioDataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Convert data URL to ArrayBuffer
      const base64 = audioDataUrl.split(',')[1];
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decode audio data
      audioContext.decodeAudioData(bytes.buffer, (audioBuffer) => {
        // Get audio data
        const channelData = audioBuffer.getChannelData(0);
        
        // Extract message using cepstrum analysis
        const segmentLength = 2000;
        const delay0 = 5; // Delay for bit 0 (in samples)
        const delay1 = 10; // Delay for bit 1 (in samples)
        
        let binaryMessage = "";
        
        for (let i = 0; i < channelData.length; i += segmentLength) {
          // Extract segment
          const segment = new Float32Array(segmentLength);
          for (let j = 0; j < segmentLength && (i + j) < channelData.length; j++) {
            segment[j] = channelData[i + j];
          }
          
          // Perform autocorrelation
          const correlation0 = autocorrelate(segment, delay0);
          const correlation1 = autocorrelate(segment, delay1);
          
          // Determine bit based on correlation peaks
          binaryMessage += (correlation1 > correlation0) ? "1" : "0";
          
          // Check if we've found the end marker
          const message = binaryToString(binaryMessage);
          const endIndex = message.indexOf(END_MARKER);
          
          if (endIndex !== -1) {
            resolve(message.substring(0, endIndex));
            return;
          }
          
          // Limit extraction to avoid excessive processing
          if (binaryMessage.length > 10000) {
            break;
          }
        }
        
        reject(new Error("No hidden message found in this audio file"));
      }, (error) => {
        reject(new Error("Failed to decode audio data: " + error.message));
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Helper function to convert AudioBuffer to WAV format
 */
const bufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const numOfChannels = buffer.numberOfChannels;
  const length = buffer.length * numOfChannels * 2;
  const sampleRate = buffer.sampleRate;
  
  const wav = new ArrayBuffer(44 + length);
  const view = new DataView(wav);
  
  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // File length
  view.setUint32(4, 36 + length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // Format chunk identifier
  writeString(view, 12, 'fmt ');
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (raw)
  view.setUint16(20, 1, true);
  // Channel count
  view.setUint16(22, numOfChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numOfChannels * 2, true);
  // Block align (channel count * bytes per sample)
  view.setUint16(32, numOfChannels * 2, true);
  // Bits per sample
  view.setUint16(34, 16, true);
  // Data chunk identifier
  writeString(view, 36, 'data');
  // Data chunk length
  view.setUint32(40, length, true);
  
  // Write the PCM samples
  const offset = 44;
  let pos = 0;
  
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numOfChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      // Clamp between -1 and 1
      const clampedSample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit PCM
      const pcmSample = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7FFF;
      view.setInt16(offset + pos, pcmSample, true);
      pos += 2;
    }
  }
  
  return wav;
};

/**
 * Helper function to write a string to a DataView
 */
const writeString = (view: DataView, offset: number, string: string): void => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Helper function for autocorrelation
 */
const autocorrelate = (buffer: Float32Array, lag: number): number => {
  let sum = 0;
  
  for (let i = 0; i < buffer.length - lag; i++) {
    sum += buffer[i] * buffer[i + lag];
  }
  
  return sum;
};

// Export combined functions
export const encodeAudio = async (audioDataUrl: string, message: string, algorithm: string): Promise<string> => {
  if (algorithm === "audio_phase") {
    return encodeAudioPhase(audioDataUrl, message);
  } else if (algorithm === "audio_echo") {
    return encodeAudioEcho(audioDataUrl, message);
  } else {
    throw new Error("Unsupported audio steganography algorithm");
  }
};

export const decodeAudio = async (audioDataUrl: string, algorithm: string): Promise<string> => {
  if (algorithm === "audio_phase") {
    return decodeAudioPhase(audioDataUrl);
  } else if (algorithm === "audio_echo") {
    return decodeAudioEcho(audioDataUrl);
  } else {
    throw new Error("Unsupported audio steganography algorithm");
  }
};