import { Service } from 'typedi';
import User from '../../models/User';
import Product from '../../models/Product';
import Payment from '../../models/Payment';
import Category from '../../models/Category';
import Subcategory from '../../models/Subcategory';
import { startOfDay, endOfDay, subDays } from 'date-fns';

@Service()
export class DashboardService {
    async getStats() {
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);

        const [
            totalUsers,
            productStats,
            totalCategories,
            totalSubcategories,
            todayRevenue,
            recentProducts,
            revenueStats
        ] = await Promise.all([
            User.countDocuments({ userRole: 'user' }),
            Product.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            Category.countDocuments(),
            Subcategory.countDocuments(),
            Payment.aggregate([
                {
                    $match: {
                        status: 'captured',
                        createdAt: { $gte: todayStart, $lte: todayEnd }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]),
            Product.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('category', 'name')
                .populate('subcategory', 'name')
                .populate('seller', 'firstName lastName'),
            this.getRevenueAnalysis(7)
        ]);

        // Transform product stats into a cleaner object
        const productsByStatus = {
            pending: 0,
            approved: 0,
            rejected: 0,
            sold: 0,
            inactive: 0,
            total: 0
        };

        productStats.forEach(stat => {
            if (stat._id in productsByStatus) {
                productsByStatus[stat._id as keyof typeof productsByStatus] = stat.count;
            }
            productsByStatus.total += stat.count;
        });

        return {
            users: {
                total: totalUsers
            },
            products: productsByStatus,
            categories: {
                total: totalCategories
            },
            subcategories: {
                total: totalSubcategories
            },
            revenue: {
                today: todayRevenue[0]?.total || 0,
                analysis: revenueStats
            },
            recentProducts
        };
    }

    private async getRevenueAnalysis(days: number) {
        const analysis = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const start = startOfDay(date);
            const end = endOfDay(date);

            const result = await Payment.aggregate([
                {
                    $match: {
                        status: 'captured',
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]);

            analysis.push({
                date: start.toISOString().split('T')[0],
                revenue: result[0]?.total || 0
            });
        }
        return analysis;
    }
}
