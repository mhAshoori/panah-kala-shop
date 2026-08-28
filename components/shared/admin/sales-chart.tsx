// Lightweight dependency-free bar chart for monthly sales (RTL-safe).
const SalesChart = ({
  data,
  locale,
}: {
  data: { month: string; totalSales: number }[];
  locale: string;
}) => {
  const max = Math.max(...data.map((d) => d.totalSales), 1);

  const formatMonth = (ym: string) => {
    const [year, month] = ym.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleString(
      locale === 'fa' ? 'fa-IR' : 'en-US',
      { month: 'short' }
    );
  };

  const formatValue = (value: number) =>
    new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  return (
    <div className='flex h-64 items-end justify-between gap-2' dir='ltr'>
      {data.map(({ month, totalSales }) => (
        <div
          key={month}
          className='group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1'
          title={new Intl.NumberFormat('en-US').format(totalSales)}
        >
          <span className='text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100'>
            {formatValue(totalSales)}
          </span>
          <div
            className='w-full max-w-10 rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary'
            style={{ height: `${Math.max((totalSales / max) * 100, 2)}%` }}
          />
          <span className='text-[10px] text-muted-foreground sm:text-xs'>
            {formatMonth(month)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SalesChart;
