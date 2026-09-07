'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const ProductImages = ({
  images,
  name,
}: {
  images: string[];
  name: string;
}) => {
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  return (
    <div className='space-y-3'>
      <div
        className='relative aspect-square cursor-zoom-in overflow-hidden rounded-xl bg-muted'
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          setOrigin(`${x}% ${y}%`);
        }}
      >
        <Image
          src={images[current]}
          alt={name}
          fill
          priority
          sizes='(max-width: 768px) 100vw, 40vw'
          className={cn(
            'object-cover transition-transform duration-200',
            zoom && 'scale-[2] cursor-zoom-out'
          )}
          style={zoom ? { transformOrigin: origin } : undefined}
        />
      </div>
      {images.length > 1 && (
        <div className='flex gap-2 overflow-x-auto pb-1'>
          {images.map((image, index) => (
            <button
              key={image}
              type='button'
              aria-label={`${name} ${index + 1}`}
              className={cn(
                'relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors',
                current === index ? 'border-primary' : 'border-transparent hover:border-border'
              )}
              onClick={() => setCurrent(index)}
            >
              <Image src={image} alt='' fill sizes='80px' className='object-cover' />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImages;
