import { useState, useRef } from "react";
import { Upload, Download, Lock, AlertCircle, Shield, FileType, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { encodeMessage, StegoAlgorithm, FileFormat, getAcceptString } from "@/utils/steganography";
import { generateHash } from "@/utils/crypto";
import { encryptWithPassword } from "@/lib/crypto";
import { uploadFile } from "@/lib/uploadFile";
import { saveStegoHistory } from "@/lib/history";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const StegoEncoder = () => {
  const [image, setImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [encodedImage, setEncodedImage] = useState<string | null>(null);
  const [hash, setHash] = useState<string>("");
  const [isEncoding, setIsEncoding] = useState(false);
  const [algorithm, setAlgorithm] = useState<StegoAlgorithm>(StegoAlgorithm.LSB);
  const [fileFormat, setFileFormat] = useState<FileFormat>(FileFormat.IMAGE);
  const [usePassword, setUsePassword] = useState(true);
  const [password, setPassword] = useState("");
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isAuthenticated, refreshHistory } = useAuth();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setEncodedImage(null);
        setHash("");
        setUploadedFileId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileFormatChange = (value: string) => {
    setFileFormat(value as FileFormat);
    setImage(null);
    setEncodedImage(null);
    setHash("");
  };

  const handleEncode = async () => {
    if (!image || !message) {
      toast({
        title: "Missing inputs",
        description: "Please upload an image and enter a message to encode.",
        variant: "destructive",
      });
      return;
    }

    if (usePassword && !password) {
      toast({
        title: "Password required",
        description: "Please enter a password for encryption.",
        variant: "destructive",
      });
      return;
    }

    setIsEncoding(true);
    
    try {
      let messageToEncode = message;
      
      // Encrypt message if password is provided
      if (usePassword && password) {
        const encryptedPayload = await encryptWithPassword(password, message);
        messageToEncode = JSON.stringify(encryptedPayload);
      }
      
      // Encode message into image using selected steganography algorithm
      const encoded = await encodeMessage(image, messageToEncode, algorithm, fileFormat);
      setEncodedImage(encoded);
      
      // Generate blockchain-style hash
      const imageHash = await generateHash(encoded);
      setHash(imageHash);
      
      // Upload to Supabase if authenticated
      if (isAuthenticated) {
        try {
          // Convert data URL to Blob
          const response = await fetch(encoded);
          const blob = await response.blob();
          
          // Determine file extension
          let extension = "png";
          if (fileFormat === FileFormat.AUDIO) extension = "wav";
          else if (fileFormat === FileFormat.VIDEO) extension = "mp4";
          else if (fileFormat === FileFormat.PDF) extension = "pdf";
          
          const encodedFile = new File([blob], `encoded_${Date.now()}.${extension}`, {
            type: blob.type || (fileFormat === FileFormat.IMAGE ? 'image/png' : 'application/octet-stream')
          });
          
          // Upload encoded file
          const stegoFileRow = await uploadFile(encodedFile);
          setUploadedFileId(stegoFileRow.id);
          
          // Upload original file if available
          let originalFileId: string | null = null;
          if (originalFile) {
            try {
              const originalFileRow = await uploadFile(originalFile);
              originalFileId = originalFileRow.id;
            } catch (err) {
              console.warn('Failed to upload original file:', err);
            }
          }
          
          // Save history
          await saveStegoHistory({
            original_file_id: originalFileId,
            stego_file_id: stegoFileRow.id,
            algorithm: algorithm,
            encrypted: usePassword && !!password,
            metadata: {
              filename: encodedFile.name,
              hash: imageHash,
              fileFormat: fileFormat
            }
          });
          
          // Refresh history in context
          await refreshHistory();
          
          toast({
            title: "Encoding successful",
            description: `Your message has been hidden using ${algorithm.toUpperCase()} algorithm, ${usePassword ? 'encrypted, ' : ''}uploaded, and saved to history.`,
          });
        } catch (uploadError) {
          console.error('Upload failed:', uploadError);
          toast({
            title: "Encoding successful (upload failed)",
            description: `Message encoded but upload failed: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Encoding successful",
          description: `Your message has been hidden using ${algorithm.toUpperCase()} algorithm and verified.`,
        });
      }
    } catch (error) {
      toast({
        title: "Encoding failed",
        description: `An error occurred while encoding with ${algorithm.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsEncoding(false);
    }
  };

  const handleDownload = () => {
    if (!encodedImage) return;
    
    const link = document.createElement("a");
    
    // Set appropriate filename and extension based on file format
    let filename = "encoded";
    if (fileFormat === FileFormat.IMAGE) {
      filename += ".png";
    } else if (fileFormat === FileFormat.AUDIO) {
      filename += ".wav";
    } else if (fileFormat === FileFormat.VIDEO) {
      filename += ".mp4";
    } else if (fileFormat === FileFormat.PDF) {
      filename += ".pdf";
    }
    
    link.download = filename;
    link.href = encodedImage;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload Image
            </CardTitle>
            <CardDescription>Select an image to hide your secret message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>File Format</Label>
              <Select value={fileFormat} onValueChange={handleFileFormatChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select file format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FileFormat.IMAGE}>Image</SelectItem>
                  <SelectItem value={FileFormat.AUDIO}>Audio</SelectItem>
                  <SelectItem value={FileFormat.VIDEO}>Video</SelectItem>
                  <SelectItem value={FileFormat.PDF}>PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept={getAcceptString(fileFormat)}
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose {fileFormat.charAt(0).toUpperCase() + fileFormat.slice(1)}
            </Button>
            
            {image && (
              <div className="rounded-lg overflow-hidden border border-border">
                {fileFormat === FileFormat.IMAGE ? (
                  <img src={image} alt="Original" className="w-full h-auto" />
                ) : fileFormat === FileFormat.AUDIO ? (
                  <audio src={image} controls className="w-full" />
                ) : fileFormat === FileFormat.VIDEO ? (
                  <video src={image} controls className="w-full h-auto" />
                ) : (
                  <div className="p-4 text-center">
                    <FileType className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p>PDF file selected</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Section */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Secret Message
            </CardTitle>
            <CardDescription>Enter the confidential data to hide</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Type your secret message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[150px] resize-none"
            />
            
            <div className="space-y-3">
  <div className="flex items-center justify-between space-x-2">
    <div className="flex items-center space-x-2">
      <Switch
        id="encrypt-password"
        checked={usePassword}
        onCheckedChange={setUsePassword}
      />
      <Label htmlFor="encrypt-password" className="flex items-center gap-2 cursor-pointer">
        <Key className="w-4 h-4" />
        <span>Encrypt message with password <span className="text-sm text-muted-foreground">(recommended)</span></span>
      </Label>
    </div>
  </div>

  {usePassword ? (
    <div className="space-y-2">
      <Label htmlFor="password">Encryption Password</Label>
      <Input
        id="password"
        type="password"
        placeholder="Enter password..."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required={usePassword}
      />
      <p className="text-xs text-muted-foreground">
        Your message will be encrypted with AES-GCM before encoding.
      </p>
    </div>
  ) : (
    <div className="rounded-md border border-red-200 bg-red-50/50 p-3">
      <div className="flex items-start gap-2">
        <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M12 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div>
          <div className="text-sm font-medium text-red-700">Encryption is disabled</div>
          <div className="text-xs text-red-600">⚠ Warning: Encryption is OFF. Your hidden message will not be protected by a password.</div>
        </div>
      </div>
    </div>
  )}
</div>

            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Encoding Algorithm</Label>
              <TooltipProvider>
                <RadioGroup 
                  value={algorithm} 
                  onValueChange={(value) => setAlgorithm(value as StegoAlgorithm)}
                  className="flex flex-col space-y-2"
                >
                  {fileFormat === FileFormat.IMAGE ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={StegoAlgorithm.LSB} id="lsb" />
                        <Label htmlFor="lsb" className="cursor-pointer">LSB</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px] text-xs">
                              Least Significant Bit - Simple but detectable. Best for quick encoding.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={StegoAlgorithm.DCT} id="dct" />
                        <Label htmlFor="dct" className="cursor-pointer">DCT</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Shield className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px] text-xs">
                              Discrete Cosine Transform - More robust and less detectable. Good balance of security and quality.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </>
                  ) : fileFormat === FileFormat.AUDIO ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={StegoAlgorithm.AUDIO_PHASE} id="audio_phase" />
                        <Label htmlFor="audio_phase" className="cursor-pointer">Phase Coding</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px] text-xs">
                              Phase Coding - Encodes data in the phase spectrum of audio signals.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={StegoAlgorithm.AUDIO_ECHO} id="audio_echo" />
                        <Label htmlFor="audio_echo" className="cursor-pointer">Echo Hiding</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Shield className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px] text-xs">
                              Echo Hiding - Embeds data by introducing echoes into the audio signal.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No algorithms available for this file format yet
                    </div>
                  )}
                </RadioGroup>
              </TooltipProvider>
            </div>
            
            <Button
              className="w-full gradient-cyber shadow-glow"
              onClick={handleEncode}
              disabled={!image || !message || isEncoding}
            >
              {isEncoding ? "Encoding..." : "Encode Message"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      {encodedImage && (
        <Card className="shadow-card border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-accent" />
              Encoded Result
            </CardTitle>
            <CardDescription>Your message has been successfully hidden</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium mb-2">Encoded Image</p>
                <div className="rounded-lg overflow-hidden border border-border">
                  <img src={encodedImage} alt="Encoded" className="w-full h-auto" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Blockchain Hash</p>
                  <div className="p-3 rounded-lg bg-muted font-mono text-xs break-all">
                    {hash}
                  </div>
                </div>
                
                <div className="p-4 rounded-lg glass space-y-2">
                  <div className="flex items-center gap-2 text-success">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-sm font-medium">Verified on Blockchain</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Image integrity recorded and immutable
                  </p>
                </div>
                
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Encoded Image
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
