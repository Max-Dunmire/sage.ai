import { Phone, Calendar, MessageSquare, UserCheck, Database, Zap } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Phone,
      title: "Call Screening",
      description: "Intelligent AI screens every call, filtering spam and prioritizing important contacts. You'll never miss what matters.",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Sage.ai integrates with your calendar to book meetings automatically, finding optimal times without the back-and-forth.",
    },
    {
      icon: MessageSquare,
      title: "Context-Aware Conversations",
      description: "Our AI understands the context of each call, providing personalized responses based on your preferences and history.",
    },
    {
      icon: UserCheck,
      title: "Human-Tone Replies",
      description: "Natural, professional voice responses that sound authentically human — making every caller feel valued and heard.",
    },
    {
      icon: Database,
      title: "CRM Integration",
      description: "Seamlessly connects with your existing CRM tools to log calls, update contacts, and track important interactions.",
    },
    {
      icon: Zap,
      title: "Instant Notifications",
      description: "Get real-time alerts for urgent calls and automatic summaries of every conversation delivered to your inbox.",
    },
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Features that make
            <span className="text-primary"> communication effortless</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Sage.ai combines cutting-edge AI with intuitive design to give you complete control over your calls
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gradient-card rounded-2xl p-8 shadow-soft hover:shadow-hover transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="h-14 w-14 rounded-xl bg-gradient-sage flex items-center justify-center mb-6">
                <feature.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <p className="text-muted-foreground mb-4">Want to see it in action?</p>
          <a
            href="/pricing"
            className="inline-flex items-center text-primary hover:underline font-medium"
          >
            Start your free trial →
          </a>
        </div>
      </div>
    </div>
  );
};

export default Features;
