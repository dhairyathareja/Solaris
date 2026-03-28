import { useState } from 'react';

export default function ReportDisplay({ calcResult }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [reportText, setReportText] = useState('');
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setDone(false);
    setError(null);
    setReportText('');

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calcResult),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start report generation.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const token = line.replace('data: ', '');
          if (token.trim() === '[DONE]') {
            setDone(true);
            continue;
          }
          setReportText((prev) => prev + token);
        }
      }

      setDone(true);
    } catch (err) {
      setError(err.message || 'Report generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
    } catch {
      // no-op
    }
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Executive Report</h3>
        {!done ? (
          <button onClick={generate} disabled={loading} className="btn-solar px-4 py-2 text-sm">
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        ) : (
          <span className="text-xs text-green-400 font-semibold">✓ Report Complete</span>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div id="report-print" className="min-h-[240px] whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/40 p-4 text-slate-200 leading-relaxed">
        {reportText}
        {loading && <span className="animate-pulse">|</span>}
      </div>

      {done && (
        <div className="flex items-center gap-3">
          <button onClick={copyReport} className="btn-ghost text-sm">Copy Report</button>
          <button onClick={() => window.print()} className="btn-ghost text-sm">Download as PDF</button>
        </div>
      )}
    </div>
  );
}
