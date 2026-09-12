// Grid skeleton that mirrors the listing layout while products stream in
const LoadingGrid = () => (
  <div className='wrapper space-y-6'>
    <div className='h-7 w-40 animate-pulse rounded-md bg-muted' />
    <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className='space-y-2'>
          <div className='aspect-square w-full animate-pulse rounded-xl bg-muted' />
          <div className='h-4 w-3/4 animate-pulse rounded bg-muted' />
          <div className='h-4 w-1/2 animate-pulse rounded bg-muted' />
        </div>
      ))}
    </div>
  </div>
);

export default LoadingGrid;
