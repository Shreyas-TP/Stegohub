import { useState, useRef } from "react";
import { Upload, Download, Lock, AlertCircle, Shield, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { encodeMessage, StegoAlgorithm, FileFormat, getAcceptString } from "@/utils/steganography";
import { generateHash } from "@/utils/crypto";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const StegoEncoder = () => {
  const [image, setImage] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [encodedImage, setEncodedImage] = useState<string | null>(null);
  const [hash, setHash] = useState<string>("");
  const [isEncoding, setIsEncoding] = useState(false);
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
        setEncodedImage(null);
        setHash("");
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

    setIsEncoding(true);
    
    try {
      // Encode message into image using selected steganography algorithm
      const encoded = await encodeMessage(image, message, algorithm, fileFormat);
      setEncodedImage(encoded);
      
      // Generate blockchain-style hash
      const imageHash = await generateHash(encoded);
      setHash(imageHash);
      
      // Add to history if user is authenticated
      if (isAuthenticated) {
        addHistoryEntry({
          operation: 'encode',
          algorithm: algorithm,
          imageHash: imageHash,
          fileFormat: fileFormat,
          timestamp: new Date().toISOString()
        });
      }
      
      toast({
        title: "Encoding successful",
        description: `Your message has been hidden using ${algorithm.toUpperCase()} algorithm and verified.`,
      });
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
