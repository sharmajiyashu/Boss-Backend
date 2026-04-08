import { Service } from 'typedi';
import Product from '../../models/Product';
import { IProductFilters, IPaginatedProducts } from '../app/ProductService';

@Service()
export class AdminProductService {
  public async listAllProducts(filters: IProductFilters): Promise<IPaginatedProducts> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.categoryId) {
      query.category = filters.categoryId;
    }

    if (filters.subcategoryId) {
      query.subcategory = filters.subcategoryId;
    }

    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate({
          path: 'category',
          populate: { path: 'media' }
        })
        .populate({
          path: 'subcategory',
          populate: { path: 'media' }
        })
        .populate('seller', 'firstName lastName email')
        .populate('media')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query)
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  public async approveProduct(productId: string) {
    return Product.findByIdAndUpdate(productId, { status: 'approved' }, { new: true });
  }

  public async rejectProduct(productId: string) {
    return Product.findByIdAndUpdate(productId, { status: 'rejected' }, { new: true });
  }
}
