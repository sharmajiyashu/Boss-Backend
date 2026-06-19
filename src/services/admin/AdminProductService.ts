import { Service } from 'typedi';
import Product from '../../models/Product';
import { IProductFilters, IPaginatedProducts } from '../app/ProductService';
import { NotificationService } from '../common/NotificationService';
import Container from 'typedi';

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
    const updatedProduct = await Product.findByIdAndUpdate(productId, { status: 'approved' }, { new: true });
    if (updatedProduct && updatedProduct.seller) {
      try {
        const notifService = Container.get(NotificationService);
        await notifService.createNotification({
          title: 'Product Approved',
          message: `Your product "${updatedProduct.name}" has been approved.`,
          recipient: updatedProduct.seller.toString(),
          type: 'product_approved',
          metadata: { productId }
        });
      } catch (err) {
        // Silently catch notification errors
      }
    }
    return updatedProduct;
  }

  public async rejectProduct(productId: string) {
    const updatedProduct = await Product.findByIdAndUpdate(productId, { status: 'rejected' }, { new: true });
    if (updatedProduct && updatedProduct.seller) {
      try {
        const notifService = Container.get(NotificationService);
        await notifService.createNotification({
          title: 'Product Rejected',
          message: `Your product "${updatedProduct.name}" has been rejected.`,
          recipient: updatedProduct.seller.toString(),
          type: 'product_rejected',
          metadata: { productId }
        });
      } catch (err) {
        // Silently catch notification errors
      }
    }
    return updatedProduct;
  }

  public async deleteProduct(productId: string): Promise<boolean> {
    const result = await Product.findByIdAndDelete(productId);
    return !!result;
  }

  public async deleteAllProducts(): Promise<boolean> {
    await Product.deleteMany({});
    return true;
  }

  public async updateProduct(productId: string, data: Partial<any>): Promise<any | null> {
    return Product.findByIdAndUpdate(productId, data, { new: true })
      .populate({
        path: 'category',
        populate: { path: 'media' }
      })
      .populate({
        path: 'subcategory',
        populate: { path: 'media' }
      })
      .populate('seller', 'firstName lastName email')
      .populate('media');
  }
}
