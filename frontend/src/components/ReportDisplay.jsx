/* File overview: frontend/src/components/ReportDisplay.jsx
 * Purpose: formats generated narrative into readable, copyable bullet point insights.
 */
import { useMemo, useState } from 'react';

function toBulletPoints(text) {
  const normalized = (text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const rawParts = normalized
    .split(/(?<=[.!?])\s+/g)
    .map((part) => part.trim())
    .filter(Boolean);

  const points = [];
  let pendingHeading = '';

  for (const part of rawParts) {
    const isHeadingOnly = /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}:?|[A-Za-z]+-)$/.test(part);

    if (isHeadingOnly) {
      pendingHeading = pendingHeading ? `${pendingHeading} ${part}` : part;
      continue;
    }

    if (pendingHeading) {
      const heading = pendingHeading.endsWith(':') || pendingHeading.endsWith('-')
        ? pendingHeading
        : `${pendingHeading}:`;
      points.push(`${heading} ${part}`.replace(/\s+/g, ' ').trim());
      pendingHeading = '';
    } else {
      points.push(part);
    }
  }

  if (pendingHeading) {
    points.push(pendingHeading);
  }

  return points.length ? points : [normalized];
}

export default function ReportDisplay({ calcResult }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [reportText, setReportText] = useState('');
  const [error, setError] = useState(null);
  const reportPoints = useMemo(() => toBulletPoints(reportText), [reportText]);

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
      const textToCopy = reportPoints.length
        ? reportPoints.map((point) => `- ${point}`).join('\n')
        : reportText;
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      // no-op
    }
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-medium font-bold uppercase tracking-wider text-slate-400">Executive Report</h3>
        {!done ? (
          <button onClick={generate} disabled={loading} className="btn-solar px-4 py-2 text-base font-medium">
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        ) : (
          <span className="text-sm font-medium text-green-400 font-semibold">✓ Report Complete</span>
        )}
      </div>

      {error && <p className="text-base font-medium text-red-400">{error}</p>}

      <div id="report-print" className="min-h-[240px] rounded-xl border border-white/10 bg-slate-950/40 p-4 text-slate-200 leading-relaxed">
        {reportPoints.length > 0 ? (
          <ul className="space-y-2 list-disc pl-6">
            {reportPoints.map((point, idx) => (
              <li key={`${idx}-${point.slice(0, 20)}`}>{point}</li>
            ))}
            {loading && <li className="animate-pulse text-slate-400">Generating...</li>}
          </ul>
        ) : loading ? (
          <p className="text-slate-300 animate-pulse">Generating report...</p>
        ) : (
          <p className="text-slate-500">Generate report to view recommendations in bullet points.</p>
        )}
      </div>

      {done && (
        <div className="flex items-center gap-3">
          <button onClick={copyReport} className="btn-ghost text-base font-medium">Copy Report</button>
          <button onClick={() => window.print()} className="btn-ghost text-base font-medium">Download as PDF</button>
        </div>
      )}
    </div>
  );
}
