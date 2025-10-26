/**
 * Cryptographic utilities for blockchain-style verification
 */

export const generateHash = async (data: string): Promise<string> => {
  // Convert string to Uint8Array
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Generate SHA-256 hash
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  
  // Convert hash to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return hashHex;
};

export const verifyHash = (data: string, expectedHash: string): Promise<boolean> => {
  return generateHash(data).then(hash => hash === expectedHash);
};
