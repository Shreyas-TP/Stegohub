/**
 * DWT (Discrete Wavelet Transform) Implementation
 * Used for wavelet domain steganography with best quality preservation
 */

// Haar wavelet filter coefficients
const HAAR_DECOMPOSITION = [0.7071067811865475, 0.7071067811865475];
const HAAR_RECONSTRUCTION = [0.7071067811865475, -0.7071067811865475];

/**
 * Apply 1D Haar wavelet transform to a signal
 */
const haar1D = (signal: number[]): { approximation: number[], detail: number[] } => {
  const len = signal.length;
  const halfLen = len / 2;
  
  const approximation = new Array(halfLen);
  const detail = new Array(halfLen);
  
  for (let i = 0; i < halfLen; i++) {
    const idx = i * 2;
    approximation[i] = (signal[idx] + signal[idx + 1]) / Math.sqrt(2);
    detail[i] = (signal[idx] - signal[idx + 1]) / Math.sqrt(2);
  }
  
  return { approximation, detail };
};

/**
 * Apply inverse 1D Haar wavelet transform
 */
const inverseHaar1D = (approximation: number[], detail: number[]): number[] => {
  const len = approximation.length;
  const signal = new Array(len * 2);
  
  for (let i = 0; i < len; i++) {
    const idx = i * 2;
    signal[idx] = (approximation[i] + detail[i]) / Math.sqrt(2);
    signal[idx + 1] = (approximation[i] - detail[i]) / Math.sqrt(2);
  }
  
  return signal;
};

/**
 * Apply 2D Haar wavelet transform to an image block
 */
const haar2D = (block: number[][]): {
  LL: number[][],  // Low-Low (approximation)
  LH: number[][],  // Low-High (horizontal detail)
  HL: number[][],  // High-Low (vertical detail)
  HH: number[][]   // High-High (diagonal detail)
} => {
  const size = block.length;
  const halfSize = size / 2;
  
  // Initialize subbands
  const LL = Array(halfSize).fill(0).map(() => Array(halfSize).fill(0));
  const LH = Array(halfSize).fill(0).map(() => Array(halfSize).fill(0));
  const HL = Array(halfSize).fill(0).map(() => Array(halfSize).fill(0));
  const HH = Array(halfSize).fill(0).map(() => Array(halfSize).fill(0));
  
  // Apply 1D transform to rows
  const rowsTransformed = Array(size).fill(0).map(() => Array(size).fill(0));
  
  for (let y = 0; y < size; y++) {
    const row = block[y];
    const { approximation, detail } = haar1D(row);
    
    for (let x = 0; x < halfSize; x++) {
      rowsTransformed[y][x] = approximation[x];
      rowsTransformed[y][x + halfSize] = detail[x];
    }
  }
  
  // Apply 1D transform to columns
  for (let x = 0; x < size; x++) {
    const column = rowsTransformed.map(row => row[x]);
    const { approximation, detail } = haar1D(column);
    
    for (let y = 0; y < halfSize; y++) {
      if (x < halfSize) {
        LL[y][x] = approximation[y];
        HL[y][x] = detail[y];
      } else {
        LH[y][x - halfSize] = approximation[y];
        HH[y][x - halfSize] = detail[y];
      }
    }
  }
  
  return { LL, LH, HL, HH };
};

/**
 * Apply inverse 2D Haar wavelet transform
 */
const inverseHaar2D = (
  LL: number[][],
  LH: number[][],
  HL: number[][],
  HH: number[][]
): number[][] => {
  const halfSize = LL.length;
  const size = halfSize * 2;
  
  // Initialize result
  const result = Array(size).fill(0).map(() => Array(size).fill(0));
  const intermediate = Array(size).fill(0).map(() => Array(size).fill(0));
  
  // Combine subbands
  for (let y = 0; y < halfSize; y++) {
    for (let x = 0; x < halfSize; x++) {
      intermediate[y][x] = LL[y][x];
      intermediate[y][x + halfSize] = LH[y][x];
      intermediate[y + halfSize][x] = HL[y][x];
      intermediate[y + halfSize][x + halfSize] = HH[y][x];
    }
  }
  
  // Apply inverse transform to columns
  for (let x = 0; x < size; x++) {
    const lowColumn = intermediate.slice(0, halfSize).map(row => row[x]);
    const highColumn = intermediate.slice(halfSize).map(row => row[x]);
    const column = inverseHaar1D(lowColumn, highColumn);
    
    for (let y = 0; y < size; y++) {
      result[y][x] = column[y];
    }
  }
  
  // Apply inverse transform to rows
  const finalResult = Array(size).fill(0).map(() => Array(size).fill(0));
  
  for (let y = 0; y < size; y++) {
    const lowRow = result[y].slice(0, halfSize);
    const highRow = result[y].slice(halfSize);
    const row = inverseHaar1D(lowRow, highRow);
    
    for (let x = 0; x < size; x++) {
      finalResult[y][x] = row[x];
    }
  }
  
  return finalResult;
};

/**
 * Extract blocks from image data
 */
