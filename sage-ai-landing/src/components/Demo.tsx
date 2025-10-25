import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import demoMockup from "@/assets/demo-mockup.png";

const Demo = () => {
  return (
    <section id="demo" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="animate-slide-in-left">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              See Sage.ai
              <br />
              <span className="gradient-text">in Action</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Watch how Sage.ai seamlessly handles real phone calls, schedules appointments, and
              manages your daily communications with natural, human-like intelligence.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                "Answers calls with perfect voice clarity",
                "Understands complex scheduling requests",
                "Integrates with your existing calendar",
                "Learns your preferences over time",
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <Button variant="hero" size="lg" className="group">
              <Play className="mr-2 group-hover:scale-110 transition-transform" size={20} />
              Watch Demo Video
            </Button>
          </div>

          {/* Right: Demo Mockup */}
          <div className="relative animate-slide-in-right">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl"></div>
              {/* Mockup Image */}
              <img
                src={demoMockup}
                alt="Sage.ai phone call interface"
                className="relative z-10 w-full max-w-md mx-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Demo;
