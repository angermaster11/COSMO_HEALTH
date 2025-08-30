import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Mic, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'voice';
  sender: 'user' | 'bot';
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
      id: '1',
      name: 'Chat Session 1',
      messages: [],
      createdAt: new Date()
    }
  ]);
  const [activeSession, setActiveSession] = useState('1');
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const addMessage = (content: string, type: 'text' | 'image' | 'voice', fileUrl?: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      type,
      sender: 'user',
      timestamp: new Date(),
      fileUrl
    };

    setSessions(prev => prev.map(session => 
      session.id === activeSession 
        ? { ...session, messages: [...session.messages, newMessage] }
        : session
    ));

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: type === 'voice' ? 'I received your voice message!' : 
                 type === 'image' ? 'I can see your image!' : 
                 `You said: ${content}`,
        type: 'text',
        sender: 'bot',
        timestamp: new Date()
      };
      
      setSessions(prev => prev.map(session => 
        session.id === activeSession 
          ? { ...session, messages: [...session.messages, botMessage] }
          : session
      ));
    }, 1000);
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      addMessage(inputMessage, 'text');
      setInputMessage('');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        addMessage('Image uploaded', 'image', url);
      }
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        addMessage('Voice message', 'voice', url);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const createNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      name: `Chat Session ${sessions.length + 1}`,
      messages: [],
      createdAt: new Date()
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSession(newSession.id);
  };

  const currentSession = sessions.find(s => s.id === activeSession);

  return (
    <div className="flex h-screen bg-background">
      {/* Sessions Sidebar */}
      <div className="w-64 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <Button onClick={createNewSession} className="w-full bg-gradient-primary">
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {sessions.map(session => (
              <Card 
                key={session.id}
                className={`mb-2 p-3 cursor-pointer transition-smooth hover:bg-accent ${
                  activeSession === session.id ? 'bg-accent border-primary' : ''
                }`}
                onClick={() => setActiveSession(session.id)}
              >
                <p className="font-medium text-sm">{session.name}</p>
                <p className="text-xs text-muted-foreground">
                  {session.messages.length} messages
                </p>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4 bg-card">
          <h2 className="text-xl font-semibold">{currentSession?.name}</h2>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {currentSession?.messages.map(message => (
              <div 
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <Card className={`max-w-xs p-3 ${
                  message.sender === 'user' ? 'bg-gradient-primary text-primary-foreground' : 'bg-card'
                }`}>
                  {message.type === 'image' && message.fileUrl && (
                    <img 
                      src={message.fileUrl} 
                      alt="Uploaded" 
                      className="max-w-full h-auto rounded mb-2"
                    />
                  )}
                  {message.type === 'voice' && message.fileUrl && (
                    <audio controls src={message.fileUrl} className="mb-2" />
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </Card>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-4 bg-card">
          <div className="flex gap-2">
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
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={isRecording ? 'bg-voice-active' : ''}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} className="bg-gradient-primary">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};