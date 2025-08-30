import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const VoiceMode = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
      
      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const blob = new Blob(chunks, { type: 'audio/wav' });
        
        // Simulate speech recognition and AI response
        setTimeout(() => {
          setTranscript("Hello, how can I help you today?");
          setTimeout(() => {
            setResponse("I'm here to assist you with any questions you might have!");
            setIsProcessing(false);
          }, 1500);
        }, 1000);
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsListening(true);
      setTranscript('');
      setResponse('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent flex flex-col items-center justify-center p-8">
      {/* Voice Button */}
      <div className="relative mb-8">
        {/* Pulse rings */}
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full bg-gradient-voice opacity-30 animate-ping scale-110"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-voice opacity-20 animate-ping scale-125 animation-delay-75"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-voice opacity-10 animate-ping scale-140 animation-delay-150"></div>
          </>
        )}
        
        {/* Main button */}
        <Button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`
            relative w-32 h-32 rounded-full transition-all duration-300 transform hover:scale-105
            ${isListening 
              ? 'bg-voice-active shadow-glow' 
              : 'bg-gradient-voice shadow-voice hover:shadow-glow'
            }
            ${isProcessing ? 'animate-pulse' : ''}
          `}
        >
          {isListening ? (
            <MicOff className="w-12 h-12" />
          ) : (
            <Mic className="w-12 h-12" />
          )}
        </Button>
      </div>

      {/* Status Text */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
          Voice Mode
        </h2>
        <p className="text-lg text-muted-foreground">
          {isListening 
            ? "Listening... Tap to stop" 
            : isProcessing 
            ? "Processing..." 
            : "Tap to speak"
          }
        </p>
      </div>

      {/* Transcript and Response */}
      <div className="w-full max-w-2xl space-y-6">
        {transcript && (
          <div className="bg-card/50 backdrop-blur-lg rounded-lg p-6 border border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">You said:</h3>
            <p className="text-lg">{transcript}</p>
          </div>
        )}
        
        {response && (
          <div className="bg-gradient-primary/10 backdrop-blur-lg rounded-lg p-6 border border-primary/20">
            <h3 className="text-sm font-medium text-primary mb-2">Response:</h3>
            <p className="text-lg">{response}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!transcript && !response && (
        <div className="mt-12 text-center text-muted-foreground max-w-md">
          <p className="text-sm">
            Tap the button once to start speaking, then tap again when you're done. 
            I'll process your voice and respond back to you.
          </p>
        </div>
      )}
    </div>
  );
};