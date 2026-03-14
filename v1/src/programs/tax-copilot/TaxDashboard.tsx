import { useState } from "react";

export default function TaxDashboard({ batchId }: { batchId: string | null }) {
    // Simulated data coming back from the backend rules engine (New Hampshire / Cavite logic)
    const [mockRows] = useState([
        { id: 1, date: "2023-11-15", vendor: "Cloud Services LLC", entity: "C-Corp", amount: 1500.00, method: "Crypto (USDC)", linkedW8: "W8BEN_4921", rules: "NH BET Applicable", verified: true },
        { id: 2, date: "2023-11-18", vendor: "John Doe", entity: "Individual", amount: 450.00, method: "PayPal", linkedW8: "W8BEN_1102", rules: "Cavite BIR 1701Q", verified: false },
        { id: 3, date: "2023-11-22", vendor: "Jane Smith", entity: "Individual", amount: 2200.00, method: "Xoom", linkedW8: "Missing", rules: "Pending W8", verified: false },
        { id: 4, date: "2023-12-01", vendor: "Crypto Dev DAO", entity: "LLC", amount: 5000.00, method: "Crypto (ETH)", linkedW8: "W8BEN_8812", rules: "NH BPT Applicable", verified: true },
    ]);

    return (
        <div className="h-full w-full p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Data Dashboard</h2>
                    <p className="text-studio-secondary text-sm">Review AI extractions, blockchain audits, and regional rules.</p>
                </div>
                <div className="text-xs bg-studio-surface px-4 py-2 rounded border border-studio-border">
                    Active Batch: <span className="text-studio-cyan font-mono">{batchId || "None"}</span>
                </div>
            </div>

            {batchId ? (
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
                            {mockRows.map(row => (
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
            ) : (
                <div className="flex flex-col items-center justify-center p-20 text-center border border-dashed border-studio-border rounded-xl">
                    <span className="text-4xl opacity-50 mb-4">💤</span>
                    <p className="text-studio-secondary">No batch active. Upload documents first.</p>
                </div>
            )}
        </div>
    );
}
