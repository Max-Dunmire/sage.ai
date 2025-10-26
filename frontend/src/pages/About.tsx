import { Shield, Heart, Sparkles } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            About
            <span className="text-primary"> Sage.ai</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            We're on a mission to make communication effortless for everyone
          </p>
        </div>

        {/* Mission Section */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="bg-gradient-card rounded-2xl p-10 shadow-soft">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Mission</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              At Sage.ai, we believe that everyone deserves an intelligent assistant that handles communication 
              with professionalism and care. We're building AI-powered tools that save time, reduce stress, 
              and help you focus on what truly matters.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Whether you're a busy executive, a growing startup, or a small business owner, Sage.ai is here 
              to ensure every call is answered with intelligence, context, and a human touch.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-3xl font-bold mb-10 text-center">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Privacy First</h3>
              <p className="text-muted-foreground">
                Your data is encrypted and never shared. We believe privacy is a fundamental right, not a feature.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Human-Centered AI</h3>
              <p className="text-muted-foreground">
                We build AI that enhances human connection, not replaces it. Every interaction is designed to feel natural and respectful.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Continuous Innovation</h3>
              <p className="text-muted-foreground">
                We're constantly improving our AI to serve you better, with regular updates and new features based on your feedback.
              </p>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Meet the Team</h2>
          <div className="bg-gradient-card rounded-2xl p-10 shadow-soft mb-8">
            <div className="h-32 w-32 rounded-full bg-gradient-sage mx-auto mb-6 flex items-center justify-center">
              <Sparkles className="h-16 w-16 text-primary-foreground" />
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We're a passionate team of engineers, designers, and AI researchers dedicated to transforming 
              how people communicate. With backgrounds from leading tech companies and a shared vision for 
              responsible AI, we're building the future of intelligent communication.
            </p>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground mb-4">Want to join us or learn more?</p>
            <a
              href="/contact"
              className="inline-flex items-center text-primary hover:underline font-medium"
            >
              Get in touch →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
