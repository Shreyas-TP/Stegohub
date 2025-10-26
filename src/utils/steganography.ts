/**
 * LSB (Least Significant Bit) Steganography Implementation
 * Hides message bits in the least significant bits of image pixels
 */

const END_MARKER = "<<<END>>>";

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
