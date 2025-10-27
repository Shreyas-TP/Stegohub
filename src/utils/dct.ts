/**
 * DCT (Discrete Cosine Transform) Implementation
 * Used for frequency domain steganography
 */

// DCT matrix size (8x8 blocks)
const N = 8;

// DCT quality factor (higher = better quality, lower = more capacity)
const QUALITY_FACTOR = 50;

// Quantization matrix for DCT coefficients
const QUANTIZATION_MATRIX = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99
];

/**
 * Apply DCT to an 8x8 block of image data
 */
export const applyDCT = (block: number[][]): number[][] => {
  const output = Array(N).fill(0).map(() => Array(N).fill(0));
  
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      let sum = 0;
      
      for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
          sum += block[x][y] * 
                 Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N)) * 
                 Math.cos(((2 * y + 1) * v * Math.PI) / (2 * N));
        }
      }
      
      const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
      const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
      output[u][v] = (1/4) * cu * cv * sum;
    }
  }
  
  return output;
};

/**
 * Apply inverse DCT to an 8x8 block of frequency coefficients
 */
export const applyIDCT = (block: number[][]): number[][] => {
  const output = Array(N).fill(0).map(() => Array(N).fill(0));
  
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      let sum = 0;
      
      for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
          const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
          const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
          
          sum += cu * cv * block[u][v] * 
                 Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N)) * 
                 Math.cos(((2 * y + 1) * v * Math.PI) / (2 * N));
        }
      }
      
      output[x][y] = (1/4) * sum;
    }
  }
  
  return output;
};

/**
 * Quantize DCT coefficients using the quantization matrix
 */
export const quantize = (block: number[][]): number[][] => {
  const output = Array(N).fill(0).map(() => Array(N).fill(0));
  
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      const qValue = QUANTIZATION_MATRIX[u * N + v];
      output[u][v] = Math.round(block[u][v] / qValue);
    }
  }
  
  return output;
};

/**
 * Dequantize DCT coefficients using the quantization matrix
 */
export const dequantize = (block: number[][]): number[][] => {
  const output = Array(N).fill(0).map(() => Array(N).fill(0));
  
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      const qValue = QUANTIZATION_MATRIX[u * N + v];
      output[u][v] = block[u][v] * qValue;
    }
  }
  
  return output;
};

/**
 * Extract 8x8 blocks from image data
 */
export const extractBlocks = (imageData: ImageData): number[][][][] => {
  const { width, height, data } = imageData;
  const blocksX = Math.floor(width / N);
  const blocksY = Math.floor(height / N);
  const blocks: number[][][][] = [];
  
  // For each color channel (R,G,B)
  for (let channel = 0; channel < 3; channel++) {
    blocks[channel] = [];
    
    // Extract blocks
    for (let blockY = 0; blockY < blocksY; blockY++) {
      blocks[channel][blockY] = [];
      
      for (let blockX = 0; blockX < blocksX; blockX++) {
        const block: number[][] = Array(N).fill(0).map(() => Array(N).fill(0));
        
        // Extract 8x8 block
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            const pixelX = blockX * N + x;
            const pixelY = blockY * N + y;
            const pixelIndex = (pixelY * width + pixelX) * 4 + channel;
            block[y][x] = data[pixelIndex] - 128; // Center around zero
          }
        }
        
        blocks[channel][blockY][blockX] = block;
      }
    }
  }
  
  return blocks;
};

/**
 * Reconstruct image data from 8x8 blocks
 */
export const reconstructImage = (blocks: number[][][][], imageData: ImageData): ImageData => {
  const { width, height, data } = imageData;
  const blocksX = Math.floor(width / N);
  const blocksY = Math.floor(height / N);
  
  // For each color channel (R,G,B)
  for (let channel = 0; channel < 3; channel++) {
    // Reconstruct blocks
    for (let blockY = 0; blockY < blocksY; blockY++) {
      for (let blockX = 0; blockX < blocksX; blockX++) {
        const block = blocks[channel][blockY][blockX];
        
        // Reconstruct 8x8 block
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            const pixelX = blockX * N + x;
            const pixelY = blockY * N + y;
            const pixelIndex = (pixelY * width + pixelX) * 4 + channel;
            
            // Clamp values to valid pixel range
            data[pixelIndex] = Math.max(0, Math.min(255, Math.round(block[y][x] + 128)));
          }
        }
      }
    }
  }
  
  return imageData;
};

