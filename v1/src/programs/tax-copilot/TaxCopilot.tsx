import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../../utils/toast";
import TaxBatchUpload from "./TaxBatchUpload";
import TaxDashboard from "./TaxDashboard";
import TaxChat from "./TaxChat";
import TaxVerification from "./TaxVerification";
import { useGlobalShortcuts } from "../../utils/keyboard";

export type TaxTab = "upload" | "dashboard" | "verification" | "chat";

const BATCH_ID_STORAGE_KEY = "tax_copilot_batch_id";

function getStoredBatchId(): string | null {
    try {
        const s = window.localStorage.getItem(BATCH_ID_STORAGE_KEY);
        return s && s.trim() ? s : null;
    } catch {
        return null;
    }
}

export default function TaxCopilot() {
    const navigate = useNavigate();
    useGlobalShortcuts(navigate);

    const [activeTab, setActiveTab] = useState<TaxTab>("upload");
    const [batchId, setBatchIdState] = useState<string | null>(getStoredBatchId);
    const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "disconnected">("checking");

    const setBatchId = useCallback((id: string | null) => {
        setBatchIdState(id);
        try {
            if (id) window.localStorage.setItem(BATCH_ID_STORAGE_KEY, id);
            else window.localStorage.removeItem(BATCH_ID_STORAGE_KEY);
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch("/health");
                if (res.ok) setBackendStatus("connected");
                else setBackendStatus("disconnected");
            } catch {
                setBackendStatus("disconnected");
            }
        };
        checkHealth();
        const interval = setInterval(checkHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleUploadComplete = useCallback((newBatchId: string) => {
        setBatchId(newBatchId);
        toast.success("Batch uploaded successfully! AI is now processing documents.");
        setActiveTab("dashboard");
    }, [setBatchId]);

    return (
        <div className="flex flex-col h-full w-full bg-studio-bg text-studio-text animate-fade-in">

            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-studio-border bg-studio-surface/50">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">📊</span>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold gradient-text">Tax Copilot</h1>
                            {backendStatus === "connected" ? (
                                <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">● API Online</span>
                            ) : (
                                <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20" title="Ensure tax-backend/main.py is running">● API Offline</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <p className="text-xs text-studio-secondary">
                                Intelligent AI extraction, RAG chat, and blockchain auditing for W‑8BEN workflows.
                            </p>
                            <div className="text-[10px] bg-studio-bg px-3 py-1 rounded-full border border-studio-border font-mono text-studio-muted">
                                Batch: <span className="text-studio-cyan">{batchId || "None"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center bg-studio-bg rounded-lg p-1 border border-studio-border">
                    <button
                        onClick={() => setActiveTab("upload")}
                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${activeTab === "upload" ? "bg-studio-cyan/20 text-studio-cyan font-medium" : "text-studio-muted hover:text-studio-text"}`}
                    >
                        📤 Batch Upload
                    </button>
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${activeTab === "dashboard" ? "bg-studio-blue/20 text-studio-blue font-medium" : "text-studio-muted hover:text-studio-text"}`}
                    >
                        📋 Data Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab("verification")}
                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${activeTab === "verification" ? "bg-studio-green/20 text-green-400 font-medium" : "text-studio-muted hover:text-studio-text"}`}
                    >
                        🔗 Verification
                    </button>
                    <button
                        onClick={() => setActiveTab("chat")}
                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${activeTab === "chat" ? "bg-studio-purple/20 text-studio-purple font-medium" : "text-studio-muted hover:text-studio-text"}`}
                    >
                        💬 RAG Chat
                    </button>
                </div>

                <button
                    onClick={() => navigate("/")}
                    className="btn-ghost text-studio-muted hover:text-studio-text p-2"
                    title="Return to Suite Launcher (ESC)"
                >
                    ✖️
                </button>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative">
                <div className={activeTab === "upload" ? "h-full" : "hidden"}>
                    <TaxBatchUpload onComplete={handleUploadComplete} />
                </div>
                <div className={activeTab === "dashboard" ? "h-full" : "hidden"}>
                    <TaxDashboard batchId={batchId} />
                </div>
                <div className={activeTab === "verification" ? "h-full" : "hidden"}>
                    <TaxVerification />
                </div>
                <div className={activeTab === "chat" ? "h-full" : "hidden"}>
                    <TaxChat batchId={batchId} />
                </div>
            </main>

        </div>
    );
}
