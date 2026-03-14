import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { chatWithAI } from "../../utils/openrouter";

const INITIAL_ASSISTANT_MESSAGE: { role: 'assistant'; content: string } = {
    role: 'assistant',
    content:
        "Hello! I am the Tax Copilot Engine. You can ask me questions about your uploaded documents, like 'Show me unlinked W-8BEN payments' or 'What is my estimated Business Enterprise Tax for New Hampshire?'",
};

function loadStoredMessages(batchId: string | null): { role: 'user' | 'assistant'; content: string }[] {
    try {
        const key = `tax_copilot_chat_${batchId ?? "no_batch"}`;
        const raw = window.localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw) as { role: 'user' | 'assistant'; content: string }[];
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {
        // ignore
    }
    return [INITIAL_ASSISTANT_MESSAGE];
}

export default function TaxChat({ batchId }: { batchId: string | null }) {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>(() =>
        loadStoredMessages(batchId)
    );
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // When batchId changes (e.g. new batch selected), load that batch's chat
    useEffect(() => {
        setMessages(loadStoredMessages(batchId));
    }, [batchId]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    // Persist whenever messages change (initial state is already from storage, so we don't overwrite on mount)
    useEffect(() => {
        try {
            const key = `tax_copilot_chat_${batchId ?? "no_batch"}`;
            window.localStorage.setItem(key, JSON.stringify(messages));
        } catch {
            // ignore
        }
    }, [messages, batchId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        const showError = (msg: string) => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ ${msg}`
            }]);
        };

        try {
            let contextBlock = "";

            if (batchId) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                try {
                    const retrieveRes = await fetch("http://127.0.0.1:8080/api/v1/rag/retrieve", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ query: userMsg, batch_id: batchId, top_k: 5 }),
                        signal: controller.signal,
                    });
                    clearTimeout(timeoutId);
                    if (retrieveRes.ok) {
                        const rag = await retrieveRes.json() as { chunks?: { file: string; text: string }[] };
                        const chunks = rag.chunks || [];
                        if (chunks.length > 0) {
                            contextBlock =
                                "Here are excerpts from the user's uploaded documents that may be relevant:\n\n" +
                                chunks
                                    .map((c, i) => `Source ${i + 1} — ${c.file}:\n${c.text}`)
                                    .join("\n\n");
                        }
                    }
                } catch (retrieveErr: unknown) {
                    if ((retrieveErr as Error)?.name === "AbortError") {
                        // Timeout: continue without document context
                    } else {
                        // Backend unreachable or error; continue without context
                        console.warn("RAG retrieve failed:", retrieveErr);
                    }
                }
            }

            const hasExcerpts = contextBlock.length > 0;
            const promptLines = [
                "[Tax Copilot RAG Chat]",
                batchId ? `Active batch ID: ${batchId}` : "No active batch ID (documents not attached).",
                "",
                contextBlock || "(No document excerpts were provided with this request.)",
                "",
                "User question:",
                userMsg,
                "",
                "Answer in exactly TWO sections (concise markdown):",
                "1) **Facts grounded in the provided excerpts**",
                hasExcerpts
                    ? "– In 3–8 short bullet points, summarize what the document is and what it says at a high level. Do not list every line number or field unless the user explicitly asked for that. Keep it brief and scannable."
                    : "– If no excerpts were provided above, write: \"No excerpts were provided with this request. I have no document-specific facts to cite.\" Then add one short line that the guidance below is general only.",
                "2) **General tax guidance (not limited to the excerpts)**",
                "– 3–8 short bullet points with practical advice. No long paragraphs.",
                "",
                "Keep the whole reply brief (~15 bullets total). Be direct and avoid repetition.",
            ];

            const prompt = promptLines.join("\n");
            const llmTimeout = 90000;
            const reply = await Promise.race([
                chatWithAI(prompt, { action: "general" }),
                new Promise<string>((_, reject) =>
                    setTimeout(() => reject(new Error("AI request timed out after 90 seconds. Check your connection and API key in Settings.")), llmTimeout)
                ),
            ]);

            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message
                    : typeof err === "string" ? err
                        : (err as { message?: string })?.message ?? String(err);
            const text = msg.includes("API key") || msg.includes("OpenRouter") ? msg : `${msg} — Check your API key in Settings.`;
            showError(text);
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
                                {msg.role === "assistant" ? (
                                    <div className="tax-chat-markdown">
                                        <ReactMarkdown
                                            components={{
                                                strong: ({ children }) => <strong className="font-bold text-studio-text">{children}</strong>,
                                                ul: ({ children }) => <ul className="list-disc list-outside ml-4 my-2 space-y-0.5">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal list-outside ml-4 my-2 space-y-0.5">{children}</ol>,
                                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                                p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
                                                h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1 first:mt-0">{children}</h2>,
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <span className="whitespace-pre-wrap">{msg.content}</span>
                                )}
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

            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
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
            <div className="flex justify-between items-center mt-2 text-xs">
                {!batchId ? (
                    <p className="text-yellow-500">
                        ⚠️ You must upload a batch of documents first before chatting with them.
                    </p>
                ) : (
                    <span className="text-studio-muted">Chat history is stored locally on this device.</span>
                )}
                <button
                    type="button"
                    onClick={() => {
                        setMessages([INITIAL_ASSISTANT_MESSAGE]);
                        try {
                            const key = `tax_copilot_chat_${batchId || "no_batch"}`;
                            window.localStorage.removeItem(key);
                        } catch {
                            // ignore
                        }
                    }}
                    className="text-studio-muted hover:text-studio-accent underline-offset-2 hover:underline"
                >
                    Clear chat
                </button>
            </div>
        </div>
    );
}
