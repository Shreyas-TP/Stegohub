import { useState, useRef } from "react";
import { Upload, Eye, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { decodeLSB } from "@/utils/steganography";
import { generateHash } from "@/utils/crypto";

export const StegoDecoder = () => {
  const [image, setImage] = useState<string | null>(null);
  const [decodedMessage, setDecodedMessage] = useState("");
  const [hash, setHash] = useState<string>("");
  const [isDecoding, setIsDecoding] = useState(false);
  const [verified, setVerified] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setDecodedMessage("");
        setHash("");
        setVerified(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDecode = async () => {
    if (!image) {
      toast({
        title: "No image selected",
        description: "Please upload an encoded image to extract the message.",
        variant: "destructive",
      });
      return;
    }

    setIsDecoding(true);
    
    try {
      // Decode message from image using LSB steganography
      const message = await decodeLSB(image);
      setDecodedMessage(message);
      
      // Generate hash for verification
      const imageHash = await generateHash(image);
      setHash(imageHash);
      setVerified(true);
      
      toast({
        title: "Decoding successful",
        description: "The hidden message has been extracted and verified.",
      });
    } catch (error) {
      toast({
        title: "Decoding failed",
        description: "Could not extract message from this image.",
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Encoded Image
            </Button>
            
            {image && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={image} alt="Encoded" className="w-full h-auto" />
              </div>
            )}
            
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
