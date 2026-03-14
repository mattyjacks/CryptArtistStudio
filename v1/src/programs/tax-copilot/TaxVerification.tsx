import { useState } from "react";
import { toast } from "../../utils/toast";

interface VerificationResult {
    verified: boolean;
    chain?: string;
    amount_usd_at_time?: number;
    timestamp?: string;
    audit_trail_valid?: boolean;
    message?: string;
    error?: string;
}

export default function TaxVerification() {
    const [walletAddress, setWalletAddress] = useState("");
    const [txHash, setTxHash] = useState("");
    const [chain, setChain] = useState<"ethereum" | "solana">("ethereum");
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [history, setHistory] = useState<(VerificationResult & { wallet: string; tx: string })[]>([]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!walletAddress.trim() || !txHash.trim()) {
            toast.error("Wallet address and transaction hash are required.");
            return;
        }

        setIsVerifying(true);
        setResult(null);

        try {
            const response = await fetch("/api/v1/blockchain/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    wallet_address: walletAddress,
                    tx_hash: txHash,
                    chain,
                }),
            });

            if (!response.ok) throw new Error("Backend server error");
            const data: VerificationResult = await response.json();
            setResult(data);
            setHistory(prev => [{ ...data, wallet: walletAddress, tx: txHash }, ...prev]);

            if (data.verified) {
                toast.success("Transaction verified on-chain!");
            } else {
                toast.error(data.error || "Verification failed.");
            }
        } catch (err: any) {
            toast.error(`Verification failed: ${err.message}. Is the Python backend running?`);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">

                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">Blockchain Audit Verification</h2>
                    <p className="text-studio-secondary text-sm">
                        Cryptographically verify crypto payouts on Ethereum or Solana by querying the on-chain ledger via Web3 RPC.
                    </p>
                </div>

                {/* Verification Form */}
                <form onSubmit={handleVerify} className="bg-studio-surface/50 border border-studio-border rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs text-studio-muted mb-1 uppercase tracking-wide">Wallet Address</label>
                            <input
                                type="text"
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                                placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f..."
                                className="w-full input bg-studio-bg border-studio-border px-4 py-2.5 rounded-lg text-sm font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-studio-muted mb-1 uppercase tracking-wide">Transaction Hash</label>
                            <input
                                type="text"
                                value={txHash}
                                onChange={(e) => setTxHash(e.target.value)}
                                placeholder="0xabc123..."
                                className="w-full input bg-studio-bg border-studio-border px-4 py-2.5 rounded-lg text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div>
                            <label className="block text-xs text-studio-muted mb-1 uppercase tracking-wide">Chain</label>
                            <select
                                value={chain}
                                onChange={(e) => setChain(e.target.value as "ethereum" | "solana")}
                                className="input bg-studio-bg border-studio-border px-4 py-2.5 rounded-lg text-sm"
                            >
                                <option value="ethereum">Ethereum</option>
                                <option value="solana">Solana</option>
                            </select>
                        </div>
                        <div className="flex-1" />
                        <button
                            type="submit"
                            disabled={isVerifying || !walletAddress.trim() || !txHash.trim()}
                            className="btn btn-cyan px-8 py-2.5 rounded-lg shadow-lg disabled:opacity-50 mt-4"
                        >
                            {isVerifying ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin" />
                                    Querying RPC...
                                </span>
                            ) : (
                                "Verify On-Chain"
                            )}
                        </button>
                    </div>
                </form>

                {/* Result Card */}
                {result && (
                    <div className={`border rounded-xl p-6 mb-6 animate-fade-in ${result.verified
                        ? "bg-green-500/5 border-green-500/30"
                        : "bg-red-500/5 border-red-500/30"
                        }`}>
                        <div className="flex items-start gap-4">
                            <span className="text-4xl">{result.verified ? "✅" : "❌"}</span>
                            <div className="flex-1">
                                <h3 className={`text-lg font-bold ${result.verified ? "text-green-400" : "text-red-400"}`}>
                                    {result.verified ? "Transaction Verified" : "Verification Failed"}
                                </h3>
                                <p className="text-sm text-studio-secondary mt-1">
                                    {result.message || result.error}
                                </p>
                                {result.verified && (
                                    <div className="grid grid-cols-3 gap-4 mt-4">
                                        <div className="bg-studio-bg/50 rounded-lg p-3 border border-studio-border">
                                            <p className="text-xs text-studio-muted">Chain</p>
                                            <p className="text-sm font-medium capitalize">{result.chain}</p>
                                        </div>
                                        <div className="bg-studio-bg/50 rounded-lg p-3 border border-studio-border">
                                            <p className="text-xs text-studio-muted">Amount (USD at time)</p>
                                            <p className="text-sm font-medium text-studio-green">${result.amount_usd_at_time?.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-studio-bg/50 rounded-lg p-3 border border-studio-border">
                                            <p className="text-xs text-studio-muted">Timestamp</p>
                                            <p className="text-sm font-medium">{result.timestamp}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Audit History */}
                {history.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-studio-muted uppercase tracking-wide mb-3">Audit History</h3>
                        <div className="space-y-2">
                            {history.map((entry, i) => (
                                <div key={i} className="flex items-center gap-3 bg-studio-surface/30 border border-studio-border rounded-lg px-4 py-2.5 text-sm">
                                    <span>{entry.verified ? "✅" : "❌"}</span>
                                    <span className="font-mono text-xs text-studio-secondary truncate max-w-[200px]">{entry.tx}</span>
                                    <span className="text-studio-muted">on</span>
                                    <span className="capitalize">{entry.chain || chain}</span>
                                    {entry.amount_usd_at_time && (
                                        <span className="text-studio-green ml-auto">${entry.amount_usd_at_time.toFixed(2)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
