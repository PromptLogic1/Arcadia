import { createClient } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import type { ProductRow } from '@/src/types/product.types';
import type { QueryResultRow } from '@vercel/postgres';

export async function generateStaticParams() {
  try {
    // Skip static generation if no database connection is available
    if (!process.env.POSTGRES_URL_NON_POOLING && !process.env.POSTGRES_URL) {
      console.log('No PostgreSQL connection available during build, skipping static generation');
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
    console.log('Failed to fetch products for static generation:', error);
    // Return empty array to skip static generation
    return [];
  }
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
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
    console.error('Database connection error:', error);
    return <div>Unable to load product. Please try again later.</div>;
  }
}

// Add on-demand revalidation
export async function revalidateProduct(slug: string) {
  revalidatePath(`/products/${slug}`);
}
