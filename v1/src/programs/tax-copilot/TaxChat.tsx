import { useState, useRef, useEffect } from "react";

export default function TaxChat({ batchId }: { batchId: string | null }) {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: "Hello! I am the Tax Copilot Engine. You can ask me questions about your uploaded documents, like 'Show me unlinked W-8BEN payments' or 'What is my estimated Business Enterprise Tax for New Hampshire?'" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            // Connect to the Python FastAPI RAG endpoint
            const response = await fetch("http://127.0.0.1:8080/api/v1/rag", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: userMsg, batch_id: batchId })
            });

            if (!response.ok) throw new Error("Failed to connect to AI Engine");
            const data = await response.json();

            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.message}. Ensure the Python backend is running.` }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col p-6 max-w-4xl mx-auto">
            <div className="flex-1 bg-studio-surface/30 border border-studio-border rounded-xl p-4 overflow-y-auto mb-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-studio-cyan text-studio-bg rounded-br-none'
                                    : 'bg-studio-surface border border-studio-border text-studio-text rounded-bl-none'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-studio-surface border border-studio-border rounded-2xl rounded-bl-none px-5 py-3 text-sm">
                                <span className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-studio-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-1.5 h-1.5 bg-studio-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-1.5 h-1.5 bg-studio-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={batchId ? "Ask the AI about your documents..." : "Start a batch upload to chat with documents..."}
                    disabled={!batchId}
                    className="flex-1 input bg-studio-surface border-studio-border px-4 py-3 rounded-xl disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || !batchId || isTyping}
                    className="btn btn-purple px-6 py-3 rounded-xl shadow-lg disabled:opacity-50"
                >
                    Send
                </button>
            </form>
            {!batchId && <p className="text-center text-xs text-yellow-500 mt-2">⚠️ You must upload a batch of documents first before chatting with them.</p>}
        </div>
    );
}
