"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Show internship opportunities",
  "What interviews do I have this month?",
  "Find recruiter emails from Amazon",
  "Show deadlines this week",
  "Which emails are high priority?",
  "Find emails related to machine learning",
];

export function ChatClient({ initialQuery }: { initialQuery?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your FocusMail AI assistant. Ask me anything about your inbox — internships, deadlines, recruiters, meetings, and more.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  // Auto-fire the query that came from the dashboard search bar
  useEffect(() => {
    if (initialQuery && !firedRef.current) {
      firedRef.current = true;
      sendMessage(initialQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.chat(userMessage);
      setMessages((prev) => [...prev, { role: "assistant", content: response.answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? `Sorry, I couldn't process that request. ${err.message}`
              : "Sorry, something went wrong. Make sure the backend is running and emails are indexed.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  return (
    <>
      <Header
        title="AI Chat"
        description="Ask natural language questions about your inbox"
      />

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-400">Try asking</h3>
          </div>
          <ul className="space-y-2">
            {SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  disabled={loading}
                  className="w-full rounded-lg border border-neutral-900 bg-neutral-950 px-3 py-2 text-left text-xs text-neutral-500 transition-colors hover:border-green-950 hover:text-neutral-400 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex h-[calc(100vh-220px)] flex-col overflow-hidden p-0 lg:col-span-3">
          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-3 animate-fade-in",
                  message.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                    message.role === "user"
                      ? "border-green-950 bg-green-950/50 text-neutral-400"
                      : "border-neutral-800 bg-neutral-950 text-neutral-500"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    message.role === "user"
                      ? "border border-green-950 bg-green-950/30 text-neutral-300"
                      : "border border-neutral-900 bg-neutral-950 text-neutral-400"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950">
                  <Bot className="h-4 w-4 text-neutral-500" />
                </div>
                <div className="rounded-2xl border border-neutral-900 bg-neutral-950 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-600 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-600 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-600 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="border-t border-neutral-900 p-4"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your emails..."
                disabled={loading}
                className="flex-1 rounded-xl border border-neutral-800 bg-black px-4 py-3 text-sm text-neutral-300 placeholder:text-neutral-600 focus:border-green-950 focus:outline-none focus:ring-1 focus:ring-green-950 disabled:opacity-50"
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
