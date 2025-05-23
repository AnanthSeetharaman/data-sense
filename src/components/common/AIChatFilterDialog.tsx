
"use client";

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, AlertTriangle, SendHorizontal, Bot as BotIcon, Sparkles } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { handleQueryToFilters } from '@/app/actions';
import type { FilterValues } from '@/contexts/FilterContext';

interface AIChatFilterDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  applyFilters: (filters: FilterValues) => void; // To update sidebar filter UI
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

export function AIChatFilterDialog({ isOpen, onOpenChange, applyFilters }: AIChatFilterDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // For general dialog errors, not chat errors
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([
        { id: 'initial-ai', text: "Hello! How can I help you find data assets today? Describe what you're looking for.", sender: 'ai' }
      ]);
      setInputValue('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      text: inputValue,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    const result = await handleQueryToFilters({ userQuery: userMessage.text });
    setIsLoading(false);

    if (result.success && result.data) {
      const aiResponseText = `Okay, I've updated the filter selections for you based on your query:
        Source: ${result.data.source || 'Any'}
        Tags: ${result.data.tags || 'None'}
        You can now click "Apply Filters" in the sidebar to see the results.`;
      
      setMessages(prev => [...prev, { id: Date.now().toString() + '-ai', text: aiResponseText, sender: 'ai' }]);
      applyFilters(result.data); // Update filter UI in sidebar
      toast({
        title: "AI Suggested Filters",
        description: "Filter selections in the sidebar have been updated. Click 'Apply Filters' there to load data.",
      });
    } else {
      const errorMessage = result.error || 'Sorry, I encountered an issue processing your request.';
      setMessages(prev => [...prev, { id: Date.now().toString() + '-ai-error', text: errorMessage, sender: 'ai' }]);
      toast({
        variant: "destructive",
        title: "AI Query Error",
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] h-[70vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="flex items-center text-lg">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            AI Filter Assistant
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-grow p-6" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'ai' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <BotIcon className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 text-sm shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-card text-card-foreground border rounded-bl-none'
                  }`}
                >
                  {msg.text.split('\n').map((line, index) => (
                    <p key={index} className={index > 0 ? "mt-1" : ""}>{line}</p>
                  ))}
                </div>
                {msg.sender === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center justify-start gap-2">
                 <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <BotIcon className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                <div className="bg-card text-card-foreground border rounded-lg px-4 py-2 text-sm shadow-md rounded-bl-none">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {error && (
          <div className="p-4 border-t">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Describe the data you're looking for..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon">
              <SendHorizontal className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
