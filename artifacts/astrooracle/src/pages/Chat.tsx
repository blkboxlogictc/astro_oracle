import { useState, useRef, useEffect } from "react";
import { Starfield } from "@/components/Starfield";
import { Sparkles, Star, Telescope, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Mode = "science" | "mystic";
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SCIENCE_CHIPS = [
  "What is dark matter?",
  "Explain black holes simply",
  "What is the largest constellation?",
  "How was the universe formed?",
];

const MYSTIC_CHIPS = [
  "What does my Scorpio rising mean?",
  "Tell me about Orion's mythology",
  "How do moon phases affect us?",
  "What is the oldest constellation?",
];

export default function Chat() {
  const [mode, setMode] = useState<Mode>("science");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSubmit = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          mode,
        }),
      });

      if (!response.body) throw new Error("No body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n").filter(Boolean);
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                console.error(data.error);
                break;
              }
              if (data.done) {
                break;
              }
              if (data.content) {
                setMessages((prev) => 
                  prev.map((msg) => 
                    msg.id === assistantMsgId
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("Failed to parse SSE", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const isScience = mode === "science";
  const chips = isScience ? SCIENCE_CHIPS : MYSTIC_CHIPS;
  const accentColorClass = isScience ? "text-blue-400" : "text-amber-500";
  const accentBorderClass = isScience ? "border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]";
  const userGlowClass = isScience ? "shadow-[0_0_20px_rgba(59,130,246,0.15)] border-blue-500/20" : "shadow-[0_0_20px_rgba(245,158,11,0.15)] border-amber-500/20";
  const aiGlowClass = "shadow-[0_0_20px_rgba(107,33,168,0.2)] border-purple-800/30";

  return (
    <div className="relative min-h-[100dvh] w-full text-foreground overflow-hidden font-sans selection:bg-purple-900/50">
      <Starfield />

      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background/80 to-background pointer-events-none" />

      <main className="relative z-10 flex flex-col h-[100dvh] max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <header className="flex flex-col items-center justify-center mb-8 shrink-0 relative">
          <div className="absolute right-0 top-0">
            <button
              onClick={() => setMode(isScience ? "mystic" : "science")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/40 border border-white/10 backdrop-blur-md text-sm font-medium transition-colors hover:bg-card/60"
            >
              <span className={cn("transition-opacity", isScience ? "opacity-100" : "opacity-50")}>🔭 Science</span>
              <span className="w-px h-4 bg-white/20" />
              <span className={cn("transition-opacity", !isScience ? "opacity-100" : "opacity-50")}>✨ Mystic</span>
            </button>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)] mb-2">
            AstroOracle
          </h1>
          <p className="text-white/60 text-sm md:text-base font-medium tracking-wide uppercase">
            Where science meets the stars
          </p>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl bg-card/30 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(107,33,168,0.1)] p-4 md:p-6 mb-4 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-card border border-white/10 shadow-lg", accentColorClass)}>
                {isScience ? <Telescope size={32} /> : <Star size={32} />}
              </div>
              <p className="text-lg font-serif italic text-white/80 max-w-md">
                "The cosmos is within us. We are made of star-stuff. We are a way for the universe to know itself."
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <span className="text-[10px] font-bold text-purple-400/80 uppercase tracking-wider mb-1.5 ml-1">
                        ✦ AstroOracle
                      </span>
                    )}
                    <div
                      className={cn(
                        "px-5 py-3.5 rounded-2xl backdrop-blur-md leading-relaxed",
                        msg.role === "user" 
                          ? cn("bg-card/50 border rounded-tr-sm text-white/90", userGlowClass)
                          : cn("bg-purple-950/20 border rounded-tl-sm text-white/80", aiGlowClass)
                      )}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col max-w-[85%] mr-auto items-start"
                >
                  <span className="text-[10px] font-bold text-purple-400/80 uppercase tracking-wider mb-1.5 ml-1">
                    ✦ AstroOracle
                  </span>
                  <div className={cn("px-5 py-4 rounded-2xl backdrop-blur-md bg-purple-950/20 border rounded-tl-sm shadow-[0_0_20px_rgba(107,33,168,0.2)] border-purple-800/30 flex items-center justify-center gap-1.5 min-w-[60px]")}>
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} className="w-1.5 h-1.5 rounded-full bg-purple-300 relative top-[-4px]" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 flex flex-col gap-3">
          {messages.length === 0 && (
            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-wrap gap-2 justify-center"
              >
                {chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSubmit(chip)}
                    className="px-4 py-2 rounded-full bg-card/50 border border-white/10 text-sm text-white/80 hover:text-white hover:bg-card/80 transition-all backdrop-blur-sm shadow-sm"
                  >
                    {chip}
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(input);
            }}
            className="relative"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the cosmos anything..."
              disabled={isStreaming}
              className={cn(
                "w-full bg-card/60 backdrop-blur-xl border border-white/20 rounded-full py-4 pl-6 pr-14 text-white placeholder:text-white/40 focus:outline-none transition-all duration-300 disabled:opacity-50",
                "focus:border-transparent focus:ring-1",
                isScience ? "focus:ring-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "focus:ring-amber-500 focus:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              )}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                input.trim() && !isStreaming
                  ? cn("bg-card text-white border border-white/20", accentBorderClass)
                  : "bg-transparent text-white/40"
              )}
            >
              {isScience ? <Send size={18} className="ml-0.5" /> : <Sparkles size={18} />}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}