import { useState } from "react";
import { Phone, Mic, MicOff, Volume2, VolumeX, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PersonaType = "drMarkovitz" | "kimberly" | "stacy" | null;

const Demo = () => {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [demoStarted, setDemoStarted] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>(null);

  // Transcription state - will be updated by backend
  // Backend should call setTranscription with the transcription text
  // Example: setTranscription("Caller: Hello, is this Dr. Markovitz?\nSage.ai: Yes, this is Dr. Markovitz's office. How can I help you?")
  const [transcription, setTranscription] = useState<string>("");

  const personas = [
    { id: "drMarkovitz" as const, name: "Dr. Markovitz", subtitle: "Medical Professional" },
    { id: "kimberly" as const, name: "Kimberly", subtitle: "Salon Professional" },
    { id: "stacy" as const, name: "Stacy", subtitle: "Front Desk" },
  ];

  // TODO: Backend integration
  // useEffect(() => {
  //   if (demoStarted && isListening) {
  //     // Connect to backend WebSocket or API
  //     // const socket = connectToBackend(selectedPersona);
  //     // socket.on('transcription', (text) => {
  //     //   setTranscription(prev => prev + '\n' + text);
  //     // });
  //   }
  // }, [demoStarted, isListening, selectedPersona]);

  const handlePersonaChange = (personaId: PersonaType) => {
    setSelectedPersona(personaId);
    // Reset demo when switching personas
    if (demoStarted) {
      setDemoStarted(false);
      setIsListening(false);
      setTranscription("");
    }
  };

  const startDemo = () => {
    if (!selectedPersona) {
      alert("Please select a persona to start the demo");
      return;
    }
    setDemoStarted(true);
  };

  const demoScenarios = [
    {
      caller: "Unknown Number",
      scenario: "Spam Detection",
      response: "Sage.ai automatically screens and blocks this spam caller",
      action: "Blocked",
    },
    {
      caller: "John from Acme Corp",
      scenario: "Meeting Request",
      response: "I've checked your calendar and scheduled a meeting for Tuesday at 2 PM",
      action: "Scheduled",
    },
    {
      caller: "Sarah Johnson",
      scenario: "Important Contact",
      response: "I'll connect you immediately - this is a priority contact",
      action: "Connected",
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

              {/* Selected Persona Display */}
              {demoStarted && selectedPersona && (
                <div className="text-center animate-fade-in">
                  <p className="text-sm text-muted-foreground">
                    Demo started with:{" "}
                    <span className="font-medium text-primary">
                      {personas.find(p => p.id === selectedPersona)?.name}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Interactive Demo */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="bg-gradient-card shadow-soft">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Live Demo</CardTitle>
              <CardDescription>
                Simulate incoming calls and see how Sage.ai responds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Call Interface */}
              <div className="flex justify-center items-center py-8">
                <div className="relative">
                  {/* Animated rings when listening */}
                  {isListening && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
                    </>
                  )}

                  {/* Main call button */}
                  <button
                    onClick={() => setIsListening(!isListening)}
                    className={`relative h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isListening
                        ? "bg-gradient-sage scale-110 shadow-hover"
                        : "bg-primary hover:scale-105 shadow-soft"
                    }`}
                  >
                    <Phone className={`h-10 w-10 text-primary-foreground ${isListening ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Sound Wave Animation */}
              {isListening && (
                <div className="flex justify-center items-center space-x-1 py-4">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary rounded-full animate-wave"
                      style={{
                        height: `${15 + Math.abs(3 - i) * 8}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsMuted(!isMuted)}
                  className="gap-2"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  {isMuted ? "Unmute" : "Mute"}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  Microphone
                </Button>
              </div>

              {/* Status */}
              <div className="text-center">
                <p className="text-lg font-medium">
                  {isListening ? (
                    <span className="text-primary">Sage.ai is listening...</span>
                  ) : (
                    <span className="text-muted-foreground">Click the phone to start demo</span>
                  )}
                </p>
              </div>

              {/* Live Transcription */}
              {demoStarted && (
                <div className="animate-fade-in">
                  <div className="border-t border-muted pt-6">
                    <h3 className="text-lg font-semibold mb-3 text-center">Live Transcription</h3>
                    <div className="bg-muted/30 rounded-lg p-4 min-h-[120px] max-h-[300px] overflow-y-auto">
                      {transcription ? (
                        <div className="space-y-2">
                          {transcription.split('\n').map((line, index) => (
                            <p key={index} className="text-sm leading-relaxed">
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center italic">
                          Waiting for call transcription...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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