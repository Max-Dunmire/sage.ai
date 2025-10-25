import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${heroBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-32 text-center">
        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 animate-fade-in-up">
          Your Smartest
          <br />
          <span className="gradient-text">Secretary Yet.</span>
        </h1>

        {/* Subtext */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-in-up delay-200">
          Sage.ai handles your calls, messages, and scheduling — so you can focus on what matters.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-300">
          <Button variant="hero" size="xl" className="group">
            Get Early Access
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button variant="hero-outline" size="xl" className="group">
            <Play className="mr-2 group-hover:scale-110 transition-transform" size={20} />
            Try the Demo
          </Button>
        </div>

        {/* Stats or Trust Indicators */}
        <div className="mt-20 flex flex-col sm:flex-row gap-8 justify-center items-center text-sm text-muted-foreground animate-fade-in delay-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span>99.9% Uptime</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span>10K+ Active Users</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span>500K+ Calls Handled</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex justify-center p-1">
          <div className="w-1 h-3 bg-primary rounded-full animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
