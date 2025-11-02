import { useState, useRef } from "react";
import { Upload, Eye, Lock, CheckCircle2, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { decodeMessage, StegoAlgorithm, FileFormat, getAcceptString } from "@/utils/steganography";
import { generateHash } from "@/utils/crypto";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const StegoDecoder = () => {
  const [image, setImage] = useState<string | null>(null);
  const [decodedMessage, setDecodedMessage] = useState("");
  const [hash, setHash] = useState<string>("");
  const [isDecoding, setIsDecoding] = useState(false);
  const [verified, setVerified] = useState(false);
  const [algorithm, setAlgorithm] = useState<StegoAlgorithm>(StegoAlgorithm.LSB);
  const [fileFormat, setFileFormat] = useState<FileFormat>(FileFormat.IMAGE);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isAuthenticated, addHistoryEntry } = useAuth();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setDecodedMessage("");
        setHash("");
        setVerified(false);
        
        // Auto-detect algorithm based on file type for audio files
        if (fileFormat === FileFormat.AUDIO) {
          const fileType = file.type.toLowerCase();
          if (fileType.includes('audio')) {
            // Default to AUDIO_PHASE for audio files
            setAlgorithm(StegoAlgorithm.AUDIO_PHASE);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileFormatChange = (value: string) => {
    setFileFormat(value as FileFormat);
    setImage(null);
    setDecodedMessage("");
    setHash("");
    setVerified(false);
  };

  const handleDecode = async () => {
    if (!image) {
      toast({
        title: "Missing input",
        description: "Please select an encoded file",
        variant: "destructive",
      });
      return;
    }

    setIsDecoding(true);
    
    try {
      // For audio files, try both algorithms if the first one fails
      let message;
      if (fileFormat === FileFormat.AUDIO) {
        try {
          // First try with the selected algorithm
          message = await decodeMessage(image, algorithm, fileFormat);
        } catch (error) {
          // If the first algorithm fails, try the other audio algorithm
          const alternativeAlgorithm = algorithm === StegoAlgorithm.AUDIO_PHASE ? 
            StegoAlgorithm.AUDIO_ECHO : StegoAlgorithm.AUDIO_PHASE;
          
          message = await decodeMessage(image, alternativeAlgorithm, fileFormat);
          // Update the algorithm state to show which one worked
          setAlgorithm(alternativeAlgorithm);
        }
      } else {
        // For non-audio files, use the standard approach
        message = await decodeMessage(image, algorithm, fileFormat);
      }
      
      setDecodedMessage(message);
      
      // Generate hash for verification
      const imageHash = await generateHash(image);
      setHash(imageHash);
      setVerified(true);
      
      // Add to history if user is authenticated
      if (isAuthenticated) {
        addHistoryEntry({
          operation: 'decode',
          algorithm: algorithm,
          timestamp: new Date().toISOString(),
          imageHash: imageHash,
          fileFormat: fileFormat
        });
      }
      
      toast({
        title: "Decoding successful",
        description: `The hidden message has been extracted using ${algorithm.toUpperCase()} algorithm and verified.`,
      });
    } catch (error) {
      toast({
        title: "Decoding failed",
        description: `Could not extract message from this ${fileFormat}. Please ensure this file contains hidden data.`,
        variant: "destructive",
      });
    } finally {
      setIsDecoding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload Encoded Image
            </CardTitle>
            <CardDescription>Select an image containing hidden data</CardDescription>
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
                  <img src={image} alt="Encoded" className="w-full h-auto" />
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
            
            <div className="space-y-3">
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
                        <Label htmlFor="lsb" className="cursor-pointer">LSB Algorithm</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-xs cursor-help">?</div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-card border border-border shadow-lg">
                            <p className="w-[200px] text-xs">
                              Least Significant Bit - Simple but detectable. Best for quick encoding/decoding.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={StegoAlgorithm.DCT} id="dct" />
                        <Label htmlFor="dct" className="cursor-pointer">DCT Algorithm</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-xs cursor-help">?</div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-card border border-border shadow-lg">
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
                        <RadioGroupItem value={StegoAlgorithm.AUDIO_PHASE} id="audio-phase" />
                        <Label htmlFor="audio-phase" className="cursor-pointer">Phase Coding</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-xs cursor-help">?</div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-card border border-border shadow-lg">
                            <p className="w-[200px] text-xs">
                              Phase Coding - Encodes data in the phase of audio signals. Good for preserving audio quality.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={StegoAlgorithm.AUDIO_ECHO} id="audio-echo" />
                        <Label htmlFor="audio-echo" className="cursor-pointer">Echo Hiding</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-xs cursor-help">?</div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-card border border-border shadow-lg">
                            <p className="w-[200px] text-xs">
                              Echo Hiding - Uses echoes to encode information. More robust against audio processing.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                      No specialized algorithms available for this file format yet.
                      Using generic data embedding techniques.
                    </div>
                  )}
                </RadioGroup>
              </TooltipProvider>
            </div>
            
            <Button
              className="w-full gradient-cyber shadow-glow"
              onClick={handleDecode}
              disabled={!image || isDecoding}
            >
              {isDecoding ? "Decoding..." : "Extract Message"}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Extracted Message
            </CardTitle>
            <CardDescription>The hidden secret data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {decodedMessage ? (
              <>
                <div className="p-4 rounded-lg bg-muted min-h-[150px] font-mono text-sm whitespace-pre-wrap">
                  {decodedMessage}
                </div>
                
                {verified && (
                  <div className="p-4 rounded-lg glass space-y-2">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Blockchain Verified</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Image integrity confirmed and authenticated
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6">
                <Lock className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Upload an encoded image and click "Extract Message" to reveal hidden data
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hash Verification */}
      {hash && (
        <Card className="shadow-card border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              Blockchain Verification
            </CardTitle>
            <CardDescription>Cryptographic hash for tamper detection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-3 rounded-lg bg-muted font-mono text-xs break-all">
              {hash}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
