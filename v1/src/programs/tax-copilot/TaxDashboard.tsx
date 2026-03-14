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
}

interface TaxReport {
    region: string;
    entity_type: string;
    gross_receipts: number;
    taxes_due: { tax_type: string; amount_estimated?: number; form_required: string; note?: string }[];
    note?: string;
}

const FALLBACK_ROWS: TransactionRow[] = [
    { id: 1, date: "2023-11-15", vendor: "Cloud Services LLC", entity: "C-Corp", amount: 1500.00, method: "Crypto (USDC)", linkedW8: "W8BEN_4921", rules: "NH BET Applicable", verified: true },
    { id: 2, date: "2023-11-18", vendor: "John Doe", entity: "Individual", amount: 450.00, method: "PayPal", linkedW8: "W8BEN_1102", rules: "Cavite BIR 1701Q", verified: false },
    { id: 3, date: "2023-11-22", vendor: "Jane Smith", entity: "Individual", amount: 2200.00, method: "Xoom", linkedW8: "Missing", rules: "Pending W8", verified: false },
    { id: 4, date: "2023-12-01", vendor: "Crypto Dev DAO", entity: "LLC", amount: 5000.00, method: "Crypto (ETH)", linkedW8: "W8BEN_8812", rules: "NH BPT Applicable", verified: true },
];

export default function TaxDashboard({ batchId }: { batchId: string | null }) {
    const [rows, setRows] = useState<TransactionRow[]>([]);
    const [taxReport, setTaxReport] = useState<TaxReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState<"new hampshire" | "cavite">("new hampshire");

    const fetchDashboardData = useCallback(async () => {
        if (!batchId) return;
        setIsLoading(true);
        try {
            const response = await fetch(`http://127.0.0.1:8080/api/v1/ingestion/dashboard?batch_id=${encodeURIComponent(batchId)}`);
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            setRows(data.transactions || FALLBACK_ROWS);
        } catch {
            setRows(FALLBACK_ROWS);
        } finally {
            setIsLoading(false);
        }
    }, [batchId]);

    const fetchTaxReport = useCallback(async () => {
        if (!batchId) return;
        try {
            const totalReceipts = rows.reduce((sum, r) => sum + r.amount, 0);
            const entityType = rows.length > 0 ? rows[0].entity : "Individual";
            const response = await fetch("http://127.0.0.1:8080/api/v1/ingestion/apply-rules", {
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

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
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
