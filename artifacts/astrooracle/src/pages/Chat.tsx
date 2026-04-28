import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Starfield } from "@/components/Starfield";
import { AmbientPlayer } from "@/components/AmbientPlayer";
import { SkyTonight } from "@/components/SkyTonight";
import { UserMenu } from "@/components/UserMenu";
import { ZODIAC_SIGNS } from "@/lib/astro-calc";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { API_BASE } from "@/lib/api";
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
  toolsUsed?: string[];
};

const TOOL_LABELS: Record<string, string> = {
  search_knowledge_base: "✦ Searching knowledge base...",
  search_web: "🌐 Searching the web...",
  search_research_papers: "🔬 Searching academic papers...",
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

function AssistantMessage({ msg }: { msg: Message }) {
  return (
    <div className="px-5 py-4 rounded-2xl backdrop-blur-md bg-purple-950/20 border rounded-tl-sm text-white/85 shadow-[0_0_20px_rgba(107,33,168,0.2)] border-purple-800/30">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        className={cn(
          "prose prose-invert prose-sm max-w-none",
          "prose-headings:font-serif prose-headings:text-white prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0",
          "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
          "prose-p:text-white/85 prose-p:leading-relaxed prose-p:my-2",
          "prose-strong:text-white prose-em:text-white/90",
          "prose-ul:my-2 prose-ol:my-2 prose-li:text-white/85 prose-li:my-0.5",
          "prose-li:marker:text-purple-400",
          "prose-a:text-purple-300 prose-a:no-underline hover:prose-a:underline",
          "prose-code:text-purple-200 prose-code:bg-purple-900/50 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs",
          "prose-pre:bg-purple-950/60 prose-pre:border prose-pre:border-purple-800/40",
          "prose-blockquote:border-l-purple-500 prose-blockquote:text-white/65 prose-blockquote:italic",
          "prose-hr:border-white/10 prose-hr:my-4",
          "prose-table:text-sm prose-thead:border-white/20 prose-td:border-white/10 prose-th:text-white/90 prose-td:text-white/80",
        )}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {msg.content}
      </ReactMarkdown>

      {msg.toolsUsed && msg.toolsUsed.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-purple-400/70 uppercase tracking-wider font-medium">Sources:</span>
          {msg.toolsUsed.includes("search_knowledge_base") && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 border border-purple-700/30 text-purple-300/80">
              ✦ Knowledge Base
            </span>
          )}
          {msg.toolsUsed.includes("search_web") && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-700/30 text-blue-300/80">
              🌐 Web Search
            </span>
          )}
          {msg.toolsUsed.includes("search_research_papers") && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/40 border border-green-700/30 text-green-300/80">
              🔬 Academic Research
            </span>
          )}
          {(msg.toolsUsed.includes("search_web") || msg.toolsUsed.includes("search_research_papers")) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-700/30 text-amber-300/80">
              ✦ Insight saved to knowledge base
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>("science");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
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
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const userContext = profile?.sun_sign
        ? { sun_sign: profile.sun_sign, moon_sign: profile.moon_sign, rising_sign: profile.rising_sign }
        : undefined;

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          mode,
          userContext,
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
                setActiveTool(null);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, toolsUsed: data.toolsUsed ?? [] }
                      : msg
                  )
                );
                break;
              }
              if (data.type === "tool_start") {
                setActiveTool(data.tool);
              }
              if (data.type === "text" && data.content) {
                setActiveTool(null);
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

  return (
    <div className="relative min-h-[100dvh] w-full text-foreground overflow-hidden font-sans selection:bg-purple-900/50">
      <Starfield mode={mode} />

      {/* Mode-aware top glow — two layers cross-fading */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgb(88_28_135_/_0.22),_transparent_55%)] transition-opacity duration-[1500ms]"
        style={{ opacity: isScience ? 1 : 0 }}
      />
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgb(120_53_15_/_0.18),_transparent_55%)] transition-opacity duration-[1500ms]"
        style={{ opacity: isScience ? 0 : 1 }}
      />
      {/* Dark vignette base */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-transparent via-background/60 to-background" />

      <main className="relative z-10 flex flex-col h-[100dvh] max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <header className="flex flex-col items-center justify-center mb-8 shrink-0 relative">
          {/* Left controls: ambient + sky tonight */}
          <div className="absolute left-0 top-0 flex items-center gap-2">
            <AmbientPlayer />
            <SkyTonight />
          </div>

          {/* Right controls: cosmic profile + mode toggle */}
          <div className="absolute right-0 top-0 flex items-center gap-2">
            <UserMenu />
            <motion.button
              onClick={() => setMode(isScience ? "mystic" : "science")}
              whileTap={{ scale: 0.93 }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/40 border backdrop-blur-md text-sm font-medium transition-all duration-500 hover:bg-card/60",
                isScience
                  ? "border-blue-500/25 shadow-[0_0_14px_rgba(59,130,246,0.18)]"
                  : "border-amber-500/25 shadow-[0_0_14px_rgba(245,158,11,0.18)]"
              )}
            >
              <span className={cn("transition-opacity duration-300", isScience ? "opacity-100" : "opacity-40")}>🔭 Science</span>
              <span className="w-px h-4 bg-white/20" />
              <span className={cn("transition-opacity duration-300", !isScience ? "opacity-100" : "opacity-40")}>✨ Mystic</span>
            </motion.button>
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
            <div className="h-full flex flex-col items-center justify-between py-2">
              {/* Quote */}
              <div className="flex flex-col items-center text-center flex-1 justify-center px-4 opacity-80">
                <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-3 bg-card border border-white/10 shadow-lg", accentColorClass)}>
                  {isScience ? <Telescope size={28} /> : <Star size={28} />}
                </div>
                <p className="text-base font-serif italic text-white/75 max-w-md leading-relaxed">
                  {isScience
                    ? '"The cosmos is within us. We are made of star-stuff."'
                    : '"We are stardust brought to life, empowered by the universe to figure itself out."'}
                </p>
              </div>

              {/* Zodiac constellation cards */}
              <div className="w-full shrink-0">
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2 text-center">
                  {isScience ? "Explore the Zodiac Constellations" : "Discover Your Sign"}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {ZODIAC_SIGNS.map(sign => (
                    <motion.button
                      key={sign.sign}
                      onClick={() => handleSubmit(
                        isScience
                          ? `Tell me about the ${sign.sign} constellation — its stars, mythology, and location in the sky`
                          : `Tell me about ${sign.sign} — its astrological meaning, mythology, and what it means to be born under this sign`
                      )}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-[88px] rounded-2xl border bg-card/35 backdrop-blur-sm p-2.5 text-center hover:bg-card/65 transition-all duration-200 group"
                      style={{ borderColor: sign.elementColor + "55" }}
                    >
                      <span className="text-xl block mb-1 group-hover:scale-110 transition-transform">{sign.symbol}</span>
                      <p className="text-[11px] font-semibold text-white/80 leading-tight">{sign.sign}</p>
                      <p className="text-[9px] text-white/35 mt-0.5 leading-tight">{sign.dates}</p>
                      <span className="text-[8px] mt-0.5 block font-medium" style={{ color: sign.elementColor }}>{sign.element}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: msg.role === "user" ? 24 : -24, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className={cn(
                      "flex flex-col max-w-[88%]",
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <span className="text-[10px] font-bold text-purple-400/80 uppercase tracking-wider mb-1.5 ml-1">
                        ✦ AstroOracle
                      </span>
                    )}
                    {msg.role === "user" ? (
                      <div className={cn(
                        "px-5 py-3.5 rounded-2xl backdrop-blur-md leading-relaxed bg-card/50 border rounded-tr-sm text-white/90",
                        userGlowClass
                      )}>
                        {msg.content}
                      </div>
                    ) : (
                      <AssistantMessage msg={msg} />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isStreaming && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col max-w-[88%] mr-auto items-start"
                >
                  <span className="text-[10px] font-bold text-purple-400/80 uppercase tracking-wider mb-1.5 ml-1">
                    ✦ AstroOracle
                  </span>
                  <div className="px-5 py-4 rounded-2xl backdrop-blur-md bg-purple-950/20 border rounded-tl-sm shadow-[0_0_20px_rgba(107,33,168,0.2)] border-purple-800/30 flex items-center gap-2 min-w-[60px]">
                    {activeTool ? (
                      <>
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                        <span className="text-[11px] text-white/50">{TOOL_LABELS[activeTool] ?? "Thinking..."}</span>
                      </>
                    ) : (
                      <>
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} className="w-1.5 h-1.5 rounded-full bg-purple-300 relative top-[-4px]" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      </>
                    )}
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
