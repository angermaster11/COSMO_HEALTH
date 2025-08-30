import { useState } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { VoiceMode } from "@/components/VoiceMode";
import { ModeToggle } from "@/components/ModeToggle";

const Index = () => {
  const [currentMode, setCurrentMode] = useState<'chat' | 'voice'>('chat');

  return (
    <div className="min-h-screen bg-background">
      <ModeToggle currentMode={currentMode} onModeChange={setCurrentMode} />
      
      {currentMode === 'chat' ? (
        <ChatInterface />
      ) : (
        <VoiceMode />
      )}
    </div>
  );
};

export default Index;
