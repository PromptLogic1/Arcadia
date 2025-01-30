import { revalidateTag } from 'next/cache'

export async function generateStaticParams() {
  const products = await db.products.findMany()
  return products.map((product) => ({ slug: product.slug }))
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await db.products.findUnique({
    where: { slug: params.slug },
    tags: ['products'] // Add revalidation tag
  })
  
  return (
    // Existing page content...
  )
}

// Add on-demand revalidation
export async function revalidateProduct(slug: string) {
  revalidateTag('products')
  revalidatePath(`/products/${slug}`)
} 