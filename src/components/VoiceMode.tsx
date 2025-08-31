import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const VoiceMode = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const { toast } = useToast();

  // 🌍 Language detector based on Unicode ranges
  const detectLanguage = (text: string) => {
    if (/[\u0900-\u097F]/.test(text)) return "hi-IN"; // Hindi
    if (/[\u0900-\u097F]/.test(text) && /ऱ/.test(text)) return "mr-IN"; // Marathi (overlap with Hindi, added nuance)
    if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN"; // Kannada
    if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN"; // Tamil
    if (/[\u0B00-\u0B7F]/.test(text)) return "or-IN"; // Odia
    if (/[\u0980-\u09FF]/.test(text)) return "bn-IN"; // Bengali
    if (/[\u0A00-\u0A7F]/.test(text)) return "pa-IN"; // Punjabi
    if (/[\u0A80-\u0AFF]/.test(text)) return "gu-IN"; // Gujarati
    if (/[\u0D00-\u0D7F]/.test(text)) return "ml-IN"; // Malayalam
    if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN"; // Telugu
    if (/[\u0D80-\u0DFF]/.test(text)) return "si-LK"; // Sinhala
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return "ja-JP"; // Japanese
    if (/[\u4E00-\u9FFF]/.test(text)) return "zh-CN"; // Chinese
    if (/[\uAC00-\uD7AF]/.test(text)) return "ko-KR"; // Korean
    return "en-IN"; // default English
  };

  const startListening = async () => {
  try {
    // 🛑 Cancel any ongoing speech before starting a new session
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      setIsProcessing(true);
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      await handleTranscription(audioBlob);
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();
    setIsListening(true);
    setTranscript("");
    setResponse("");
  } catch (error) {
    toast({
      title: "Error",
      description: "Could not access microphone",
      variant: "destructive",
    });
  }
};

const stopListening = () => {
  if (mediaRecorderRef.current && isListening) {
    mediaRecorderRef.current.stop();
    setIsListening(false);
  }

  // 🛑 Stop any ongoing speech immediately
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
  }
};

const toggleListening = () => {
  if (isListening) {
    stopListening();   // 👈 stop both mic + speech
  } else {
    startListening();  // 👈 stop old speech, then listen fresh
  }
};



  const handleTranscription = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      const res = await fetch("http://localhost:5000/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Transcription failed");
      const data = await res.json();
      const text = data.text;

      setTranscript(text);
      await handleChat(text);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Transcription error",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleChat = async (message: string) => {
    try {
      const formData = new FormData();
      if (sessionId) formData.append("session_id", sessionId);
      formData.append("message", message);

      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();

      setResponse(data.response);
      setSessionId(data.session_id);

      // 🔊 Speak response with auto language detection
      const utterance = new SpeechSynthesisUtterance(data.response);
      utterance.lang = detectLanguage(data.response);
      speechSynthesis.speak(utterance);

      setIsProcessing(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Chat error",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent flex flex-col items-center justify-center p-8">
      {/* Voice Button */}
      <div className="relative mb-8">
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full bg-gradient-voice opacity-30 animate-ping scale-110"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-voice opacity-20 animate-ping scale-125 animation-delay-75"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-voice opacity-10 animate-ping scale-140 animation-delay-150"></div>
          </>
        )}
        <Button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`
            relative w-32 h-32 rounded-full transition-all duration-300 transform hover:scale-105
            ${isListening ? "bg-voice-active shadow-glow" : "bg-gradient-voice shadow-voice hover:shadow-glow"}
            ${isProcessing ? "animate-pulse" : ""}
          `}
        >
          {isListening ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
        </Button>
      </div>

      {/* Status */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">Voice Mode</h2>
        <p className="text-lg text-muted-foreground">
          {isListening ? "Listening... Tap to stop" : isProcessing ? "Processing..." : "Tap to speak"}
        </p>
      </div>

      {/* Transcript + Response */}
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

      {!transcript && !response && (
        <div className="mt-12 text-center text-muted-foreground max-w-md">
          <p className="text-sm">
            Tap the button once to start speaking, then tap again when you're done. I’ll process your
            voice and respond back to you.
          </p>
        </div>
      )}
    </div>
  );
};
