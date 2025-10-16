'use client';
import { useState } from 'react';

export default function HistoryTable({
  rows,                 // [{date, value}]
  initialCount = 14,
  valueLabel,
}: {
  rows: { date: string; value: number }[];
  initialCount?: number;
  valueLabel: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? rows.slice().reverse() : rows.slice().reverse().slice(0, initialCount);

  return (
    <div className="mt-6">
      <table className="w-full text-sm border-separate border-spacing-y-1">
        <thead className="opacity-70">
          <tr><th className="text-left">Date</th><th className="text-right">{valueLabel}</th></tr>
        </thead>
        <tbody>
          {display.map((r) => (
            <tr key={r.date}>
              <td>{r.date}</td>
              <td className="text-right">{r.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > initialCount && (
        <button onClick={() => setShowAll(true)} disabled={showAll} className="mt-3 underline">
          {showAll ? 'Showing full history' : 'Show full history'}
        </button>
      )}
    </div>
  );
}
