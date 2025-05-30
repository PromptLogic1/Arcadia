export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
}

export interface ProductFeature {
  id: string;
  name: string;
  description: string;
  productId: string;
}
