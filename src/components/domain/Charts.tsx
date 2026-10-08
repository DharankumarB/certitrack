import { Bar, BarChart, CartesianGrid, Cell, Area, AreaChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import type { ReactNode } from 'react';
import { Card, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { IntegrationBadge } from '../ui/IntegrationBadge';

export const CHART_COLORS = ['#0b1f3a', '#0e7c4a', '#d97706', '#2b4c7a', '#b91c1c', '#7c3aed', '#64748b'];

export interface ChartDatum {
  name: string;
  value: number;
}

const tooltipStyle = { borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(11,31,58,0.12)', fontSize: 12 };

/** Chart container with a title, a "Demo Data" marker and a text alternative for screen readers. */
export function ChartCard({ title, description, children, data, valueLabel, demo = true, action, className }: { title: string; description?: string; children: ReactNode; data: ChartDatum[]; valueLabel: string; demo?: boolean; action?: ReactNode; className?: string }) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <Card className={className}>
      <figure aria-labelledby={`${id}-title`} className="m-0">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <figcaption id={`${id}-title`} className="text-sm font-semibold text-navy-900">
              {title}
            </figcaption>
            {description && <p className="mt-0.5 text-xs text-slate-600">{description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {action}
            {demo && <Badge tone="neutral">Demo Data</Badge>}
          </div>
        </div>
        <CardBody className="pt-4">
          {children}
          <details className="mt-4 text-xs text-slate-600">
            <summary className="cursor-pointer font-semibold text-navy-800 focus-visible:outline-2 focus-visible:outline-navy-500">View data table</summary>
            <table className="mt-2 w-full border-collapse">
              <caption className="sr-only">{title} data</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th scope="col" className="py-1 pr-2 font-semibold">
                    Category
                  </th>
                  <th scope="col" className="py-1 font-semibold">
                    {valueLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.name} className="border-b border-slate-100">
                    <td className="py-1 pr-2">{d.name}</td>
                    <td className="py-1 tabular-nums">{d.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </CardBody>
      </figure>
    </Card>
  );
}

export function BarsChart({ data, horizontal = false, height = 240, valueLabel, unit }: { data: ChartDatum[]; horizontal?: boolean; height?: number; valueLabel: string; unit?: string }) {
  if (data.every((d) => d.value === 0)) return <p className="py-10 text-center text-sm text-slate-600">No data in this period yet.</p>;
  return (
    <div className="h-[240px] w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, bottom: 4, left: horizontal ? 8 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#334155' }} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} interval={0} />
              <YAxis tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
            </>
          )}
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}${unit ?? ''}`, valueLabel]} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="value" radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={48}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, height = 240, valueLabel }: { data: ChartDatum[]; height?: number; valueLabel: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="py-10 text-center text-sm text-slate-600">No data in this period yet.</p>;
  return (
    <div className="h-[240px] w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="86%" paddingAngle={2} stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, valueLabel]} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ data, height = 240, valueLabel }: { data: ChartDatum[]; height?: number; valueLabel: string }) {
  return (
    <div className="h-[240px] w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b1f3a" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#0b1f3a" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} interval="preserveStartEnd" minTickGap={20} />
          <YAxis tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, valueLabel]} />
          <Area type="monotone" dataKey="value" stroke="#0b1f3a" strokeWidth={2} fill="url(#trend-fill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartNote() {
  return (
    <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
      <IntegrationBadge kind="demo-data" /> Illustrative values generated for this prototype.
    </p>
  );
}
