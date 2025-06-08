import { createClient } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { notFound as _notFound } from 'next/navigation';
import type { ProductRow } from '@/src/types/product-types';
import type { QueryResultRow } from '@vercel/postgres';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import { log } from '@/lib/logger';

export async function generateStaticParams() {
  try {
    // Skip static generation if no database connection is available
    if (!process.env.POSTGRES_URL_NON_POOLING && !process.env.POSTGRES_URL) {
      log.info('No PostgreSQL connection available during build', {
        metadata: {
          page: 'products',
          method: 'generateStaticParams',
          action: 'skipping static generation',
        },
      });
      return [];
    }

    const client = createClient();
    const { rows } = await client.sql<QueryResultRow & { slug: string }>`
      SELECT slug FROM products
    `;
    return rows.map(row => ({
      slug: row.slug,
    }));
  } catch (error) {
    log.info('Failed to fetch products for static generation', {
      metadata: {
        page: 'products',
        method: 'generateStaticParams',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    // Return empty array to skip static generation
    return [];
  }
}

async function ProductContent({ params }: { params: { slug: string } }) {
  try {
    const client = createClient();
    const { rows } = await client.sql<ProductRow>`
      SELECT * FROM products WHERE slug = ${params.slug}
    `;
    const product = rows[0];

    if (!product) {
      return <div>Product not found</div>;
    }

    return (
      <div>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <p>Price: ${product.price}</p>
      </div>
    );
  } catch (error) {
    log.error('Database connection error', error, {
      metadata: {
        page: 'products',
        method: 'ProductContent',
        slug: params.slug,
      },
    });
    return <div>Unable to load product. Please try again later.</div>;
  }
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  return (
    <RouteErrorBoundary routeName={`Product-${params.slug}`}>
      <ProductContent params={params} />
    </RouteErrorBoundary>
  );
}

// Add on-demand revalidation
export async function revalidateProduct(slug: string) {
  revalidatePath(`/products/${slug}`);
}
