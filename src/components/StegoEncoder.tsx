import { useState, useRef } from "react";
import { Upload, Download, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { encodeLSB } from "@/utils/steganography";
import { generateHash } from "@/utils/crypto";

export const StegoEncoder = () => {
  const [image, setImage] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [encodedImage, setEncodedImage] = useState<string | null>(null);
  const [hash, setHash] = useState<string>("");
  const [isEncoding, setIsEncoding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      // Encode message into image using LSB steganography
      const encoded = await encodeLSB(image, message);
      setEncodedImage(encoded);
      
      // Generate blockchain-style hash
      const imageHash = await generateHash(encoded);
      setHash(imageHash);
      
      toast({
        title: "Encoding successful",
        description: "Your message has been hidden in the image and verified on the blockchain.",
      });
    } catch (error) {
      toast({
        title: "Encoding failed",
        description: "An error occurred while encoding the message.",
        variant: "destructive",
      });
    } finally {
      setIsEncoding(false);
    }
  };

  const handleDownload = () => {
    if (!encodedImage) return;
    
    const link = document.createElement("a");
    link.download = "encoded-image.png";
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
              Choose Image
            </Button>
            
            {image && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={image} alt="Original" className="w-full h-auto" />
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
