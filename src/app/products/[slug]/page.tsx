import { createClient } from '@vercel/postgres'
import { revalidatePath } from 'next/cache'
import type { ProductRow } from '@/src/types/product.types'
import type { QueryResultRow } from '@vercel/postgres'

export async function generateStaticParams() {
  const client = createClient()
  const { rows } = await client.sql<QueryResultRow & { slug: string }>`
    SELECT slug FROM products
  `
  return rows.map((row) => ({
    slug: row.slug,
  }))
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const client = createClient()
  const { rows } = await client.sql<ProductRow>`
    SELECT * FROM products WHERE slug = ${params.slug}
  `
  const product = rows[0]

  if (!product) {
    return <div>Product not found</div>
  }

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>Price: ${product.price}</p>
    </div>
  )
}

// Add on-demand revalidation
export async function revalidateProduct(slug: string) {
  revalidatePath(`/products/${slug}`)
} 