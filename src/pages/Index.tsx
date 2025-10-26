import { useState } from "react";
import { Hero } from "@/components/Hero";
import { StegoEncoder } from "@/components/StegoEncoder";
import { StegoDecoder } from "@/components/StegoDecoder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Unlock } from "lucide-react";

const Index = () => {
  const [showApp, setShowApp] = useState(false);

  if (!showApp) {
    return <Hero onGetStarted={() => setShowApp(true)} />;
  }

  return (
    <div className="min-h-screen py-12">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(210_100%_56%/0.1),transparent_50%)] pointer-events-none" />
      
      <div className="container relative z-10 px-4">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            Steganography <span className="gradient-cyber bg-clip-text text-transparent">Workspace</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Encode secret messages into images or decode hidden data with blockchain verification
          </p>
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="encode" className="max-w-6xl mx-auto">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="encode" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Encode
            </TabsTrigger>
            <TabsTrigger value="decode" className="flex items-center gap-2">
              <Unlock className="w-4 h-4" />
              Decode
            </TabsTrigger>
          </TabsList>

          <TabsContent value="encode" className="mt-0">
            <StegoEncoder />
          </TabsContent>

          <TabsContent value="decode" className="mt-0">
            <StegoDecoder />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