/**
 * Embed message bits in DCT coefficients
 * Uses mid-frequency coefficients for better imperceptibility
 */
export const embedInDCT = (blocks: number[][][][], message: string): number[][][][] => {
  const binaryMessage = message.split('');
  let bitIndex = 0;
  
  // Target mid-frequency coefficient position (zigzag order)
  const targetCoeff = { u: 4, v: 5 }; // Mid-frequency coefficient
  
  // Embed message bits
  outerLoop:
  for (let channel = 0; channel < blocks.length; channel++) {
    for (let blockY = 0; blockY < blocks[channel].length; blockY++) {
      for (let blockX = 0; blockX < blocks[channel][blockY].length; blockX++) {
        // Skip if we've embedded all bits
        if (bitIndex >= binaryMessage.length) break outerLoop;
        
        const block = blocks[channel][blockY][blockX];
        const bit = parseInt(binaryMessage[bitIndex]);
        
        // Modify coefficient based on bit value (even/odd parity)
        const coeff = block[targetCoeff.u][targetCoeff.v];
        const isEven = Math.round(coeff) % 2 === 0;
        
        if ((bit === 1 && isEven) || (bit === 0 && !isEven)) {
          // Need to change parity
          block[targetCoeff.u][targetCoeff.v] = Math.round(coeff) + (isEven ? 1 : -1);
        } else {
          // Parity already matches bit
          block[targetCoeff.u][targetCoeff.v] = Math.round(coeff);
        }
        
        bitIndex++;
      }
    }
  }
  
  return blocks;
};

/**
 * Extract message bits from DCT coefficients
 */
export const extractFromDCT = (blocks: number[][][][], messageLength: number): string => {
  let binaryMessage = '';
  let bitIndex = 0;
  
  // Target mid-frequency coefficient position (same as embedding)
  const targetCoeff = { u: 4, v: 5 };
  
  // Extract message bits
  outerLoop:
  for (let channel = 0; channel < blocks.length; channel++) {
    for (let blockY = 0; blockY < blocks[channel].length; blockY++) {
      for (let blockX = 0; blockX < blocks[channel][blockY].length; blockX++) {
        // Stop when we've extracted enough bits
        if (bitIndex >= messageLength) break outerLoop;
        
        const block = blocks[channel][blockY][blockX];
        const coeff = Math.round(block[targetCoeff.u][targetCoeff.v]);
        
        // Extract bit based on coefficient parity
        binaryMessage += (coeff % 2 === 0) ? '0' : '1';
        bitIndex++;
      }
    }
  }
  
  return binaryMessage;
};

/**
 * Main function to apply DCT encoding to image data
 */
export const applyDCTEncoding = (imageData: ImageData, binaryMessage: string): ImageData => {
  // Extract blocks from image
  const blocks = extractBlocks(imageData);
  
  // Apply DCT to each block
  const dctBlocks = blocks.map(channel => 
    channel.map(row => 
      row.map(block => quantize(applyDCT(block)))
    )
  );
  
  // Embed message in DCT coefficients
  const encodedBlocks = embedInDCT(dctBlocks, binaryMessage);
  
  // Apply inverse DCT to each block
  const idctBlocks = encodedBlocks.map(channel => 
    channel.map(row => 
      row.map(block => applyIDCT(dequantize(block)))
    )
  );
  
  // Reconstruct image
  return reconstructImage(idctBlocks, imageData);
};

/**
 * Extract message from DCT coefficients
 */
export const extractDCTMessage = (imageData: ImageData): string => {
  // Extract blocks from image
  const blocks = extractBlocks(imageData);
  
  // Apply DCT to each block
  const dctBlocks = blocks.map(channel => 
    channel.map(row => 
      row.map(block => quantize(applyDCT(block)))
    )
  );
  
  // Calculate maximum possible message length
  const maxLength = blocks[0].length * blocks[0][0].length * blocks.length;
  
  // Extract message from DCT coefficients
  return extractFromDCT(dctBlocks, maxLength);
};