"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const axisStyle = { fontSize: 11, fill: "var(--muted-foreground)" };

function compactCurrency(v: number, currency: string) {
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

function ChartTooltip({ currency }: { currency: string }) {
  return (
    <Tooltip
      contentStyle={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        fontSize: 12,
        color: "var(--foreground)",
      }}
      formatter={(value) => formatCurrency(Number(value), currency)}
    />
  );
}

/** Arus kas bulanan: pemasukan vs pengeluaran */
export function CashflowChart({
  data,
  currency,
}: {
  data: { label: string; pemasukan: number; pengeluaran: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v) => compactCurrency(v, currency)}
        />
        {ChartTooltip({ currency })}
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="pemasukan" name="Pemasukan" fill="var(--positive)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="pengeluaran" name="Pengeluaran" fill="var(--negative)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut per kategori / alokasi aset */
export function DonutChart({
  data,
  currency,
}: {
  data: { name: string; value: number; color: string }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} stroke="var(--card)" />
          ))}
        </Pie>
        {ChartTooltip({ currency })}
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Tren dua seri (mis. omzet vs biaya) */
export function TrendChart({
  data,
  series,
  currency,
}: {
  data: Record<string, string | number>[];
  series: { key: string; name: string; color: string }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v) => compactCurrency(Number(v), currency)}
        />
        {ChartTooltip({ currency })}
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Area chart nilai portofolio */
export function ValueAreaChart({
  data,
  currency,
}: {
  data: { label: string; nilai: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v) => compactCurrency(Number(v), currency)}
        />
        {ChartTooltip({ currency })}
        <Area type="monotone" dataKey="nilai" name="Nilai" stroke="var(--primary)" strokeWidth={2} fill="url(#valGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
