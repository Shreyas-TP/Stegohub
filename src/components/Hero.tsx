import { Shield, Lock, Eye, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(210_100%_56%/0.15),transparent_70%)]" />
      
      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass animate-pulse-glow">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Blockchain Verified</span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Secure Data Hidden in
            <span className="block gradient-cyber bg-clip-text text-transparent">
              Plain Sight
            </span>
          </h1>

          {/* Description */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Advanced steganography meets blockchain verification. Hide confidential data 
            within images while ensuring authenticity and tamper-proof verification.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={onGetStarted}
              className="gradient-cyber shadow-glow hover:shadow-[0_0_50px_hsl(210_100%_56%/0.5)] transition-all"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-primary/50 hover:border-primary hover:bg-primary/10"
            >
              Learn More
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 pt-12">
            <div className="glass p-6 rounded-lg space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">AI Steganography</h3>
              <p className="text-sm text-muted-foreground">
                Hide data within images using intelligent algorithms that preserve visual quality
              </p>
            </div>

            <div className="glass p-6 rounded-lg space-y-3">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold">Blockchain Verified</h3>
              <p className="text-sm text-muted-foreground">
                Every encoded image is recorded on the blockchain for immutable verification
              </p>
            </div>

            <div className="glass p-6 rounded-lg space-y-3">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Eye className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold">Imperceptible</h3>
              <p className="text-sm text-muted-foreground">
                Hidden messages remain invisible to the human eye while maintaining image integrity
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
