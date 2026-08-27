import Image from 'next/image';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import ProductPrice from '@/components/product/product-price';
import type { Product } from '@/types';

const ProductCard = ({ product }: { product: Product }) => {
  const isFa = product.nameFa && product.nameFa.length > 0;
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="p-0 items-center">
        <Link href={`/product/${product.slug}`}>
          <Image
            priority={true}
            src={product.images[0]}
            alt={isFa ? product.nameFa : product.name}
            className="aspect-square object-cover rounded-t-lg"
            height={300}
            width={300}
          />
        </Link>
      </CardHeader>
      <CardContent className="p-4 grid gap-4">
        <div className="text-xs text-muted-foreground">
          {product.categoryFa} · {product.brand}
        </div>
        <Link href={`/product/${product.slug}`}>
          <h2 className="text-sm font-medium">{product.nameFa}</h2>
        </Link>
        <div className="flex-between gap-4">
          <p>{Number(product.rating)} ★</p>
          {product.stock > 0 ? (
            <ProductPrice value={Number(product.price)} />
          ) : (
            <p className="text-destructive">Out of Stock</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
