import { Service } from 'typedi';
import Product from '../../models/Product';
import Subcategory from '../../models/Subcategory';
import { NotificationService } from '../common/NotificationService';
import Container from 'typedi';


import User from '../../models/User';
import AppSetting from '../../models/AppSetting';


export interface IProductFilters {
  categoryId?: string;
  subcategoryId?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radius?: number; // In KM
  [key: string]: any;
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
  public async getProducts(filters: IProductFilters, userId?: string): Promise<IPaginatedProducts> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const {
      page: _p,
      limit: _l,
      categoryId,
      subcategoryId,
      search,
      status,
      lat,
      lng,
      radius,
      locationRangeId,
      minPrice,
      maxPrice,
      addressId: _addressId,
      saveToAddresses: _saveToAddresses,
      label: _label,
      ...customFilters
    } = filters;

    const query: any = { status: status || 'approved' }; // Default to approved for public, but allow status filter

    if (categoryId && categoryId !== '') {
      query.category = categoryId;
    }

    if (subcategoryId && subcategoryId !== '') {
      query.subcategory = subcategoryId;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let isSortingByDistance = false;
    let searchLat: number | undefined;
    let searchLng: number | undefined;

    let minInMeters = 0;
    let maxInMeters: number | undefined = undefined;

    if (locationRangeId) {
      const settings = await AppSetting.findOne();
      const range = settings?.locationRanges?.find(r => r.id === locationRangeId);
      if (range) {
        minInMeters = range.min * 1000;
        maxInMeters = range.max * 1000;
      }
    } else if (radius !== undefined && radius !== null && (radius as any) !== '') {
      const searchRadiusKm = Number(radius);
      if (searchRadiusKm > 0) {
        maxInMeters = searchRadiusKm * 1000;
      }
    }

    if (lat !== undefined && lat !== null && (lat as any) !== '' && lng !== undefined && lng !== null && (lng as any) !== '') {
      searchLat = Number(lat);
      searchLng = Number(lng);
    } else if (userId) {
      const user = await User.findById(userId).select('location');
      if (user?.location?.lat !== undefined && user?.location?.lng !== undefined) {
        searchLat = user.location.lat;
        searchLng = user.location.lng;
      }
    }

    if (searchLat !== undefined && searchLng !== undefined) {
      isSortingByDistance = true;
      const nearQuery: any = {
        $geometry: {
          type: 'Point',
          coordinates: [searchLng, searchLat]
        }
      };
      if (minInMeters > 0) {
        nearQuery.$minDistance = minInMeters;
      }
      if (maxInMeters !== undefined) {
        nearQuery.$maxDistance = maxInMeters;
      }
      query.geometry = {
        $near: nearQuery
      };
    }

    if ((minPrice !== undefined && minPrice !== null && minPrice !== '') || 
        (maxPrice !== undefined && maxPrice !== null && maxPrice !== '')) {
      query.price = {};
      if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
        query.price.$lte = Number(maxPrice);
      }
    }

    // Handle Dynamic Custom Field Filters
    // These are any other query parameters passed in the filters object
    if (Object.keys(customFilters).length > 0) {
      for (const key in customFilters) {
        if (customFilters[key] !== undefined && customFilters[key] !== null && customFilters[key] !== '') {
          // If value is a string, handle multi-value or simple regex
          // Otherwise use exact match
          query[`customFields.${key}`] = customFilters[key];
        }
      }
    }

    // Prepare query for countDocuments, replacing/removing $near to avoid MongoDB driver errors
    const countQuery = { ...query };
    if (countQuery.geometry && countQuery.geometry.$near) {
      if (countQuery.geometry.$near.$maxDistance) {
        const maxDistanceMeters = countQuery.geometry.$near.$maxDistance;
        const radiusInKm = maxDistanceMeters / 1000;
        countQuery.geometry = {
          $geoWithin: {
            $centerSphere: [
              countQuery.geometry.$near.$geometry.coordinates,
              radiusInKm / 6378.1
            ]
          }
        };
      } else {
        delete countQuery.geometry;
      }
    }

