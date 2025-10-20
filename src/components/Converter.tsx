'use client';
import { useMemo, useState } from 'react';

export default function Converter({
  rate,
  fromLabel,
  toLabel,
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
    <div className="row" style={{ marginTop: 16 }}>
      <div className="col card">
        <div className="muted" style={{ fontSize: 12 }}>Amount</div>
        <input
          inputMode="decimal"
          className="mono"
          style={{ width:'100%', background:'transparent', border:'none', outline:'none', fontSize:26, color:'#fff' }}
          defaultValue={defaultAmount}
          onChange={(e) => setAmount(parseFloat(e.target.value || '0'))}
        />
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>{fromLabel}</div>
      </div>
      <div className="col card">
        <div className="muted" style={{ fontSize: 12 }}>Converted</div>
        <div className="mono" style={{ fontSize:26 }}>{converted.toLocaleString()}</div>
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>{toLabel}</div>
      </div>
    </div>
  );
}
