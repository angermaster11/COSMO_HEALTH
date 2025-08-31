import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Mic, Image as ImageIcon, Plus, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  content: string;
  type: "text" | "image" | "voice";
  sender: "user" | "bot";
  timestamp: Date;
  fileUrl?: string;
}

interface Session {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
}

export const ChatInterface = () => {
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: "1",
      name: "New Chat",
      messages: [],
      createdAt: new Date(),
    },
  ]);
  const [activeSession, setActiveSession] = useState("1");
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSession]);

  // Add user + bot messages
  const addMessage = (
    content: string,
    type: "text" | "image" | "voice",
    sender: "user" | "bot",
    fileUrl?: string
  ) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      type,
      sender,
      timestamp: new Date(),
      fileUrl,
    };

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession
          ? { ...session, messages: [...session.messages, newMessage] }
          : session
      )
    );
  };

  // Send text message
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const sessionId = activeSession;
    const userText = inputMessage.trim();

    addMessage(userText, "text", "user");
    setInputMessage("");

    try {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("message", userText);

      const res = await fetch("https://healthcare-m3c6.onrender.com/api/chat", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        addMessage(data.response, "text", "bot");
      } else {
        toast({
          title: "Error",
          description: data.detail || "Chat failed",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to connect to chatbot",
        variant: "destructive",
      });
    }
  };

  // Upload Image
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const sessionId = activeSession;
    const url = URL.createObjectURL(file);
    addMessage("Image uploaded", "image", "user", url);

    try {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("file", file);

      const res = await fetch("https://healthcare-m3c6.onrender.com/api/chat", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        addMessage(data.response, "text", "bot");
      } else {
        toast({
          title: "Error",
          description: data.detail || "Image processing failed",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not send image",
        variant: "destructive",
      });
    }
  };

  // Record + Transcribe Voice
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        addMessage("Voice message", "voice", "user", url);

        // send to /transcribe
        const formData = new FormData();
        formData.append("file", new File([blob], "voice.webm"));

        try {
          const res = await fetch("https://healthcare-m3c6.onrender.com/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (res.ok && data.text) {
            // Now send transcription to /chat
            addMessage(data.text, "text", "user");

            const chatData = new FormData();
            chatData.append("session_id", activeSession);
            chatData.append("message", data.text);

            const chatRes = await fetch("https://healthcare-m3c6.onrender.com/api/chat", {
              method: "POST",
              body: chatData,
            });
            const chatResp = await chatRes.json();

            if (chatRes.ok) {
              addMessage(chatResp.response, "text", "bot");
            }
          } else {
            toast({
              title: "Error",
              description: "Transcription failed",
              variant: "destructive",
            });
          }
        } catch {
          toast({
            title: "Error",
            description: "Voice upload failed",
            variant: "destructive",
          });
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // New session
  const createNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      name: `Chat ${sessions.length + 1}`,
      messages: [],
      createdAt: new Date(),
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSession(newSession.id);
  };

  const currentSession = sessions.find((s) => s.id === activeSession);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <Button onClick={createNewSession} className="w-full bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`mb-2 p-3 cursor-pointer transition-all hover:bg-accent ${
                  activeSession === session.id 
                    ? "bg-primary/10 border-primary" 
                    : "bg-card"
                }`}
                onClick={() => setActiveSession(session.id)}
              >
                <p className="font-medium text-sm truncate">{session.name}</p>
                <p className="text-xs text-muted-foreground">
                  {session.messages.length} messages
                </p>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4 bg-card">
          <h2 className="text-xl font-semibold">{currentSession?.name}</h2>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 bg-muted/20">
          <div className="space-y-6 max-w-3xl mx-auto w-full">
            {currentSession?.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                <Bot className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg">Send a message to start chatting</p>
                <p className="text-sm mt-2">You can type text, upload images, or record voice messages</p>
              </div>
            )}
            
            {currentSession?.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div className={`flex gap-3 max-w-xs lg:max-w-md ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.sender === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-secondary-foreground"
                  }`}>
                    {message.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  
                  <Card
                    className={`p-4 ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-card border rounded-tl-none"
                    }`}
                  >
                    {message.type === "image" && message.fileUrl && (
                      <img
                        src={message.fileUrl}
                        alt="Uploaded"
                        className="max-w-full h-auto rounded mb-2"
                      />
                    )}
                    {message.type === "voice" && message.fileUrl && (
                      <div className="mb-2">
                        <audio controls src={message.fileUrl} className="w-full" />
                      </div>
                    )}
                    {message.type === "text" ? (
                      <div className={`prose prose-sm max-w-none ${
                        message.sender === "user" ? "text-primary-foreground" : "text-card-foreground"
                      }`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <p className={`text-xs mt-2 ${
                      message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </Card>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t border-border p-4 bg-card">
          <div className="flex gap-2 max-w-3xl mx-auto w-full">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className="flex-shrink-0"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button 
              onClick={handleSendMessage} 
              className="bg-primary hover:bg-primary/90"
              disabled={!inputMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
