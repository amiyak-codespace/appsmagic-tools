import React, { useState } from 'react';
import { Upload, FileText, BrainCircuit, Play, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function DocumentProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [requirement, setRequirement] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleProcess = async () => {
    if (!file || !requirement) {
      setError('Please upload a file and enter a requirement.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('requirement', requirement);

    try {
      const response = await fetch('/api/tools-ai/process-document', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to process document.');
      }

      // Download response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${file.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setResult('Document processed successfully! File download has started.');
    } catch (err: any) {
      setError(err.message || 'An error occurred during processing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <BrainCircuit className="w-8 h-8 text-indigo-400" />
        <h1 className="text-2xl font-bold text-slate-100">Almighty AI Document Processor</h1>
      </div>
      
      <p className="text-slate-400 text-sm">
        Upload any file (PDF, Excel, Images, CSV) and describe what you want to do with it in plain English. 
        The AI will dynamically write and execute a Python script to process your file and return the result.
        All data is securely wiped after 10 minutes.
      </p>

      <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5 space-y-6">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">1. Upload Document</label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-600 border-dashed rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? <FileText className="w-10 h-10 mb-3 text-emerald-400" /> : <Upload className="w-10 h-10 mb-3 text-slate-400" />}
                <p className="mb-2 text-sm text-slate-400">
                  <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">{file ? file.name : "PDF, DOCX, Images, JSON, CSV"}</p>
              </div>
              <input type="file" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">2. Almighty AI Instructions</label>
          <textarea
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[120px]"
            placeholder="e.g., 'Extract page 1 from this PDF', 'Convert this image to grayscale', 'Calculate the sum of the Price column in this CSV'"
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{result}</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            onClick={handleProcess}
            disabled={loading || !file || !requirement}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing with AI...</> : <><Play className="w-4 h-4 fill-current" /> Run Almighty Processor</>}
          </button>
        </div>
      </div>
    </div>
  );
}
