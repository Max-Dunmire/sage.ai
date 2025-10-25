import { Phone, Calendar, MessageSquare, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

const Features = () => {
  const features = [
    {
      icon: Phone,
      title: "Real-Time Call Handling",
      description:
        "Answer calls instantly with natural, human-like conversation. Never miss an important call again.",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description:
        "Automatically coordinate meetings, manage your calendar, and send reminders without lifting a finger.",
    },
    {
      icon: MessageSquare,
      title: "Natural Conversation Understanding",
      description:
        "Advanced AI that understands context, tone, and intent to provide meaningful interactions.",
    },
    {
      icon: Shield,
      title: "Privacy-First Architecture",
      description:
        "End-to-end encryption and zero data retention. Your conversations stay completely private.",
    },
  ];

  return (
    <section id="features" className="py-32 px-6 bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Built for the
            <span className="gradient-text"> Modern Professional</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sage.ai combines cutting-edge AI with enterprise-grade security to deliver an unmatched
            experience.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-8 bg-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 border-border/50 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 shadow-soft">
                <feature.icon className="text-primary-foreground" size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
