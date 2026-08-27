'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const ProductImages = ({ images }: { images: string[] }) => {
  const [current, setCurrent] = useState(0);

  return (
    <div className="space-y-4">
      <Image
        src={images[current]}
        alt="hero image"
        width={1000}
        height={1000}
        className="min-h-[300px] object-cover object-center rounded-lg"
      />
      <div className="flex">
        {images.map((image, index) => (
          <div
            key={image}
            className={cn(
              'border me-2 cursor-pointer rounded hover:border-primary',
              current === index && 'border-primary'
            )}
            onClick={() => setCurrent(index)}
          >
            <Image src={image} alt="image" width={100} height={100} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductImages;
