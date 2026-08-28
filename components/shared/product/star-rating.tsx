import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// Static star rating display (supports halves visually by rounding down)
const StarRating = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-4 w-4',
            i <= Math.round(value)
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/40'
          )}
        />
      ))}
    </div>
  );
};

export default StarRating;
