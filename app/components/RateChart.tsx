'use client';
import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

export default function RateChart({
  data,
  color = '#22c55e',
}: {
  data: { date: string; value: number }[];
  color?: string;
}) {
  if (!data?.length) return null;
  return (
    <div className="w-full h-64 bg-black/20 rounded-lg p-2 mt-6 border border-zinc-800">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.slice(-90)} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} hide />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
          <Line type="monotone" dataKey="value" stroke={color} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-center text-zinc-400 mt-2">90-day trend</p>
    </div>
  );
}
