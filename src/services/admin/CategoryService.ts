import { Service } from 'typedi';
import Category, { ICategory } from '../../models/Category';
import { IPagination, IPaginatedResponse } from '../../interfaces';
import AppLogger from '../../api/loaders/logger';

@Service()
export class CategoryService {
    constructor() { }

    /**
     * Create a category.
     */
    public async createCategory(data: Partial<ICategory>): Promise<ICategory> {
        try {
            const category = await Category.create(data);
            AppLogger.info(`✌️ Category ${category.name} created successfully.`);
            return category;
        } catch (error) {
            AppLogger.error('❌ Error creating category:', error);
            throw error;
        }
    }

    /**
     * List categories with optional pagination and population.
     */
    public async getCategories(
        pagination: IPagination,
        filters: { status?: string; search?: string } = {}
    ): Promise<IPaginatedResponse<ICategory>> {
        try {
            const { page, limit } = pagination;
            const skip = (page - 1) * limit;

            const query: any = {};
            if (filters.status) query.status = filters.status;
            if (filters.search) query.name = { $regex: filters.search, $options: 'i' };

            const [data, total] = await Promise.all([
                Category.find(query)
                    .populate('media')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                Category.countDocuments(query)
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
            AppLogger.error('❌ Error fetching categories:', error);
            throw error;
        }
    }

    /**
     * Update a category by ID.
     */
    public async updateCategory(id: string, data: Partial<ICategory>): Promise<ICategory | null> {
        try {
            const updatedCategory = await Category.findByIdAndUpdate(id, data, { new: true });
            if (!updatedCategory) {
                AppLogger.warn(`⚠️ Category ${id} not found for update.`);
                return null;
            }
            AppLogger.info(`✌️ Category ${id} updated successfully.`);
            return updatedCategory;
        } catch (error) {
            AppLogger.error(`❌ Error updating category ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a category by ID.
     */
    public async deleteCategory(id: string): Promise<boolean> {
        try {
            const result = await Category.findByIdAndDelete(id);
            if (!result) {
                AppLogger.warn(`⚠️ Category ${id} not found for deletion.`);
                return false;
            }
            AppLogger.info(`✌️ Category ${id} deleted successfully.`);
            return true;
        } catch (error) {
            AppLogger.error(`❌ Error deleting category ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get a single category by ID.
     */
    public async getCategoryById(id: string): Promise<ICategory | null> {
        return Category.findById(id).populate('media');
    }
}