export const extractBlocks = (imageData: ImageData, blockSize: number = 8): number[][][][] => {
  const { width, height, data } = imageData;
  const blocksX = Math.floor(width / blockSize);
  const blocksY = Math.floor(height / blockSize);
  const blocks: number[][][][] = [];
  
  // For each color channel (R,G,B)
  for (let channel = 0; channel < 3; channel++) {
    blocks[channel] = [];
    
    // Extract blocks
    for (let blockY = 0; blockY < blocksY; blockY++) {
      blocks[channel][blockY] = [];
      
      for (let blockX = 0; blockX < blocksX; blockX++) {
        const block: number[][] = Array(blockSize).fill(0).map(() => Array(blockSize).fill(0));
        
        // Extract block
        for (let y = 0; y < blockSize; y++) {
          for (let x = 0; x < blockSize; x++) {
            const pixelX = blockX * blockSize + x;
            const pixelY = blockY * blockSize + y;
            const pixelIndex = (pixelY * width + pixelX) * 4 + channel;
            block[y][x] = data[pixelIndex];
          }
        }
        
        blocks[channel][blockY][blockX] = block;
      }
    }
  }
  
  return blocks;
};

/**
 * Reconstruct image data from blocks
 */
export const reconstructImage = (blocks: number[][][][], imageData: ImageData, blockSize: number = 8): ImageData => {
  const { width, height, data } = imageData;
  const blocksX = Math.floor(width / blockSize);
  const blocksY = Math.floor(height / blockSize);
  
  // For each color channel (R,G,B)
  for (let channel = 0; channel < 3; channel++) {
    // Reconstruct blocks
    for (let blockY = 0; blockY < blocksY; blockY++) {
      for (let blockX = 0; blockX < blocksX; blockX++) {
        const block = blocks[channel][blockY][blockX];
        
        // Reconstruct block
        for (let y = 0; y < blockSize; y++) {
          for (let x = 0; x < blockSize; x++) {
            const pixelX = blockX * blockSize + x;
            const pixelY = blockY * blockSize + y;
            const pixelIndex = (pixelY * width + pixelX) * 4 + channel;
            
            // Clamp values to valid pixel range
            data[pixelIndex] = Math.max(0, Math.min(255, Math.round(block[y][x])));
          }
        }
      }
    }
  }
  
  return imageData;
};

/**
 * Embed message bits in DWT coefficients
 * Uses HH (high-high) subband for better imperceptibility
 */
export const embedInDWT = (blocks: number[][][][], message: string): number[][][][] => {
  const binaryMessage = message.split('');
  let bitIndex = 0;
  const blockSize = blocks[0][0][0].length;
  
  // Embed message bits
  outerLoop:
  for (let channel = 0; channel < blocks.length; channel++) {
    for (let blockY = 0; blockY < blocks[channel].length; blockY++) {
      for (let blockX = 0; blockX < blocks[channel][blockY].length; blockX++) {
        // Skip if we've embedded all bits
        if (bitIndex >= binaryMessage.length) break outerLoop;
        
        const block = blocks[channel][blockY][blockX];
        
        // Apply DWT to block
        const { LL, LH, HL, HH } = haar2D(block);
        
        // Embed bit in HH subband (diagonal details)
        const bit = parseInt(binaryMessage[bitIndex]);
        const targetX = 0;
        const targetY = 0;
        
        // Modify coefficient based on bit value (even/odd parity)
        const coeff = HH[targetY][targetX];
        const isEven = Math.round(coeff) % 2 === 0;
        
        if ((bit === 1 && isEven) || (bit === 0 && !isEven)) {
          // Need to change parity
          HH[targetY][targetX] = Math.round(coeff) + (isEven ? 1 : -1);
        } else {
          // Parity already matches bit
          HH[targetY][targetX] = Math.round(coeff);
        }
        
        // Apply inverse DWT
        blocks[channel][blockY][blockX] = inverseHaar2D(LL, LH, HL, HH);
        
        bitIndex++;
      }
    }
  }
  
  return blocks;
};

/**
 * Extract message bits from DWT coefficients
 */
export const extractFromDWT = (blocks: number[][][][], messageLength: number): string => {
  let binaryMessage = '';
  let bitIndex = 0;
  const blockSize = blocks[0][0][0].length;
  
  // Extract message bits
  outerLoop:
  for (let channel = 0; channel < blocks.length; channel++) {
    for (let blockY = 0; blockY < blocks[channel].length; blockY++) {
      for (let blockX = 0; blockX < blocks[channel][blockY].length; blockX++) {
        // Stop when we've extracted enough bits
        if (bitIndex >= messageLength) break outerLoop;
        
        const block = blocks[channel][blockY][blockX];
        
        // Apply DWT to block
        const { LL, LH, HL, HH } = haar2D(block);
        
        // Extract bit from HH subband
        const targetX = 0;
        const targetY = 0;
        const coeff = Math.round(HH[targetY][targetX]);
        
        // Extract bit based on coefficient parity
        binaryMessage += (coeff % 2 === 0) ? '0' : '1';
        bitIndex++;
      }
    }
  }
  
  return binaryMessage;
};

/**
 * Main function to apply DWT encoding to image data
 */
export const applyDWTEncoding = (imageData: ImageData, binaryMessage: string): ImageData => {
  // Extract blocks from image
  const blocks = extractBlocks(imageData);
  
  // Embed message in DWT coefficients
  const encodedBlocks = embedInDWT(blocks, binaryMessage);
  
  // Reconstruct image
  return reconstructImage(encodedBlocks, imageData);
};

/**
 * Extract message from DWT coefficients
 */
export const extractDWTMessage = (imageData: ImageData): string => {
  // Extract blocks from image
  const blocks = extractBlocks(imageData);
  
  // Calculate maximum possible message length
  const maxLength = blocks[0].length * blocks[0][0].length * blocks.length;
  
  // Extract message from DWT coefficients
  return extractFromDWT(blocks, maxLength);
};