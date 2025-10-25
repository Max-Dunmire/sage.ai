import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";

const Pricing = () => {
  const handleGetStarted = (plan: string) => {
    toast.success("Great choice!", {
      description: `You selected the ${plan} plan. Sign-up coming soon!`,
    });
  };

  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "per month",
      description: "Perfect for individuals and small teams",
      features: [
        "Up to 100 calls/month",
        "Basic call screening",
        "Email notifications",
        "Calendar integration",
        "7-day call history",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "$79",
      period: "per month",
      description: "For growing businesses and professionals",
      features: [
        "Unlimited calls",
        "Advanced AI screening",
        "Smart scheduling",
        "CRM integration",
        "Priority support",
        "30-day call history",
        "Custom voice settings",
      ],
      cta: "Get Started",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "Tailored for large organizations",
      features: [
        "Everything in Pro",
        "Dedicated account manager",
        "Custom integrations",
        "Advanced analytics",
        "SLA guarantee",
        "Unlimited call history",
        "White-label options",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, transparent
            <span className="text-primary"> pricing</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-gradient-card rounded-2xl p-8 shadow-soft hover:shadow-hover transition-all duration-300 animate-fade-in ${
                plan.popular ? "ring-2 ring-primary" : ""
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-sage text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-muted-foreground"> / month</span>}
                </div>
                <p className="text-sm text-muted-foreground">{plan.period}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleGetStarted(plan.name)}
                className={`w-full ${
                  plan.popular
                    ? "bg-gradient-sage hover:opacity-90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Questions?</h2>
          <p className="text-muted-foreground mb-6">
            We're here to help. Contact our team for any pricing questions or custom enterprise needs.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center text-primary hover:underline font-medium"
          >
            Contact us →
          </a>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
