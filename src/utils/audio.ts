/**
 * Audio Steganography Implementation
 * Methods for hiding data in audio files using LSB (Least Significant Bit) embedding
 * 
 * Fixed: Uses deterministic LSB embedding in Int16 PCM samples with header/magic
 */

// Magic header for audio steganography
const MAGIC = 'STGH'; // 0x53 0x54 0x47 0x48
const MAGIC_BYTES = 4; // 4 bytes
const LENGTH_BYTES = 4; // 4 bytes for message length (big-endian)
const HEADER_BYTES = MAGIC_BYTES + LENGTH_BYTES; // 8 bytes total

/**
 * Convert a text message to bytes with header
 */
const messageToBytes = (message: string): Uint8Array => {
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const messageLength = messageBytes.length;
  
  // Create header + payload
  const totalBytes = HEADER_BYTES + messageLength;
  const result = new Uint8Array(totalBytes);
  
  // Write MAGIC (first 4 bytes)
  for (let i = 0; i < MAGIC_BYTES; i++) {
    result[i] = MAGIC.charCodeAt(i);
  }
  
  // Write message length (4 bytes, big-endian)
  result[4] = (messageLength >>> 24) & 0xFF;
  result[5] = (messageLength >>> 16) & 0xFF;
  result[6] = (messageLength >>> 8) & 0xFF;
  result[7] = messageLength & 0xFF;
  
  // Write message payload
  for (let i = 0; i < messageLength; i++) {
    result[HEADER_BYTES + i] = messageBytes[i];
  }
  
  return result;
};

/**
 * Parse bytes back to message (extracts header)
 */
const bytesToMessage = (bytes: Uint8Array): string => {
  if (bytes.length < HEADER_BYTES) {
    throw new Error('Not enough bytes to contain header');
  }
  
  // Extract MAGIC
  const magicBytes = bytes.slice(0, MAGIC_BYTES);
  const extractedMagic = String.fromCharCode(...magicBytes);
  
  if (extractedMagic !== MAGIC) {
    throw new Error('Could not extract message from this audio. Please ensure this file contains hidden data.');
  }
  
  // Extract message length (big-endian)
  const messageLength = (bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7];
  
  // Extract message payload
  const payloadBytes = bytes.slice(HEADER_BYTES, HEADER_BYTES + messageLength);
  
  if (payloadBytes.length < messageLength) {
    throw new Error('Incomplete message data');
  }
  
  // Convert to UTF-8 string
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    return decoder.decode(payloadBytes);
  } catch (error) {
    throw new Error('Invalid UTF-8 data in decoded message');
  }
};

/**
 * Convert bytes to bits (MSB first)
 */
const bytesToBits = (bytes: Uint8Array): string => {
  let bits = '';
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i].toString(2).padStart(8, '0');
  }
  return bits;
};

/**
 * Convert bits to bytes (MSB first)
 */
const bitsToBytes = (bits: string): Uint8Array => {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    const byteBits = bits.substring(i * 8, (i + 1) * 8);
    if (byteBits.length === 8) {
      bytes[i] = parseInt(byteBits, 2);
    }
  }
  return bytes;
};

/**
 * Embed message in audio using LSB steganography
 * Embeds bits in the least significant bit of Int16 PCM samples
 */
