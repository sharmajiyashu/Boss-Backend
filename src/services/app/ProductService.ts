import { Service } from 'typedi';
import mongoose from 'mongoose';
import Product from '../../models/Product';
import Subcategory from '../../models/Subcategory';
import { NotificationService } from '../common/NotificationService';
import Container from 'typedi';


import User from '../../models/User';
import AppSetting from '../../models/AppSetting';
import City from '../../models/City';
import Category from '../../models/Category';
import State from '../../models/State';
import Country from '../../models/Country';
import AppLogger from '../../api/loaders/logger';

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
  city?: string;
  cityId?: string;
  stateId?: string;
  countryId?: string;
  locationRangeId?: string;
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
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildTextRegex(term: string) {
    return { $regex: this.escapeRegex(term), $options: 'i' };
  }

  private async buildSearchOrConditions(term: string): Promise<any[]> {
    const regex = this.buildTextRegex(term);
    const orConditions: any[] = [];

    orConditions.push({ name: regex });
    orConditions.push({ description: regex });

    const [categoryIds, subcategoryIds] = await Promise.all([
      Category.find({ name: regex }).distinct('_id'),
      Subcategory.find({ name: regex }).distinct('_id'),
    ]);

    if (categoryIds.length) {
      orConditions.push({ category: { $in: categoryIds }, categoryModel: 'Category' });
    }
    if (subcategoryIds.length) {
      orConditions.push({ category: { $in: subcategoryIds }, categoryModel: 'Subcategory' });
      orConditions.push({ subcategory: { $in: subcategoryIds } });
    }

    orConditions.push({ 'location.city': regex });
    orConditions.push({ 'location.state': regex });

    const cityNames = await City.find({ name: regex, isActive: true }).distinct('name');
    if (cityNames.length) {
      orConditions.push({ 'location.city': { $in: cityNames } });
    }

    const states = await State.find({ name: regex, isActive: true }).select('_id name');
    if (states.length) {
      orConditions.push({ 'location.state': { $in: states.map(s => s.name) } });
      const stateIds = states.map(s => s._id);
      const citiesInStates = await City.find({ stateId: { $in: stateIds }, isActive: true }).distinct('name');
      if (citiesInStates.length) {
        orConditions.push({ 'location.city': { $in: citiesInStates } });
      }
    }

    const countries = await Country.find({ name: regex, isActive: true }).select('_id');
    if (countries.length) {
      const countryIds = countries.map(c => c._id);
      const [stateNames, citiesInCountries] = await Promise.all([
        State.find({ countryId: { $in: countryIds }, isActive: true }).distinct('name'),
        City.find({ countryId: { $in: countryIds }, isActive: true }).distinct('name'),
      ]);
      if (stateNames.length) {
        orConditions.push({ 'location.state': { $in: stateNames } });
      }
      if (citiesInCountries.length) {
        orConditions.push({ 'location.city': { $in: citiesInCountries } });
      }
    }

    return orConditions;
  }

  private appendAndCondition(query: Record<string, any>, condition: Record<string, any>): void {
    if (!query.$and) {
      query.$and = [];
      if (query.$or) {
        query.$and.push({ $or: query.$or });
        delete query.$or;
      }
    }
    query.$and.push(condition);
  }

  private async applyLocationIdFilters(
    query: Record<string, any>,
    filters: { cityId?: string; stateId?: string; countryId?: string },
    geoRange?: { maxInMeters?: number }
  ): Promise<{ sortLat?: number; sortLng?: number }> {
    const { cityId, stateId, countryId } = filters;

    if (cityId && cityId !== '') {
      const cityDoc = await City.findById(cityId);
      if (!cityDoc) {
        this.appendAndCondition(query, { _id: { $in: [] } });
        return {};
      }

      const cityOr: any[] = [
        { 'location.city': { $regex: new RegExp(`^${this.escapeRegex(cityDoc.name)}$`, 'i') } },
      ];

      if (geoRange?.maxInMeters && cityDoc.latitude !== undefined && cityDoc.longitude !== undefined) {
        cityOr.push({
          geometry: {
            $geoWithin: {
              $centerSphere: [
                [cityDoc.longitude, cityDoc.latitude],
                geoRange.maxInMeters / 1000 / 6378.1,
              ],
            },
          },
        });
      }

      this.appendAndCondition(query, cityOr.length === 1 ? cityOr[0] : { $or: cityOr });
      return { sortLat: cityDoc.latitude, sortLng: cityDoc.longitude };
    }

    if (stateId && stateId !== '') {
      const stateDoc = await State.findById(stateId);
      if (!stateDoc) {
        this.appendAndCondition(query, { _id: { $in: [] } });
        return {};
      }

      const stateOr: any[] = [
        { 'location.state': { $regex: new RegExp(`^${this.escapeRegex(stateDoc.name)}$`, 'i') } },
      ];
      const cityNames = await City.find({ stateId: stateDoc._id, isActive: true }).distinct('name');
      if (cityNames.length) {
        stateOr.push({ 'location.city': { $in: cityNames } });
      }

      this.appendAndCondition(query, stateOr.length === 1 ? stateOr[0] : { $or: stateOr });
      return {};
    }

    if (countryId && countryId !== '') {
      const countryDoc = await Country.findById(countryId);
      if (!countryDoc) {
        this.appendAndCondition(query, { _id: { $in: [] } });
        return {};
      }

      const [stateNames, cityNames] = await Promise.all([
        State.find({ countryId: countryDoc._id, isActive: true }).distinct('name'),
        City.find({ countryId: countryDoc._id, isActive: true }).distinct('name'),
      ]);

      const countryOr: any[] = [];
      if (stateNames.length) countryOr.push({ 'location.state': { $in: stateNames } });
      if (cityNames.length) countryOr.push({ 'location.city': { $in: cityNames } });

      if (!countryOr.length) {
        this.appendAndCondition(query, { _id: { $in: [] } });
      } else {
        this.appendAndCondition(query, countryOr.length === 1 ? countryOr[0] : { $or: countryOr });
      }
    }

    return {};
  }

  private async applyProductSearchFilters(query: Record<string, any>, search?: string): Promise<void> {
    const searchTerm = search?.trim();
    if (!searchTerm) return;

    const orConditions = await this.buildSearchOrConditions(searchTerm);
    Object.assign(query, orConditions.length ? { $or: orConditions } : { _id: { $in: [] } });
  }

  public async getProducts(filters: IProductFilters, userId?: string): Promise<IPaginatedProducts> {
    AppLogger.info('--- getProducts API Request ---');
    AppLogger.info('Filters received:', filters);
    AppLogger.info('User ID received:', userId);

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
      city,
      cityId,
      stateId,
      countryId,
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

    await this.applyProductSearchFilters(query, search);

    let isSortingByDistance = false;

    let minInMeters = 0;
    let maxInMeters: number | undefined = undefined;

    const settings = await AppSetting.findOne();
    const hasExplicitDistanceFilter =
      !!(locationRangeId || (radius !== undefined && radius !== null && (radius as any) !== '' && Number(radius) > 0));

    if (locationRangeId) {
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

    const hasLocationIdFilter = !!(
      (cityId && cityId !== '') ||
      (stateId && stateId !== '') ||
      (countryId && countryId !== '')
    );

    const geoRangeForFilter =
      locationRangeId || (radius !== undefined && radius !== null && (radius as any) !== '' && Number(radius) > 0)
        ? { maxInMeters }
        : undefined;

    const { sortLat: locationSortLat, sortLng: locationSortLng } = await this.applyLocationIdFilters(
      query,
      { cityId, stateId, countryId },
      hasLocationIdFilter && cityId ? geoRangeForFilter : undefined
    );

    let searchLat: number | undefined = locationSortLat;
    let searchLng: number | undefined = locationSortLng;

    // Legacy city name param — coordinates only when no cityId/stateId/countryId
    if (!hasLocationIdFilter && city && city !== '') {
      let cityDoc;
      if (mongoose.Types.ObjectId.isValid(city)) {
        cityDoc = await City.findById(city);
      } else {
        cityDoc = await City.findOne({ name: { $regex: new RegExp(`^${city}$`, 'i') }, isActive: true });
      }
      if (cityDoc) {
        searchLat = cityDoc.latitude;
        searchLng = cityDoc.longitude;
      }
    }

    // Default: sort by user location when no location ID filter
    if (!hasLocationIdFilter && (searchLat === undefined || searchLng === undefined)) {
      if (lat !== undefined && lat !== null && (lat as any) !== '' && lng !== undefined && lng !== null && (lng as any) !== '') {
        searchLat = Number(lat);
        searchLng = Number(lng);
      } else if (userId) {
        const user = await User.findById(userId).select('location addresses');

        if (user?.location?.city) {
          const userCityDoc = await City.findOne({ name: { $regex: new RegExp(`^${user.location.city}$`, 'i') }, isActive: true });
          if (userCityDoc) {
            searchLat = userCityDoc.latitude;
            searchLng = userCityDoc.longitude;
          }
        }

        if (searchLat === undefined || searchLng === undefined) {
          if (user?.location?.lat !== undefined && user?.location?.lng !== undefined) {
            searchLat = user.location.lat;
            searchLng = user.location.lng;
          } else if (user?.addresses && user.addresses.length > 0) {
            const defaultAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
            if (defaultAddress?.lat !== undefined && defaultAddress?.lng !== undefined) {
              searchLat = defaultAddress.lat;
              searchLng = defaultAddress.lng;
            }
          }
        }
      }
    }

    // Distance sort only when browsing without city/state/country ID filters
    if (!hasLocationIdFilter && searchLat !== undefined && searchLng !== undefined) {
      isSortingByDistance = true;

      const nearQuery: any = {
        $geometry: {
          type: 'Point',
          coordinates: [searchLng, searchLat]
        }
      };

      const useDefaultNearby =
        !hasExplicitDistanceFilter &&
        !hasLocationIdFilter &&
        settings?.defaultNearbyEnabled === true &&
        settings.defaultNearbyDistanceKm > 0;

      const shouldApplyDistanceFilter = hasExplicitDistanceFilter || useDefaultNearby;

      if (shouldApplyDistanceFilter) {
        if (useDefaultNearby && maxInMeters === undefined) {
          maxInMeters = settings!.defaultNearbyDistanceKm * 1000;
        }
        if (minInMeters > 0) {
          nearQuery.$minDistance = minInMeters;
        }
        if (maxInMeters !== undefined) {
          nearQuery.$maxDistance = maxInMeters;
        }
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

    // If category is not provided/null but subcategory is provided, resolve the category from the subcategory
    if ((data.category === undefined || data.category === null || data.category === '') && data.subcategory) {
      const sub = await Subcategory.findById(data.subcategory);
      if (sub) {
        if (sub.category) {
          data.category = sub.category;
          data.categoryModel = 'Category';
        } else {
          // If the subcategory doesn't have a parent category, it acts as a main category
          data.category = sub._id;
          data.categoryModel = 'Subcategory';
          data.subcategory = undefined;
        }
      }
    } else if (data.category) {
      // Check if category points to a parentless Subcategory (so it acts as a Main Category)
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
    // If category is not provided/null but subcategory is provided, resolve the category from the subcategory
    if ((data.category === undefined || data.category === null || data.category === '') && data.subcategory) {
      const sub = await Subcategory.findById(data.subcategory);
      if (sub) {
        if (sub.category) {
          data.category = sub.category;
          data.categoryModel = 'Category';
        } else {
          // If the subcategory doesn't have a parent category, it acts as a main category
          data.category = sub._id;
          data.categoryModel = 'Subcategory';
          data.subcategory = undefined;
        }
      }
    } else if (data.category) {
      // Check if category points to a parentless Subcategory
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

  public async deleteProduct(productId: string) {
    return Product.findByIdAndDelete(productId);
  }
}


