/**
 * Steganography Implementation
 * Multiple algorithms for hiding data in images with different security/quality tradeoffs
 */

// Common constants
const END_MARKER = "<<<END>>>";

// Import DCT and DWT implementations
import { applyDCTEncoding, extractDCTMessage } from "./dct";
import { applyDWTEncoding, extractDWTMessage } from "./dwt";
import { encodeAudio, decodeAudio } from "./audio";

// Algorithm types
export enum StegoAlgorithm {
  LSB = "lsb",
  DCT = "dct",
  DWT = "dwt",
  AUDIO_PHASE = "audio_phase",
  AUDIO_ECHO = "audio_echo"
}

// File format types
export enum FileFormat {
  IMAGE = "image",
  AUDIO = "audio",
  VIDEO = "video",
  PDF = "pdf"
}

// File format extensions
export const FileExtensions = {
  [FileFormat.IMAGE]: ["jpg", "jpeg", "png", "gif", "bmp", "webp"],
  [FileFormat.AUDIO]: ["mp3", "wav", "ogg", "flac"],
  [FileFormat.VIDEO]: ["mp4", "webm", "ogg"],
  [FileFormat.PDF]: ["pdf"]
};

// Get accept string for file input
export const getAcceptString = (format: FileFormat): string => {
  switch (format) {
    case FileFormat.IMAGE:
      return "image/*";
    case FileFormat.AUDIO:
      return "audio/*";
    case FileFormat.VIDEO:
      return "video/*";
    case FileFormat.PDF:
      return "application/pdf";
    default:
      return "image/*";
  }
};

/**
 * LSB (Least Significant Bit) Steganography
 * Simple but detectable algorithm that modifies the least significant bit of pixel values
 */
