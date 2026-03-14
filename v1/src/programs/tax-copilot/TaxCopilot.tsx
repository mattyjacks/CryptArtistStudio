import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../../utils/toast";
import TaxBatchUpload from "./TaxBatchUpload";
import TaxDashboard from "./TaxDashboard";
import TaxChat from "./TaxChat";
import TaxVerification from "./TaxVerification";
import { useGlobalShortcuts } from "../../utils/keyboard";

export type TaxTab = "upload" | "dashboard" | "verification" | "chat";

export default function TaxCopilot() {
    const navigate = useNavigate();
    useGlobalShortcuts(navigate);

    const [activeTab, setActiveTab] = useState<TaxTab>("upload");
    const [batchId, setBatchId] = useState<string | null>(null);

    const handleUploadComplete = useCallback((newBatchId: string) => {
        setBatchId(newBatchId);
        toast.success("Batch uploaded successfully! AI is now processing documents.");
        setActiveTab("dashboard");
    }, []);

    return (
        <div className="flex flex-col h-full w-full bg-studio-bg text-studio-text animate-fade-in">

            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-studio-border bg-studio-surface/50">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">📊</span>
                    <div>
                        <h1 className="text-xl font-bold gradient-text">Tax Copilot</h1>
                        <p className="text-xs text-studio-secondary">Intelligent AI extraction & Blockchain Auditing</p>
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
                {activeTab === "upload" && <TaxBatchUpload onComplete={handleUploadComplete} />}
                {activeTab === "dashboard" && <TaxDashboard batchId={batchId} />}
                {activeTab === "verification" && <TaxVerification />}
                {activeTab === "chat" && <TaxChat batchId={batchId} />}
            </main>

        </div>
    );
}