    let mongooseQuery = Product.find(query)
      .populate({
        path: 'category',
        populate: { path: 'media' }
      })
      .populate({
        path: 'subcategory',
        populate: { path: 'media' }
      })
      .populate({
        path: 'seller',
        select: 'firstName lastName email profileImage location',
        populate: { path: 'profileImage' }
      })
      .populate('media');

    if (!isSortingByDistance) {
      mongooseQuery = mongooseQuery.sort({ createdAt: -1 });
    }

    const [products, total] = await Promise.all([
      mongooseQuery.skip(skip).limit(limit),
      Product.countDocuments(countQuery)
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
      .populate({
        path: 'seller',
        select: 'firstName lastName email profileImage location',
        populate: { path: 'profileImage' }
      })
      .populate('media');
  }

  public async createProduct(userId: string, data: any) {
    // Check if user is verified, premium, or has paid platform fee
    const user = await User.findById(userId);
    if (!user?.isVerified && !user?.isPremium && !user?.isPlatformPaid) {
      throw new Error('Please verify your Aadhaar, purchase a subscription, or pay the platform fee to list products.');
    }

    // Check if category points to a parentless Subcategory (so it acts as a Main Category)
    if (data.category) {
      const sub = await Subcategory.findById(data.category);
      if (sub && !sub.category) {
        data.categoryModel = 'Subcategory';
        data.subcategory = undefined; // Add directly to main category without subcategory
      } else {
        data.categoryModel = 'Category';
      }
    }

    // 1. Validate custom fields if subcategory or parentless category is provided
    let fieldSource = null;
    if (data.subcategory) {
      fieldSource = await Subcategory.findById(data.subcategory);
    } else if (data.category) {
      const sub = await Subcategory.findById(data.category);
      if (sub && !sub.category) {
        fieldSource = sub;
      }
    }

    if (fieldSource && fieldSource.customFieldDefinitions) {
      const customFields = data.customFields || {};
      for (const field of fieldSource.customFieldDefinitions) {
        const value = customFields[field.key];

        // Check required
        if (field.isRequired && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
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
          if (field.fieldType === 'select' && field.options) {
            if (!field.hasOtherOption && !field.options.includes(value)) {
              throw new Error(`Custom field "${field.label}" must be one of: ${field.options.join(', ')}.`);
            }
          }
          if (field.fieldType === 'multiselect' && field.options) {
            if (!field.hasOtherOption) {
              const values = Array.isArray(value) ? value : (value ? [value] : []);
              for (const val of values) {
                if (!field.options.includes(val)) {
                  throw new Error(`Custom field "${field.label}" must contain options from: ${field.options.join(', ')}.`);
                }
              }
            }
          }
        }
      }
    }

    if (data.id) {
      return this.updateProduct(userId, data.id, data);
    } else {
      // Create new product
      if (data.location?.lat !== undefined && data.location?.lng !== undefined) {
        data.geometry = {
          type: 'Point',
          coordinates: [Number(data.location.lng), Number(data.location.lat)]
        };
      }

      const product = new Product({
        ...data,
        seller: userId,
        status: 'pending' // Always start as pending when created by user
      });

      await product.save();

      // Notify admin for approval
      try {
        const notifService = Container.get(NotificationService);
        await notifService.createNotification({
          title: 'Pending Product Approval',
          message: `A product listing "${product.name}" has been created and is pending approval.`,
          recipient: 'admin',
          type: 'product_pending',
          metadata: { productId: product._id.toString(), sellerId: userId }
        });
      } catch (err) {
        // Silently ignore
      }

      return product;
    }
  }

  public async updateProduct(userId: string, productId: string, data: any) {
    // Check if category points to a parentless Subcategory
    if (data.category) {
      const sub = await Subcategory.findById(data.category);
      if (sub && !sub.category) {
        data.categoryModel = 'Subcategory';
        data.subcategory = undefined; // Update directly to main category without subcategory
      } else {
        data.categoryModel = 'Category';
      }
    }

    // 1. Validate custom fields if subcategory or parentless category is provided
    let fieldSource = null;
    if (data.subcategory) {
      fieldSource = await Subcategory.findById(data.subcategory);
    } else if (data.category) {
      const sub = await Subcategory.findById(data.category);
      if (sub && !sub.category) {
        fieldSource = sub;
      }
    }

    if (fieldSource && fieldSource.customFieldDefinitions) {
      const customFields = data.customFields || {};
      for (const field of fieldSource.customFieldDefinitions) {
        const value = customFields[field.key];

        // Check required
        if (field.isRequired && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
          throw new Error(`Custom field "${field.label}" is required.`);
        }

        // Basic type validation
        if (value !== undefined && value !== null) {
          if (field.fieldType === 'number' && isNaN(Number(value))) {
            throw new Error(`Custom field "${field.label}" must be a number.`);
          }
          if (field.fieldType === 'boolean' && typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
            throw new Error(`Custom field "${field.label}" must be a boolean.`);
          }
          if (field.fieldType === 'select' && field.options) {
            if (!field.hasOtherOption && !field.options.includes(value)) {
              throw new Error(`Custom field "${field.label}" must be one of: ${field.options.join(', ')}.`);
            }
          }
          if (field.fieldType === 'multiselect' && field.options) {
            if (!field.hasOtherOption) {
              const values = Array.isArray(value) ? value : (value ? [value] : []);
              for (const val of values) {
                if (!field.options.includes(val)) {
                  throw new Error(`Custom field "${field.label}" must contain options from: ${field.options.join(', ')}.`);
                }
              }
            }
          }
        }
      }
    }

    const product = await Product.findOne({ _id: productId, seller: userId });
    if (!product) {
      throw new Error('Product not found or unauthorized');
    }

    if (data.location?.lat !== undefined && data.location?.lng !== undefined) {
      data.geometry = {
        type: 'Point',
        coordinates: [Number(data.location.lng), Number(data.location.lat)]
      };
    }

    Object.assign(product, {
      ...data,
      status: 'pending' // Reset to pending (approval) on any update/edit
    });

    await product.save();

    // Notify admin for approval
    try {
      const notifService = Container.get(NotificationService);
      await notifService.createNotification({
        title: 'Pending Product Approval',
        message: `A product listing "${product.name}" has been updated and is pending approval.`,
        recipient: 'admin',
        type: 'product_pending',
        metadata: { productId: product._id.toString(), sellerId: userId }
      });
    } catch (err) {
      // Silently ignore
    }

    return product;
  }

  public async listSellerProducts(userId: string, filters: IProductFilters): Promise<IPaginatedProducts> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query: any = { seller: userId };

    const {
      page: _p,
      limit: _l,
      categoryId,
      subcategoryId,
      search,
      status,
      minPrice,
      maxPrice,
      ...customFilters
    } = filters;

    if (status) {
      query.status = status;
    }

    if (categoryId && categoryId !== '') {
      query.category = categoryId;
    }

    if (subcategoryId && subcategoryId !== '') {
      query.subcategory = subcategoryId;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if ((minPrice !== undefined && minPrice !== null && minPrice !== '') || 
        (maxPrice !== undefined && maxPrice !== null && maxPrice !== '')) {
      query.price = {};
      if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
        query.price.$lte = Number(maxPrice);
      }
    }

    if (Object.keys(customFilters).length > 0) {
      for (const key in customFilters) {
        if (customFilters[key] !== undefined && customFilters[key] !== null && customFilters[key] !== '') {
          query[`customFields.${key}`] = customFilters[key];
        }
      }
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
        .populate({
          path: 'seller',
          select: 'firstName lastName email profileImage location',
          populate: { path: 'profileImage' }
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

