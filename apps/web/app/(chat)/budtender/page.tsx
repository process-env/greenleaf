"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Leaf, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { transitions } from "@/lib/motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  "What strain would help me relax after work?",
  "I'm looking for something energetic and creative",
  "What's the difference between indica and sativa?",
  "Recommend a strain for social situations",
];

export default function BudtenderPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Sorry, I encountered an error. Please try again.",
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
      {/* Chat Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitions.smooth}
        className="border-b border-border/50 px-4 py-4 bg-background/80 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">AI Budtender</h1>
            <p className="text-sm text-muted-foreground">
              Your personal cannabis sommelier
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto bg-card border-border/50">
            <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
            AI Powered
          </Badge>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={transitions.elegant}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...transitions.elegant, delay: 0.1 }}
                className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6"
              >
                <Leaf className="h-10 w-10 text-primary" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...transitions.elegant, delay: 0.2 }}
                className="text-2xl font-semibold mb-3"
              >
                Welcome to GreenLeaf
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...transitions.elegant, delay: 0.3 }}
                className="text-muted-foreground mb-8 max-w-md"
              >
                I&apos;m here to help you discover the perfect strain. Ask me about
                effects, flavors, or describe what experience you&apos;re seeking.
              </motion.p>

              {/* Suggested prompts */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...transitions.elegant, delay: 0.4 }}
                className="grid sm:grid-cols-2 gap-3 w-full max-w-lg"
              >
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...transitions.smooth, delay: 0.5 + index * 0.1 }}
                  >
                    <Button
                      variant="outline"
                      className="h-auto py-3 px-4 text-left justify-start w-full border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      onClick={() => sendMessage(prompt)}
                    >
                      <span className="line-clamp-2 text-sm">{prompt}</span>
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...transitions.smooth, delay: index === messages.length - 1 ? 0 : 0 }}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  <Card
                    className={cn(
                      "max-w-[80%] p-4 border-border/50",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground border-primary/50"
                        : "bg-card"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => {
                              if (href?.startsWith("/strains/")) {
                                return (
                                  <Link
                                    href={href}
                                    className="text-primary hover:underline font-medium"
                                  >
                                    {children}
                                  </Link>
                                );
                              }
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {children}
                                </a>
                              );
                            },
                          }}
                        >
                          {message.content || "..."}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </Card>

                  {message.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-card border border-border/50 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transitions.smooth, delay: 0.2 }}
        className="border-t border-border/50 p-4 bg-background/80 backdrop-blur-sm"
      >
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me about strains, effects, or recommendations..."
            disabled={isLoading}
            className="flex-1 h-12 bg-card border-border/50 focus:border-primary/50"
          />
          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !input.trim()}
            className="h-12 px-6"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-3">
          AI responses are for informational purposes only. Please consume responsibly.
        </p>
      </motion.div>
    </div>
  );
}
