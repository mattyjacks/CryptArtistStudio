import { useState, useEffect, useCallback } from "react";
import { toast } from "../../utils/toast";

interface TransactionRow {
    id: number;
    date: string;
    vendor: string;
    entity: string;
    amount: number;
    method: string;
    linkedW8: string;
    rules: string;
    verified: boolean;
    status?: "processing" | "ready";
    filename?: string;
}

interface TaxReport {
    region: string;
    entity_type: string;
    gross_receipts: number;
    taxes_due: { tax_type: string; amount_estimated?: number; form_required: string; note?: string }[];
    note?: string;
}

export default function TaxDashboard({ batchId }: { batchId: string | null }) {
    const [rows, setRows] = useState<TransactionRow[]>([]);
    const [taxReport, setTaxReport] = useState<TaxReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<"new hampshire" | "cavite">("new hampshire");

    const fetchDashboardData = useCallback(async () => {
        if (!batchId) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/v1/ingestion/dashboard?batch_id=${encodeURIComponent(batchId)}`);
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            setRows(data.transactions || []);
        } catch {
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    }, [batchId]);

    const fetchTaxReport = useCallback(async () => {
        if (!batchId) return;
        try {
            const totalReceipts = rows.reduce((sum, r) => sum + r.amount, 0);
            const entityType = rows.length > 0 ? rows[0].entity : "Individual";
            const response = await fetch("/api/v1/ingestion/apply-rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entity_type: entityType, gross_receipts: totalReceipts, region: selectedRegion }),
            });
            if (!response.ok) throw new Error("Failed to fetch tax rules");
            const data = await response.json();
            setTaxReport(data);
        } catch {
            setTaxReport(null);
        }
    }, [batchId, rows, selectedRegion]);

    const deleteFile = useCallback(async (filename: string) => {
        if (!batchId) return;
        setDeletingFilename(filename);
        try {
            const url = `/api/v1/ingestion/batch/${encodeURIComponent(batchId)}/files/${encodeURIComponent(filename)}`;
            const response = await fetch(url, { method: "DELETE" });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || `Delete failed: ${response.status}`);
            }
            toast.success(`Removed ${filename}`);
            await fetchDashboardData();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete file");
        } finally {
            setDeletingFilename(null);
        }
    }, [batchId, fetchDashboardData]);

    useEffect(() => {
        // When the active batch changes, clear any stale rows and refetch
        setRows([]);
        setTaxReport(null);
        fetchDashboardData();
    }, [batchId, fetchDashboardData]);

    // Lightweight polling: while any row is still "processing", refresh the
    // dashboard every few seconds so AI status flips to "Ready" automatically.
    useEffect(() => {
        if (!batchId) return;
        const hasProcessing = rows.some((r) => r.status === "processing");
        if (!hasProcessing) return;

        const id = window.setInterval(() => {
            fetchDashboardData();
        }, 4000);

        return () => window.clearInterval(id);
    }, [batchId, rows, fetchDashboardData]);
    useEffect(() => { if (rows.length > 0) fetchTaxReport(); }, [rows, fetchTaxReport]);

    return (
        <div className="h-full w-full p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Data Dashboard</h2>
                    <p className="text-studio-secondary text-sm">Review AI extractions, blockchain audits, and regional rules.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value as "new hampshire" | "cavite")}
                        className="text-xs input bg-studio-bg border-studio-border px-3 py-2 rounded"
                    >
                        <option value="new hampshire">New Hampshire, USA</option>
                        <option value="cavite">Cavite, Philippines</option>
                    </select>
                    <div className="text-xs bg-studio-surface px-4 py-2 rounded border border-studio-border">
                        Active Batch: <span className="text-studio-cyan font-mono">{batchId || "None"}</span>
                    </div>
                </div>
            </div>

            {batchId ? (
                <>
                    {/* Tax Rules Summary */}
                    {taxReport && (
                        <div className="bg-studio-surface/50 border border-studio-border rounded-xl p-4 mb-4">
                            <h3 className="text-sm font-bold text-studio-muted uppercase tracking-wide mb-3">Tax Rules Engine — {taxReport.region}</h3>
                            <div className="flex gap-4 flex-wrap">
                                <div className="bg-studio-bg/50 rounded-lg p-3 border border-studio-border min-w-[180px]">
                                    <p className="text-xs text-studio-muted">Entity Type</p>
                                    <p className="text-sm font-medium">{taxReport.entity_type}</p>
                                </div>
                                <div className="bg-studio-bg/50 rounded-lg p-3 border border-studio-border min-w-[180px]">
                                    <p className="text-xs text-studio-muted">Gross Receipts</p>
                                    <p className="text-sm font-medium text-studio-green">${taxReport.gross_receipts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                                {taxReport.taxes_due.map((tax, i) => (
                                    <div key={i} className="bg-studio-bg/50 rounded-lg p-3 border border-studio-border min-w-[220px]">
                                        <p className="text-xs text-studio-muted">{tax.tax_type}</p>
                                        {tax.amount_estimated !== undefined && (
                                            <p className="text-sm font-medium text-yellow-400">${tax.amount_estimated.toFixed(2)} est.</p>
                                        )}
                                        <p className="text-xs text-studio-secondary mt-1">Form: {tax.form_required}</p>
                                    </div>
                                ))}
                                {taxReport.note && (
                                    <div className="bg-studio-bg/50 rounded-lg p-3 border border-studio-border min-w-[220px]">
                                        <p className="text-xs text-studio-secondary">{taxReport.note}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Transaction Table */}
                    {isLoading ? (
                        <div className="flex items-center justify-center p-20">
                            <div className="w-10 h-10 border-4 border-t-studio-cyan border-studio-border rounded-full animate-spin" />
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center border border-dashed border-studio-border rounded-xl">
                            <p className="text-studio-secondary">No data to show.</p>
                            <p className="text-studio-muted text-sm mt-1">Upload documents in the Upload tab to see files here.</p>
                        </div>
                    ) : (
                        <div className="bg-studio-surface/50 border border-studio-border rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-studio-bg border-b border-studio-border">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-studio-muted">Date</th>
                                        <th className="px-4 py-3 font-medium text-studio-muted">Vendor / Payee</th>
                                        <th className="px-4 py-3 font-medium text-studio-muted">Entity Type</th>
                                        <th className="px-4 py-3 font-medium text-studio-muted">Amount</th>
                                        <th className="px-4 py-3 font-medium text-studio-muted">Method</th>
                                        <th className="px-4 py-3 font-medium text-studio-muted">W-8BEN Link</th>
                                        <th className="px-4 py-3 font-medium text-studio-muted">On-Chain Audit</th>
                                        <th className="px-4 py-3 font-medium text-studio-muted">Tax Rules Engine</th>
                                        <th className="px-4 py-3 font-medium text-studio-muted">AI Status</th>
                                        <th className="px-4 py-3 font-medium text-studio-muted w-20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-studio-border">
                                    {rows.map(row => (
                                        <tr key={row.id} className="hover:bg-studio-surface/80 transition-colors">
                                            <td className="px-4 py-3 text-studio-secondary">{row.date}</td>
                                            <td className="px-4 py-3 font-medium">{row.vendor}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs bg-studio-bg px-2 py-1 rounded border border-studio-border">{row.entity}</span>
                                            </td>
                                            <td className="px-4 py-3 text-studio-green">${row.amount.toFixed(2)}</td>
                                            <td className="px-4 py-3">{row.method}</td>
                                            <td className="px-4 py-3">
                                                {row.linkedW8 === "Missing" ? (
                                                    <span className="text-red-400 text-xs bg-red-400/10 px-2 py-1 rounded">Missing</span>
                                                ) : (
                                                    <span className="text-studio-cyan text-xs bg-studio-cyan/10 px-2 py-1 rounded">{row.linkedW8}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.method.includes("Crypto") ? (
                                                    row.verified ? (
                                                        <span className="text-green-400 text-xs flex items-center gap-1">✅ Verified</span>
                                                    ) : (
                                                        <span className="text-yellow-400 text-xs">⚠️ Pending Web3</span>
                                                    )
                                                ) : (
                                                    <span className="text-studio-muted text-xs">N/A (Fiat)</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-studio-secondary">{row.rules}</td>
                                            <td className="px-4 py-3 text-xs">
                                                {row.status === "processing" ? (
                                                    <span className="flex items-center gap-2 text-studio-muted">
                                                        <span className="w-3 h-3 border-2 border-t-studio-cyan border-studio-border rounded-full animate-spin" />
                                                        <span>Processing…</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-studio-green">Ready</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {batchId && row.filename ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteFile(row.filename!)}
                                                        disabled={deletingFilename === row.filename}
                                                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                                                        title="Remove file from batch"
                                                    >
                                                        {deletingFilename === row.filename ? "…" : "Delete"}
                                                    </button>
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center p-20 text-center border border-dashed border-studio-border rounded-xl">
                    <span className="text-4xl opacity-50 mb-4">💤</span>
                    <p className="text-studio-secondary">No batch active. Upload documents first.</p>
                </div>
            )}
        </div>
    );
}
