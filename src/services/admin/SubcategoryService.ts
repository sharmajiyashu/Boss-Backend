import { Service } from 'typedi';
import mongoose from 'mongoose';
import Subcategory, { IFieldDefinition, ISubcategory } from '../../models/Subcategory';
import Product from '../../models/Product';
import { IPagination, IPaginatedResponse } from '../../interfaces';
import AppLogger from '../../api/loaders/logger';

function sortCustomFieldDefinitions(fields?: IFieldDefinition[]): IFieldDefinition[] | undefined {
    if (!fields?.length) return fields;
    return [...fields].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function withSortedCustomFields<T extends { customFieldDefinitions?: IFieldDefinition[] }>(item: T): T {
    if (!item.customFieldDefinitions?.length) return item;
    return {
        ...item,
        customFieldDefinitions: sortCustomFieldDefinitions(item.customFieldDefinitions),
    };
}

function normalizeCustomFieldDefinitions(fields?: IFieldDefinition[]): IFieldDefinition[] | undefined {
    if (!fields) return fields;
    return fields.map((field, index) => ({
        ...field,
        sortOrder: field.sortOrder ?? index,
    }));
}

@Service()
export class SubcategoryService {
    constructor() { }

    /**
     * For each item with `_id`, set `productCount` = available products in that subcategory
     * (status approved and stock greater than zero).
     */
    public async attachAvailableProductCounts<T extends { _id: mongoose.Types.ObjectId | string }>(
        items: T[]
    ): Promise<Array<T & { productCount: number }>> {
        if (!items.length) {
            return items.map((item) => ({ ...item, productCount: 0 }));
        }
        const ids = items.map((i) => new mongoose.Types.ObjectId(String(i._id)));
        const counts = await Product.aggregate<{ _id: mongoose.Types.ObjectId; productCount: number }>([
            {
                $match: {
                    status: 'approved',
                    subcategory: { $in: ids },
                },
            },
            { $group: { _id: '$subcategory', productCount: { $sum: 1 } } },
        ]);
        const map = new Map(counts.map((c) => [c._id.toString(), c.productCount]));
        return items.map((item) => ({
            ...item,
            productCount: map.get(String(item._id)) ?? 0,
        }));
    }

    /**
     * Create a subcategory.
     */
    public async createSubcategory(data: Partial<ISubcategory>): Promise<ISubcategory> {
        try {
            const payload = {
                ...data,
                customFieldDefinitions: normalizeCustomFieldDefinitions(data.customFieldDefinitions),
            };
            if (payload.category) {
                const catStr = String(payload.category);
                if (catStr === '' || catStr === 'null' || catStr === 'undefined') {
                    delete payload.category;
                }
            }
            const subcategory = await Subcategory.create(payload);
            const populatedSubcategory = await subcategory.populate(['media', { path: 'category', populate: 'media' }]);
            AppLogger.info(`✌️ Subcategory ${populatedSubcategory.name} created successfully.`);
            return withSortedCustomFields(populatedSubcategory.toObject()) as ISubcategory;
        } catch (error) {
            AppLogger.error('❌ Error creating subcategory:', error);
            throw error;
        }
    }

    /**
     * List subcategories with optional pagination and population.
     */
    public async getSubcategories(
        pagination: IPagination,
        filters: { status?: string; search?: string; category?: string } = {},
        options: { includeProductCount?: boolean } = {}
    ): Promise<IPaginatedResponse<ISubcategory | (ISubcategory & { productCount: number })>> {
        try {
            const { page, limit } = pagination;
            const skip = (page - 1) * limit;

            const query: any = {};
            if (filters.status) query.status = filters.status;
            if (filters.category) query.category = filters.category;
            if (filters.search) query.name = { $regex: filters.search, $options: 'i' };

            const [rawData, total] = await Promise.all([
                Subcategory.find(query)
                    .populate('media')
                    .populate({
                        path: 'category',
                        select: 'name media',
                        populate: { path: 'media' }
                    }) // Populate Category name and media
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                Subcategory.countDocuments(query)
            ]);

            const data = options.includeProductCount
                ? (await this.attachAvailableProductCounts(rawData.map((doc) => doc.toObject()))) as unknown as (ISubcategory & { productCount: number })[]
                : rawData.map((doc) => withSortedCustomFields(doc.toObject()) as ISubcategory);

            const totalPages = Math.ceil(total / limit);

            return {
                data,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            };
        } catch (error) {
            AppLogger.error('❌ Error fetching subcategories:', error);
            throw error;
        }
    }

    /**
     * Update a subcategory by ID.
     */
    public async updateSubcategory(id: string, data: Partial<ISubcategory>): Promise<ISubcategory | null> {
        try {
            const payload = data.customFieldDefinitions
                ? {
                    ...data,
                    customFieldDefinitions: normalizeCustomFieldDefinitions(data.customFieldDefinitions),
                }
                : data;
            if (payload.category) {
                const catStr = String(payload.category);
                if (catStr === '' || catStr === 'null' || catStr === 'undefined') {
                    // @ts-ignore
                    payload.category = null;
                }
            } else if ((payload as any).category === null || (payload as any).category === '') {
                // @ts-ignore
                payload.category = null;
            }
            const updatedSubcategory = await Subcategory.findByIdAndUpdate(id, payload, { new: true })
                .populate(['media', { path: 'category', populate: 'media' }]);
            if (!updatedSubcategory) {
                AppLogger.warn(`⚠️ Subcategory ${id} not found for update.`);
                return null;
            }
            AppLogger.info(`✌️ Subcategory ${id} updated successfully.`);
            return withSortedCustomFields(updatedSubcategory.toObject()) as ISubcategory;
        } catch (error) {
            AppLogger.error(`❌ Error updating subcategory ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a subcategory by ID.
     */
    public async deleteSubcategory(id: string): Promise<boolean> {
        try {
            const result = await Subcategory.findByIdAndDelete(id);
            if (!result) {
                AppLogger.warn(`⚠️ Subcategory ${id} not found for deletion.`);
                return false;
            }
            AppLogger.info(`✌️ Subcategory ${id} deleted successfully.`);
            return true;
        } catch (error) {
            AppLogger.error(`❌ Error deleting subcategory ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get a single subcategory by ID.
     */
    public async getSubcategoryById(id: string): Promise<ISubcategory | null> {
        const subcategory = await Subcategory.findById(id).populate('media').populate({
            path: 'category',
            select: 'name media',
            populate: { path: 'media' }
        });
        return subcategory ? withSortedCustomFields(subcategory.toObject()) as ISubcategory : null;
    }
}
