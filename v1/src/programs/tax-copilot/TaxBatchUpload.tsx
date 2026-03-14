import { useState, useCallback } from "react";
import { toast } from "../../utils/toast";

export default function TaxBatchUpload({ onComplete }: { onComplete: (batchId: string) => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [fileCount, setFileCount] = useState(0);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const uploadFiles = async (files: FileList) => {
        if (files.length === 0) return;
        setIsUploading(true);
        setFileCount(files.length);

        try {
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append("files", files[i]);
            }

            // Send to Python Backend
            const response = await fetch("/api/v1/ingestion/batch", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Backend server error");

            const data = await response.json();
            onComplete(data.batch_id);

        } catch (err: any) {
            toast.error(`Upload failed: ${err.message}. Is the Python backend running?`);
            setIsUploading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            uploadFiles(e.dataTransfer.files);
        }
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            uploadFiles(e.target.files);
        }
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8">

            <div className="max-w-3xl w-full text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Ingest Financial Documents</h2>
                <p className="text-studio-secondary">
                    Drag and drop up to 50+ PDFs or images. The AI will extract tabular data, categorize transactions,
                    and find corresponding payments automatically.
                </p>
            </div>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full max-w-3xl border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden
          ${isDragging ? "border-studio-cyan bg-studio-cyan/5 scale-105" : "border-studio-border bg-studio-surface/50 hover:border-studio-cyan/50 hover:bg-studio-surface"}`}
            >
                <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileInput}
                    disabled={isUploading}
                />

                {isUploading ? (
                    <div className="text-center animate-fade-in">
                        <div className="w-16 h-16 border-4 border-t-studio-cyan border-studio-border rounded-full animate-spin mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-studio-cyan">Uploading {fileCount} documents...</h3>
                        <p className="text-sm text-studio-muted mt-2">Connecting to AI Extraction Engine</p>
                    </div>
                ) : (
                    <div className="text-center pointer-events-none">
                        <span className="text-6xl mb-4 block opacity-50">📄➕</span>
                        <h3 className="text-lg font-bold mb-1">Drag and drop documents here</h3>
                        <p className="text-sm text-studio-muted">Supports Bank Statements, W-8BEN, Invoices, and Receipts</p>

                        <div className="flex gap-4 mt-6 justify-center">
                            <span className="text-xs bg-studio-bg px-3 py-1 rounded-full border border-studio-border">Unlimited Files</span>
                            <span className="text-xs bg-studio-bg px-3 py-1 rounded-full border border-studio-border">Background Processing</span>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
