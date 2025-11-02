/**
 * Audio Steganography Test Suite
 * 
 * Run this test in browser console:
 *   import { selfTestAudio } from './utils/audio';
 *   selfTestAudio();
 */

import { selfTestAudio } from './audio';

/**
 * Quick test function for browser console
 */
export const testAudio = async (): Promise<void> => {
  const result = await selfTestAudio();
  if (result.success) {
    console.log('✅ Test passed!', result.message);
  } else {
    console.error('❌ Test failed!', result.error);
  }
};


