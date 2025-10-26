import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Calendar, Shield } from "lucide-react";

const Home = () => {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="bg-gradient-hero py-20 md:py-32">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                            Your Intelligent Secretary
                            <br />
                            <span className="text-primary">for Every Call</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                            Sage.ai answers, filters, and schedules your calls professionally — so you can focus on what matters most.
                        </p>

                        {/* Sound Wave Animation */}
                        <div className="flex justify-center items-center space-x-1 py-6">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-primary rounded-full animate-wave"
                                    style={{
                                        height: `${20 + i * 8}px`,
                                        animationDelay: `${i * 0.1}s`,
                                    }}
                                />
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/pricing">
                                <Button size="lg" className="bg-gradient-sage hover:opacity-90 transition-opacity text-lg px-8">
                                    Try Sage.ai
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link to="/features">
                                <Button size="lg" variant="outline" className="text-lg px-8">
                                    Learn More
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Features */}
            <section className="py-20 bg-background">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <div className="bg-gradient-card rounded-2xl p-8 shadow-soft hover:shadow-hover transition-all duration-300">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <Phone className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Digital Secretary</h3>
                            <p className="text-muted-foreground">
                                Filters spam and prioritizes important calls automatically
                            </p>
                        </div>

                        <div className="bg-gradient-card rounded-2xl p-8 shadow-soft hover:shadow-hover transition-all duration-300">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <Calendar className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Auto Scheduling</h3>
                            <p className="text-muted-foreground">
                                Books meetings directly into your calendar seamlessly
                            </p>
                        </div>

                        <div className="bg-gradient-card rounded-2xl p-8 shadow-soft hover:shadow-hover transition-all duration-300">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
                            <p className="text-muted-foreground">
                                Your conversations are encrypted and completely secure
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-sage text-primary-foreground">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Ready to transform your communication?
                    </h2>
                    <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                        Join thousands of professionals who've made their calls smarter with Sage.ai
                    </p>
                    <Link to="/pricing">
                        <Button
                            size="lg"
                            variant="secondary"
                            className="text-lg px-8 hover:scale-105 transition-transform"
                        >
                            Get Started Today
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Home;