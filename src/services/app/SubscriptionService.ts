import { Service } from 'typedi';
import SubscriptionPlan from '../../models/SubscriptionPlan';
import UserSubscription from '../../models/UserSubscription';
import Razorpay from 'razorpay';
import config from '../../config';
import { addDays, addMonths } from 'date-fns';
import AppSetting from '../../models/AppSetting';
import User from '../../models/User';

@Service()
export class SubscriptionService {
  private razorpay: any;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: (config as any).razorpay.keyId,
      key_secret: (config as any).razorpay.keySecret,
    });
  }

  public async getActivePlans() {
    return SubscriptionPlan.find({ isActive: true });
  }

  public async createOrder(planId: string, userId: string) {
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) throw new Error('Subscription plan not found');

    const settings = await AppSetting.findOne();
    const platformFees = settings?.platformFees || 0;

    // Check if it's the user's first subscription
    const subscriptionCount = await UserSubscription.countDocuments({ user: userId });
    
    let totalAmount = plan.price;
    if (subscriptionCount === 0) {
      totalAmount += platformFees;
    }

    const order = await this.razorpay.orders.create({
      amount: totalAmount * 100, // in paise
      currency: 'INR',
      receipt: `sub_${userId}_${Date.now()}`,
    });

    return {
      ...order,
      platformFees: subscriptionCount === 0 ? platformFees : 0,
      basePrice: plan.price
    };
  }

  public async verifyAndActivateSubscription(userId: string, data: { planId: string; razorpayPaymentId: string; razorpayOrderId: string }) {
    const plan = await SubscriptionPlan.findById(data.planId);
    if (!plan) throw new Error('Subscription plan not found');

    const expiryDate = plan.type === 'monthly' 
      ? addMonths(new Date(), 1) 
      : (plan.durationInDays > 0 ? addDays(new Date(), plan.durationInDays) : undefined);

    const subscription = await UserSubscription.create({
      user: userId,
      plan: data.planId,
      expiryDate,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpayOrderId: data.razorpayOrderId,
      status: 'active'
    });

    // Update user premium status
    await User.findByIdAndUpdate(userId, { isPremium: true });

    return subscription;
  }
}
