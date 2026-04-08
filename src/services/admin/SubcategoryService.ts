import { Service } from 'typedi';
import Subcategory, { ISubcategory } from '../../models/Subcategory';
import { IPagination, IPaginatedResponse } from '../../interfaces';
import AppLogger from '../../api/loaders/logger';

@Service()
export class SubcategoryService {
    constructor() { }

    /**
     * Create a subcategory.
     */
    public async createSubcategory(data: Partial<ISubcategory>): Promise<ISubcategory> {
        try {
            const subcategory = await Subcategory.create(data);
            const populatedSubcategory = await subcategory.populate(['media', { path: 'category', populate: 'media' }]);
            AppLogger.info(`✌️ Subcategory ${populatedSubcategory.name} created successfully.`);
            return populatedSubcategory;
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
        filters: { status?: string; search?: string; category?: string } = {}
    ): Promise<IPaginatedResponse<ISubcategory>> {
        try {
            const { page, limit } = pagination;
            const skip = (page - 1) * limit;

            const query: any = {};
            if (filters.status) query.status = filters.status;
            if (filters.category) query.category = filters.category;
            if (filters.search) query.name = { $regex: filters.search, $options: 'i' };

            const [data, total] = await Promise.all([
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
            const updatedSubcategory = await Subcategory.findByIdAndUpdate(id, data, { new: true })
                .populate(['media', { path: 'category', populate: 'media' }]);
            if (!updatedSubcategory) {
                AppLogger.warn(`⚠️ Subcategory ${id} not found for update.`);
                return null;
            }
            AppLogger.info(`✌️ Subcategory ${id} updated successfully.`);
            return updatedSubcategory;
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
        return Subcategory.findById(id).populate('media').populate({
            path: 'category',
            select: 'name media',
            populate: { path: 'media' }
        });
    }
}