export const encodeLSB = async (imageDataUrl: string, message: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Add end marker to detect message boundaries
        const fullMessage = message + END_MARKER;
        const binaryMessage = stringToBinary(fullMessage);

        // Check if image can hold the message
        if (binaryMessage.length > data.length) {
          reject(new Error("Message too large for this image"));
          return;
        }

        // Encode message into LSB of pixel values
        let messageIndex = 0;
        for (let i = 0; i < data.length && messageIndex < binaryMessage.length; i++) {
          // Skip alpha channel (every 4th byte)
          if (i % 4 === 3) continue;
          
          // Replace LSB with message bit
          data[i] = (data[i] & 0xFE) | parseInt(binaryMessage[messageIndex]);
          messageIndex++;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
};

export const decodeLSB = async (imageDataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let binaryMessage = "";
        
        // Extract LSB from each pixel
        for (let i = 0; i < data.length; i++) {
          // Skip alpha channel
          if (i % 4 === 3) continue;
          
          binaryMessage += (data[i] & 1).toString();
        }

        const message = binaryToString(binaryMessage);
        
        // Check for end marker
        const endIndex = message.indexOf(END_MARKER);
        if (endIndex === -1) {
          reject(new Error("No hidden message found in this image"));
          return;
        }

        resolve(message.substring(0, endIndex));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
};

/**
 * DCT (Discrete Cosine Transform) Steganography
 * More robust algorithm that embeds data in frequency domain
 * Less detectable than LSB but preserves good image quality
 */
export const encodeDCT = async (imageDataUrl: string, message: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Add end marker to detect message boundaries
        const fullMessage = message + END_MARKER;
        const binaryMessage = stringToBinary(fullMessage);
        
        // Process image in 8x8 blocks (DCT works on blocks)
        const width = imageData.width;
        const height = imageData.height;
        
        // Check capacity (conservative estimate: 1 bit per 8x8 block)
        const blockCount = Math.floor(width / 8) * Math.floor(height / 8);
        if (binaryMessage.length > blockCount) {
          reject(new Error("Message too large for this image using DCT algorithm"));
          return;
        }
        
        // Apply DCT encoding
        const encodedData = applyDCTEncoding(imageData, binaryMessage);
        ctx.putImageData(encodedData, 0, 0);
        
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
};

export const decodeDCT = async (imageDataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Extract binary message from DCT coefficients
        const binaryMessage = extractDCTMessage(imageData);
        const message = binaryToString(binaryMessage);
        
        // Check for end marker
        const endIndex = message.indexOf(END_MARKER);
        if (endIndex === -1) {
          reject(new Error("No hidden message found in this image"));
          return;
        }

        resolve(message.substring(0, endIndex));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
};

/**
 * DWT (Discrete Wavelet Transform) Steganography
 * Best quality preservation algorithm that embeds data in wavelet coefficients
 * Most robust against image processing operations
 */
export const encodeDWT = async (imageDataUrl: string, message: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Add end marker to detect message boundaries
        const fullMessage = message + END_MARKER;
        const binaryMessage = stringToBinary(fullMessage);
        
        // Check capacity (conservative estimate)
        const capacity = Math.floor((imageData.width * imageData.height) / 16);
        if (binaryMessage.length > capacity) {
          reject(new Error("Message too large for this image using DWT algorithm"));
          return;
        }
        
        // Apply DWT encoding
        const encodedData = applyDWTEncoding(imageData, binaryMessage);
        ctx.putImageData(encodedData, 0, 0);
        
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
};

export const decodeDWT = async (imageDataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Extract binary message from DWT coefficients
        const binaryMessage = extractDWTMessage(imageData);
        const message = binaryToString(binaryMessage);
        
        // Check for end marker
        const endIndex = message.indexOf(END_MARKER);
        if (endIndex === -1) {
          reject(new Error("No hidden message found in this image"));
          return;
        }

        resolve(message.substring(0, endIndex));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
};

// Unified encode/decode functions that use the specified algorithm
export const encodeMessage = async (
  fileDataUrl: string, 
  message: string, 
  algorithm: StegoAlgorithm = StegoAlgorithm.LSB,
  fileFormat: FileFormat = FileFormat.IMAGE
): Promise<string> => {
  // Handle different file formats
  switch (fileFormat) {
    case FileFormat.IMAGE:
      // For images, use the appropriate image algorithm
      switch (algorithm) {
        case StegoAlgorithm.DCT:
          return encodeDCT(fileDataUrl, message);
        case StegoAlgorithm.DWT:
          return encodeDWT(fileDataUrl, message);
        case StegoAlgorithm.LSB:
        default:
          return encodeLSB(fileDataUrl, message);
      }
    
    case FileFormat.AUDIO:
      // For audio, use audio-specific algorithms
      if (algorithm === StegoAlgorithm.AUDIO_PHASE || algorithm === StegoAlgorithm.AUDIO_ECHO) {
        return await encodeAudio(fileDataUrl, message, algorithm);
      } else {
        throw new Error(`Unsupported algorithm ${algorithm} for audio files`);
      }
    
    case FileFormat.VIDEO:
      // For video, extract frames and use image algorithms (simplified implementation)
      throw new Error("Video steganography not yet implemented");
    
    case FileFormat.PDF:
      // For PDF, implement PDF-specific methods (simplified implementation)
      throw new Error("PDF steganography not yet implemented");
    
    default:
      throw new Error(`Unsupported file format: ${fileFormat}`);
  }
};

export const decodeMessage = async (
  fileDataUrl: string, 
  algorithm?: StegoAlgorithm,
  fileFormat: FileFormat = FileFormat.IMAGE
): Promise<string> => {
  // Handle different file formats
  switch (fileFormat) {
    case FileFormat.IMAGE:
      // If algorithm is specified, use it directly
      if (algorithm) {
        switch (algorithm) {
          case StegoAlgorithm.DCT:
            return decodeDCT(fileDataUrl);
          case StegoAlgorithm.DWT:
            return decodeDWT(fileDataUrl);
          case StegoAlgorithm.LSB:
            return decodeLSB(fileDataUrl);
        }
      }
      
      // Auto-detection: try all algorithms in sequence
      try {
        return await decodeLSB(fileDataUrl);
      } catch (error) {
        try {
          return await decodeDCT(fileDataUrl);
        } catch (error) {
          try {
            return await decodeDWT(fileDataUrl);
          } catch (error) {
            throw new Error("Could not detect encoding algorithm. No hidden message found.");
          }
        }
      }
    
    case FileFormat.AUDIO:
      // For audio, use audio-specific algorithms
      if (algorithm === StegoAlgorithm.AUDIO_PHASE || algorithm === StegoAlgorithm.AUDIO_ECHO) {
        return await decodeAudio(fileDataUrl, algorithm);
      } else if (!algorithm) {
        // Try both audio algorithms
        try {
          return await decodeAudio(fileDataUrl, StegoAlgorithm.AUDIO_PHASE);
        } catch (error) {
          try {
            return await decodeAudio(fileDataUrl, StegoAlgorithm.AUDIO_ECHO);
          } catch (error) {
            throw new Error("Could not detect encoding algorithm. No hidden message found.");
          }
        }
      } else {
        throw new Error(`Unsupported algorithm ${algorithm} for audio files`);
      }
    
    case FileFormat.VIDEO:
      throw new Error("Video steganography not yet implemented");
    
    case FileFormat.PDF:
      throw new Error("PDF steganography not yet implemented");
    
    default:
      throw new Error(`Unsupported file format: ${fileFormat}`);
  }
};

// Helper functions
const stringToBinary = (str: string): string => {
  return str
    .split("")
    .map(char => {
      return char.charCodeAt(0).toString(2).padStart(8, "0");
    })
    .join("");
};

const binaryToString = (binary: string): string => {
  const bytes = binary.match(/.{1,8}/g) || [];
  return bytes
    .map(byte => String.fromCharCode(parseInt(byte, 2)))
    .join("");
};
