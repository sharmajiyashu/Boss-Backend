import { Service } from 'typedi';
import Product from '../../models/Product';
import Subcategory from '../../models/Subcategory';


import User from '../../models/User';


export interface IProductFilters {
  categoryId?: string;
  subcategoryId?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface IPaginatedProducts {
  products: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Service()
export class ProductService {
  public async getProducts(filters: IProductFilters): Promise<IPaginatedProducts> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

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
    // Check if user is verified, premium, or has paid platform fee
    const user = await User.findById(userId);
    if (!user?.isVerified && !user?.isPremium && !user?.isPlatformPaid) {
      throw new Error('Please verify your Aadhaar, purchase a subscription, or pay the platform fee to list products.');
    }

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

  public async listSellerProducts(userId: string, filters: IProductFilters): Promise<IPaginatedProducts> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query: any = { seller: userId };

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

  public async updateProductStatus(productId: string, status: 'pending' | 'approved' | 'rejected' | 'sold' | 'inactive') {
    return Product.findByIdAndUpdate(productId, { status }, { new: true });
  }
}

