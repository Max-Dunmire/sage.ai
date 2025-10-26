import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ChatbotIcon = () => {
  const handleClick = () => {
    toast.info("Ask Sage", {
      description: "Chat feature coming soon! Our AI assistant will be available to help you shortly.",
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <Button
        onClick={handleClick}
        size="lg"
        className="h-14 w-14 rounded-full bg-gradient-sage shadow-hover hover:scale-110 transition-all duration-300"
        aria-label="Ask Sage AI Assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
      <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-accent animate-pulse" />
    </div>
  );
};

export default ChatbotIcon;
