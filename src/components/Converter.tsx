'use client';
import { useMemo, useState } from 'react';

export default function Converter({
  rate,           // e.g., USD->SSP number
  fromLabel,      // "United States Dollar (USD)"
  toLabel,        // "South Sudanese Pound (SSP)"
  defaultAmount = 1,
}: {
  rate: number;
  fromLabel: string;
  toLabel: string;
  defaultAmount?: number;
}) {
  const [amount, setAmount] = useState<number>(defaultAmount);
  const converted = useMemo(() => (amount || 0) * rate, [amount, rate]);

  return (
    <div className="mt-6 grid gap-3 w-full max-w-xl">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-900/60 rounded-xl p-3">
          <div className="text-xs opacity-70">Amount</div>
          <input
            inputMode="decimal"
            className="w-full bg-transparent text-2xl outline-none"
            defaultValue={defaultAmount}
            onChange={(e) => setAmount(parseFloat(e.target.value || '0'))}
          />
          <div className="text-xs opacity-70 mt-1">{fromLabel}</div>
        </div>
        <div className="bg-zinc-900/60 rounded-xl p-3">
          <div className="text-xs opacity-70">Converted</div>
          <div className="block text-2xl">{converted.toLocaleString()}</div>
          <div className="text-xs opacity-70 mt-1">{toLabel}</div>
        </div>
      </div>
    </div>
  );
}
