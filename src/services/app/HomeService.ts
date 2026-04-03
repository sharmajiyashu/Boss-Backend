import { Service } from 'typedi';
import Category from '../../models/Category';
import Subcategory from '../../models/Subcategory';
import User from '../../models/User';

@Service()
export class HomeService {
  public async getHomeData(userId?: string) {
    // 1. Fetch categories with media
    const categories = await Category.find({ status: 'active' }).populate('media').lean();

    // 2. Fetch subcategories with media and group them by category ID
    const subcategories = await Subcategory.find({ status: 'active' }).populate('media').lean();

    // Attach subcategories to categories
    const categoriesWithSubcategories = categories.map(category => ({
      ...category,
      subcategories: subcategories.filter(sub => sub.category.toString() === category._id.toString())
    }));

    // 3. Fetch some users
    const users = await User.find({ userRole: 'user' })
      .limit(10)
      .select('firstName lastName email mobile')
      .lean();

    // 4. Fetch the current user profile
    let currentUserProfile = null;
    if (userId) {
      currentUserProfile = await User.findById(userId).lean();
    }

    return {
      categories: categoriesWithSubcategories,
      users,
      currentUserProfile,
    };
  }
}
