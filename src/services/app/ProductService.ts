import { Service } from 'typedi';
import Product from '../../models/Product';

@Service()
export class ProductService {
  public async getProducts(filters: { categoryId?: string; subcategoryId?: string; search?: string }) {
    const query: any = { status: 'active' };

    if (filters.categoryId) {
      query.category = filters.categoryId;
    }

    if (filters.subcategoryId) {
      query.subcategory = filters.subcategoryId;
    }

    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    const products = await Product.find(query)
      .populate('category')
      .populate('subcategory')
      .populate('seller', 'firstName lastName email')
      .populate('media');

    return products;
  }

  public async getProductById(id: string) {
    return Product.findById(id)
      .populate('category')
      .populate('subcategory')
      .populate('seller', 'firstName lastName email')
      .populate('media');
  }
}
