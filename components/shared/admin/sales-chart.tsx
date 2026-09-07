'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Custom ticks (module scope): recharts v3 + React 19 drops its internal
// <Text> ticks in some environments; plain SVG text renders reliably.
const YTick = ({
  x = 0,
  y = 0,
  payload,
  formatValue,
}: {
  x?: number;
  y?: number;
  payload?: { value: number };
  formatValue: (v: number) => string;
}) => (
  <text
    x={x}
    y={y}
    dy={4}
    textAnchor='end'
    fontSize={12}
    fill='var(--muted-foreground)'
  >
    {formatValue(Number(payload?.value ?? 0))}
  </text>
);

const XTick = ({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) => (
  <text x={x} y={y} dy={12} textAnchor='middle' fontSize={12} fill='var(--muted-foreground)'>
    {payload?.value ?? ''}
  </text>
);

// Monthly sales chart (RTL-safe, LTR digits inside the plot for readability).
// Persian compact axis labels via Intl.NumberFormat.
const SalesChart = ({
  data,
  locale,
}: {
  data: { month: string; totalSales: number }[];
  locale: string;
}) => {
  const chartData = data.map(({ month, totalSales }) => {
    const [year, m] = month.split('-').map(Number);
    return {
      month,
      label: new Date(year, m - 1, 1).toLocaleString(
        locale === 'fa' ? 'fa-IR' : 'en-US',
        { month: 'short' }
      ),
      totalSales,
    };
  });

  const formatValue = (value: number) =>
    new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  return (
    // dir=ltr keeps the time axis left→right; tick styling via CSS on the
    // wrapper (recharts v3 object-tick props render empty in some setups)
    <div
      className='h-72 w-full [&_.recharts-cartesian-axis-tick-text]:fill-muted-foreground [&_.recharts-cartesian-axis-tick-text]:text-xs'
      dir='ltr'
    >
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='var(--border)' />
          <XAxis dataKey='label' tickLine={false} axisLine={false} tick={<XTick />} />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatValue(v)}
            allowDecimals={false}
            tick={(props: unknown) => (
              <YTick {...(props as { x?: number; y?: number; payload?: { value: number } })} formatValue={formatValue} />
            )}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
            formatter={(value) => [
              formatValue(Number(value)),
              locale === 'fa' ? 'فروش' : 'Sales',
            ]}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--card-foreground)',
            }}
          />
          <Bar
            dataKey='totalSales'
            name={locale === 'fa' ? 'فروش' : 'Sales'}
            fill='var(--primary)'
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesChart;