export const encodeAudio = async (
  audioDataUrl: string,
  message: string,
  algorithm: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
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
        try {
          // Convert message to bytes with header
          const messageBytes = messageToBytes(message);
          const messageBits = bytesToBits(messageBytes);
          
          // Get audio data (use first channel)
          const channelData = audioBuffer.getChannelData(0);
          const numSamples = channelData.length;
          
          // Calculate capacity (1 bit per sample)
          const capacityBits = numSamples;
          
          if (messageBits.length > capacityBits) {
            reject(new Error(
              `Message too large for this audio file. Capacity: ${capacityBits} bits, Required: ${messageBits.length} bits`
            ));
            return;
          }
          
          // Convert Float32 samples to Int16 PCM
          const pcmSamples = new Int16Array(numSamples);
          for (let i = 0; i < numSamples; i++) {
            // Clamp and convert to Int16 range
            const clamped = Math.max(-1, Math.min(1, channelData[i]));
            pcmSamples[i] = Math.round(clamped * 0x7FFF);
          }
          
          // Embed message bits in LSB of PCM samples
          for (let bitIndex = 0; bitIndex < messageBits.length; bitIndex++) {
            const bit = parseInt(messageBits[bitIndex]);
            // Set LSB to desired bit value
            pcmSamples[bitIndex] = (pcmSamples[bitIndex] & 0xFFFE) | bit;
          }
          
          // Convert back to Float32 for AudioBuffer
          const modifiedChannelData = new Float32Array(numSamples);
          for (let i = 0; i < numSamples; i++) {
            // Convert Int16 back to Float32 (-1.0 to 1.0)
            modifiedChannelData[i] = pcmSamples[i] / 0x7FFF;
          }
          
          // Create modified audio buffer
          const modifiedBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );
          
          // Copy modified data to all channels (or just first if mono)
          for (let channel = 0; channel < modifiedBuffer.numberOfChannels; channel++) {
            const channelDataArray = modifiedBuffer.getChannelData(channel);
            if (channel === 0) {
              // First channel gets modified data
              channelDataArray.set(modifiedChannelData);
            } else {
              // Other channels get original data (or modified if stereo encoding needed)
              const originalData = audioBuffer.getChannelData(channel);
              channelDataArray.set(originalData);
            }
          }
          
          // Convert buffer to WAV
          const wavData = bufferToWav(modifiedBuffer);
          const blob = new Blob([wavData], { type: 'audio/wav' });
          
          // Convert to data URL
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            reject(new Error('Failed to read encoded audio'));
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Encoding failed'));
        }
      }, (error) => {
        reject(new Error('Failed to decode audio data: ' + error.message));
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Failed to process audio'));
    }
  });
};

/**
 * Extract message from audio using LSB steganography
 */
export const decodeAudio = async (
  audioDataUrl: string,
  algorithm: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
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
        try {
          // Get audio data (use first channel)
          const channelData = audioBuffer.getChannelData(0);
          const numSamples = channelData.length;
          
          // Convert Float32 samples to Int16 PCM
          const pcmSamples = new Int16Array(numSamples);
          for (let i = 0; i < numSamples; i++) {
            const clamped = Math.max(-1, Math.min(1, channelData[i]));
            pcmSamples[i] = Math.round(clamped * 0x7FFF);
          }
          
          // First, extract header to determine message length
          const headerBits: string[] = [];
          for (let i = 0; i < HEADER_BYTES * 8; i++) {
            const bit = pcmSamples[i] & 1;
            headerBits.push(bit.toString());
          }
          
          const headerBitsString = headerBits.join('');
          const headerBytes = bitsToBytes(headerBitsString);
          
          // Parse header to get message length
          if (headerBytes.length < HEADER_BYTES) {
            throw new Error('Could not extract message from this audio. Please ensure this file contains hidden data.');
          }
          
          // Extract MAGIC
          const magicBytes = headerBytes.slice(0, MAGIC_BYTES);
          const extractedMagic = String.fromCharCode(...magicBytes);
          
          if (extractedMagic !== MAGIC) {
            throw new Error('Could not extract message from this audio. Please ensure this file contains hidden data.');
          }
          
          // Extract message length (big-endian)
          const messageLength = (headerBytes[4] << 24) | (headerBytes[5] << 16) | (headerBytes[6] << 8) | headerBytes[7];
          
          // Calculate total bytes needed
          const totalBytes = HEADER_BYTES + messageLength;
          const totalBits = totalBytes * 8;
          
          if (totalBits > numSamples) {
            throw new Error('Extracted message length exceeds audio capacity');
          }
          
          // Extract full message (header + payload)
          const allBits: string[] = [];
          for (let i = 0; i < totalBits; i++) {
            const bit = pcmSamples[i] & 1;
            allBits.push(bit.toString());
          }
          
          const allBitsString = allBits.join('');
          const allBytes = bitsToBytes(allBitsString);
          
          // Parse message
          const decodedMessage = bytesToMessage(allBytes);
          resolve(decodedMessage);
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Decoding failed'));
        }
      }, (error) => {
        reject(new Error('Failed to decode audio data: ' + error.message));
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Failed to process audio'));
    }
  });
};

/**
 * Helper function to convert AudioBuffer to WAV format
 * Fixed: Proper Int16 PCM conversion with correct signed/unsigned handling
 */
const bufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const numOfChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  
  const arrayBuffer = new ArrayBuffer(44 + length * numOfChannels * 2);
  const view = new DataView(arrayBuffer);
  
  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // File length
  view.setUint32(4, 36 + length * numOfChannels * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // Format chunk identifier
  writeString(view, 12, 'fmt ');
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (1 = PCM)
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
  view.setUint32(40, length * numOfChannels * 2, true);
  
  // Write the PCM samples (Int16, little-endian)
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numOfChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      // Clamp between -1 and 1
      const clampedSample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer PCM
      const int16Sample = Math.round(clampedSample * 0x7FFF);
      view.setInt16(offset, int16Sample, true); // little-endian
      offset += 2;
    }
  }
  
  return arrayBuffer;
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
 * Generate a test WAV file (1 second of silence at 44.1kHz)
 */
export const generateTestWav = async (): Promise<string> => {
  const sampleRate = 44100;
  const duration = 1; // 1 second
  const numSamples = sampleRate * duration;
  const numChannels = 1; // Mono
  
  const arrayBuffer = new ArrayBuffer(44 + numSamples * numChannels * 2);
  const view = new DataView(arrayBuffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * numChannels * 2, true);
  writeString(view, 8, 'WAVE');
  
  // Format chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true); // 16-bit
  
  // Data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * numChannels * 2, true);
  
  // Write silence (all zeros) - already initialized to zero
  
  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  
  // Convert to data URL
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read test WAV'));
    };
    reader.readAsDataURL(blob);
  });
};

/**
 * Self-test function for audio steganography
 */
export const selfTestAudio = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
  console.log('=== Audio Steganography Self-Test ===');
  
  try {
    // Test 1: Generate test WAV and encode/decode "HELLO"
    console.log('\n[Test 1] Generating test WAV and encoding "HELLO"...');
    
    // Generate 1 second of silence at 44.1kHz
    const testWav = await generateTestWav();
    console.log('✓ Test WAV generated');
    
    const testMessage = 'HELLO';
    console.log(`Encoding message: "${testMessage}"...`);
    
    const encodedAudio = await encodeAudio(testWav, testMessage, 'audio_phase');
    console.log('✓ Encoding successful');
    
    console.log('Decoding...');
    const decodedMessage = await decodeAudio(encodedAudio, 'audio_phase');
    console.log(`✓ Decoding successful: "${decodedMessage}"`);
    
    if (decodedMessage !== testMessage) {
      return {
        success: false,
        error: `Message mismatch! Expected: "${testMessage}", Got: "${decodedMessage}"`
      };
    }
    console.log('✓ Message matches!');
    
    // Test 2: Longer message
    console.log('\n[Test 2] Testing longer message...');
    const longMessage = 'This is a longer test message with multiple words!';
    
    const encodedAudio2 = await encodeAudio(testWav, longMessage, 'audio_phase');
    console.log('✓ Encoding successful');
    
    const decodedMessage2 = await decodeAudio(encodedAudio2, 'audio_phase');
    console.log(`✓ Decoding successful: "${decodedMessage2}"`);
    
    if (decodedMessage2 !== longMessage) {
      return {
        success: false,
        error: `Long message mismatch! Expected: "${longMessage}", Got: "${decodedMessage2}"`
      };
    }
    console.log('✓ Long message matches!');
    
    // Test 3: Capacity check
    console.log('\n[Test 3] Testing capacity limits...');
    const tooLongMessage = 'A'.repeat(50000); // Very long message
    
    try {
      await encodeAudio(testWav, tooLongMessage, 'audio_phase');
      return {
        success: false,
        error: 'Capacity check failed - should have thrown an error'
      };
    } catch (error) {
      console.log('✓ Capacity check working correctly (error thrown as expected)');
    }
    
    // Test 4: Decode from plain audio
    console.log('\n[Test 4] Testing decode from plain audio...');
    try {
      await decodeAudio(testWav, 'audio_phase');
      return {
        success: false,
        error: 'Should have thrown error when decoding plain audio'
      };
    } catch (error) {
      console.log('✓ Error handling working correctly (error thrown as expected)');
    }
    
    console.log('\n=== All Tests Passed! ===');
    return { success: true, message: 'All tests passed successfully!' };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n=== Test Failed ===');
    console.error('Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
};
