import { useState, useEffect, useRef } from "react";
import { Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import GoogleCalendar from "@/components/GoogleCalendar";

type PersonaType = "drMarkovitz" | "kimberly" | "stacy" | null;

interface TranscriptEntry {
  role: "user" | "secretary";
  message: string;
  timestamp: string;
}

const Demo = () => {
  const [demoStarted, setDemoStarted] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [error, setError] = useState<string>("");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE_URL = "http://localhost:8081";

  const personas = [
    { id: "drMarkovitz" as const, name: "Dr. Markovitz", subtitle: "Medical Professional" },
    { id: "kimberly" as const, name: "Kimberly", subtitle: "Salon Professional" },
    { id: "stacy" as const, name: "Stacy", subtitle: "Front Desk" },
  ];

  // Fetch the live transcript from the server
  const fetchTranscript = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transcript`);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setTranscript(data.transcript);
        setIsCallActive(data.isCallActive);
        setError("");
      }
    } catch (error) {
      console.error("Error fetching transcript:", error);
      setError("Failed to connect to server. Make sure it's running on http://localhost:3001");
    }
  };

  // Reset transcript for a new demo
  const resetTranscript = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transcript/reset`, {
        method: "POST",
      });

      if (response.ok) {
        setTranscript([]);
        setError("");
      }
    } catch (error) {
      console.error("Error resetting transcript:", error);
    }
  };

  // Poll for transcript updates when demo is started
  useEffect(() => {
    if (demoStarted) {
      // Fetch immediately
      fetchTranscript();

      // Then poll every 500ms for updates
      pollingIntervalRef.current = setInterval(() => {
        fetchTranscript();
      }, 500);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [demoStarted]);

  const handlePersonaChange = (personaId: PersonaType) => {
    setSelectedPersona(personaId);
    // Reset demo when switching personas
    if (demoStarted) {
      setDemoStarted(false);
      resetTranscript();
    }
  };

  const startDemo = async () => {
    if (!selectedPersona) {
      alert("Please select a persona to start the demo");
      return;
    }
    setDemoStarted(true);
    await resetTranscript();
  };

  const demoScenarios = [
    {
      caller: "Dr. Patterson's Office",
      scenario: "Appointment Scheduling",
      response: "I've checked your calendar and booked your appointment for Monday at 10 AM",
      action: "Scheduled",
    },
    {
      caller: "John from Acme Corp",
      scenario: "Meeting Rescheduling",
      response: "I found an opening on Wednesday at 3 PM and moved your meeting there",
      action: "Rescheduled",
    },
    {
      caller: "Sarah Johnson",
      scenario: "Availability Check",
      response: "You're available Thursday afternoon. I've sent your open time slots via text",
      action: "Confirmed",
    },
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Experience Sage.ai
            <span className="text-primary"> in Action</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            See how our intelligent secretary handles different call scenarios with ease
          </p>
        </div>

        {/* Persona Selection */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="bg-gradient-card shadow-soft">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Select Demo Persona</CardTitle>
              <CardDescription>
                Choose a persona to experience in the demo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Segmented Control Slider */}
              <div className="max-w-2xl mx-auto">
                <div className="relative bg-muted/50 p-2 rounded-xl">
                  {/* Sliding background indicator */}
                  <div
                    className="absolute top-2 bottom-2 bg-gradient-sage rounded-lg transition-all duration-300 ease-out"
                    style={{
                      left: selectedPersona === "drMarkovitz" ? "0.5rem" :
                            selectedPersona === "kimberly" ? "calc(33.333% + 0.166rem)" :
                            selectedPersona === "stacy" ? "calc(66.666% - 0.166rem)" : "0.5rem",
                      width: "calc(33.333% - 0.333rem)",
                      opacity: selectedPersona ? 1 : 0,
                    }}
                  />

                  {/* Persona buttons */}
                  <div className="relative grid grid-cols-3 gap-2">
                    {personas.map((persona) => (
                      <button
                        key={persona.id}
                        onClick={() => handlePersonaChange(persona.id)}
                        className={`relative flex flex-col items-center py-4 px-3 rounded-lg transition-all duration-200 ${
                          selectedPersona === persona.id
                            ? "text-primary-foreground"
                            : "text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                          selectedPersona === persona.id
                            ? "bg-white/20"
                            : "bg-primary/10"
                        }`}>
                          <User className={`h-6 w-6 ${
                            selectedPersona === persona.id
                              ? "text-primary-foreground"
                              : "text-primary"
                          }`} />
                        </div>
                        <div className="text-center">
                          <p className={`text-sm font-semibold mb-0.5 ${
                            selectedPersona === persona.id
                              ? "text-primary-foreground"
                              : ""
                          }`}>
                            {persona.name}
                          </p>
                          <p className={`text-xs ${
                            selectedPersona === persona.id
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}>
                            {persona.subtitle}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Begin Demo Button */}
              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  onClick={startDemo}
                  disabled={demoStarted}
                  className="bg-gradient-sage text-lg px-12 hover:scale-105 transition-transform"
                >
                  {demoStarted ? "Demo Active" : "Begin Demo"}
                </Button>
              </div>

              {/* Call Number Display - Shows after demo starts */}
              {demoStarted && (
                <div className="text-center animate-fade-in space-y-2">
                  <div className="bg-gradient-sage rounded-lg px-6 py-4 text-center shadow-soft inline-block">
                    <p className="text-primary-foreground font-semibold text-xl flex items-center justify-center gap-2">
                      <Phone className="h-5 w-5" />
                      Call (415) 466-8334
                    </p>
                  </div>
                  {selectedPersona && (
                    <p className="text-sm text-muted-foreground">
                      Demo started with:{" "}
                      <span className="font-medium text-primary">
                        {personas.find(p => p.id === selectedPersona)?.name}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Interactive Demo - Side by Side Layout */}
        <div className="max-w-7xl mx-auto mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Demo Section */}
            <Card className="bg-gradient-card shadow-soft">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Live Transcript</CardTitle>
                <CardDescription>
                  Real-time conversation between caller and Sage.ai
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Transcript Container */}
                <div className="bg-muted/30 rounded-lg p-6 min-h-[500px] flex flex-col">
                  {demoStarted ? (
                    <>
                      {transcript && transcript.length > 0 ? (
                        <>
                          {/* Scrolling message area */}
                          <div className="flex-1 overflow-hidden flex flex-col justify-end">
                            <div className="space-y-4">
                              {/* Show only the last 5 messages (sliding window) */}
                              {transcript.slice(-5).map((entry, index) => (
                                <div
                                  key={index}
                                  className="animate-fade-in space-y-1 border-l-2 pl-3 pb-2"
                                  style={{
                                    borderColor:
                                      entry.role === "user"
                                        ? "rgb(37, 99, 235)"
                                        : "rgb(34, 197, 94)",
                                    animationDelay: `${index * 0.05}s`,
                                  }}
                                >
                                  <p
                                    className={`text-xs font-semibold uppercase tracking-wide ${
                                      entry.role === "user"
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-green-600 dark:text-green-400"
                                    }`}
                                  >
                                    {entry.role === "user" ? "Caller" : "Sage.ai"}
                                  </p>
                                  <p className="text-sm leading-relaxed text-foreground">
                                    {entry.message}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Message counter at bottom */}
                          <div className="text-xs text-muted-foreground text-center pt-4 border-t border-muted/50 mt-4">
                            Message {Math.min(transcript.length, 5)} of {transcript.length}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <p className="text-lg text-muted-foreground italic mb-2">
                              Transcript on standby
                            </p>
                            <div className="flex justify-center gap-1 mt-4">
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                              <div
                                className="w-2 h-2 bg-primary rounded-full animate-pulse"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-primary rounded-full animate-pulse"
                                style={{ animationDelay: "0.4s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-lg text-muted-foreground">
                          Select a persona and click "Begin Demo" to start
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Google Calendar Section */}
            <div className="animate-fade-in">
              <GoogleCalendar isActive={demoStarted} />
            </div>
          </div>
        </div>

        {/* Demo Scenarios */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">
            Example Scenarios
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {demoScenarios.map((demo, index) => (
              <Card
                key={index}
                className="bg-gradient-card shadow-soft hover:shadow-hover transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg">{demo.caller}</CardTitle>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        demo.action === "Blocked"
                          ? "bg-destructive/10 text-destructive"
                          : demo.action === "Connected"
                          ? "bg-primary/10 text-primary"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {demo.action}
                    </span>
                  </div>
                  <CardDescription className="font-semibold text-foreground/80">
                    {demo.scenario}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground italic">
                    "{demo.response}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center animate-fade-in">
          <div className="max-w-2xl mx-auto bg-gradient-sage rounded-2xl p-8 shadow-soft text-primary-foreground">
            <h3 className="text-2xl font-bold mb-4">
              Ready to get started?
            </h3>
            <p className="mb-6 opacity-90">
              Experience the full power of Sage.ai with your own phone number
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 hover:scale-105 transition-transform"
              onClick={() => window.location.href = '/pricing'}
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo;