'use client';
import { useState } from 'react';

export default function HistoryTable({
  rows,
  initialCount = 14,
  valueLabel,
}: {
  rows: { date: string; value: number }[];
  initialCount?: number;
  valueLabel: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const sortedAsc = rows.slice().sort((a, b) => a.date.localeCompare(b.date));
  const display = showAll ? sortedAsc : sortedAsc.slice(-initialCount);

  return (
    <div style={{ marginTop: 16 }}>
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th className="right">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {display.map((r) => (
            <tr key={r.date}>
              <td>{r.date}</td>
              <td className="right mono">{r.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > initialCount && (
        <button className="btn" style={{ marginTop: 8 }} onClick={() => setShowAll(true)} disabled={showAll}>
          {showAll ? 'Showing full history' : 'Show full history'}
        </button>
      )}
    </div>
  );
}
