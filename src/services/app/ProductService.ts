import { Service } from 'typedi';
import Product from '../../models/Product';
import Subcategory from '../../models/Subcategory';

@Service()
export class ProductService {
  public async getProducts(filters: { categoryId?: string; subcategoryId?: string; search?: string }) {
    const query: any = { status: 'approved' }; // Only show approved products to general users

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

    return products;
  }

  public async getProductById(id: string) {
    return Product.findById(id)
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

  public async createProduct(userId: string, data: any) {
    // 1. Validate custom fields if subcategory is provided
    if (data.subcategory) {
      const subcategory = await Subcategory.findById(data.subcategory);
      if (subcategory && subcategory.customFieldDefinitions) {
        const customFields = data.customFields || {};
        for (const field of subcategory.customFieldDefinitions) {
          const value = customFields[field.key];

          // Check required
          if (field.isRequired && (value === undefined || value === null || value === '')) {
            throw new Error(`Custom field "${field.label}" is required.`);
          }

          // Basic type validation (could be more extensive)
          if (value !== undefined && value !== null) {
            if (field.fieldType === 'number' && isNaN(Number(value))) {
              throw new Error(`Custom field "${field.label}" must be a number.`);
            }
            if (field.fieldType === 'boolean' && typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
              throw new Error(`Custom field "${field.label}" must be a boolean.`);
            }
            if (field.fieldType === 'select' && field.options && !field.options.includes(value)) {
              throw new Error(`Custom field "${field.label}" must be one of: ${field.options.join(', ')}.`);
            }
          }
        }
      }
    }

    const product = new Product({
      ...data,
      seller: userId,
      status: 'pending' // Always start as pending when created by user
    });

    await product.save();
    return product;
  }

  public async listSellerProducts(userId: string) {
    return Product.find({ seller: userId })
      .populate({
        path: 'category',
        populate: { path: 'media' }
      })
      .populate({
        path: 'subcategory',
        populate: { path: 'media' }
      })
      .populate('media')
      .sort({ createdAt: -1 });
  }

  public async updateProductStatus(productId: string, status: 'pending' | 'approved' | 'rejected' | 'sold' | 'inactive') {
    return Product.findByIdAndUpdate(productId, { status }, { new: true });
  }
}

