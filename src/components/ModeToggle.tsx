import { Button } from "@/components/ui/button";
import { MessageSquare, Mic } from "lucide-react";

interface ModeToggleProps {
  currentMode: 'chat' | 'voice';
  onModeChange: (mode: 'chat' | 'voice') => void;
}

export const ModeToggle = ({ currentMode, onModeChange }: ModeToggleProps) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <Button
        variant={currentMode === 'chat' ? 'default' : 'outline'}
        onClick={() => onModeChange('chat')}
        className={currentMode === 'chat' ? 'bg-gradient-primary' : ''}
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Chat
      </Button>
      <Button
        variant={currentMode === 'voice' ? 'default' : 'outline'}
        onClick={() => onModeChange('voice')}
        className={currentMode === 'voice' ? 'bg-gradient-voice' : ''}
      >
        <Mic className="w-4 h-4 mr-2" />
        Voice
      </Button>
    </div>
  );
};