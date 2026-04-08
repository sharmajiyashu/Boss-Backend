import { Service } from 'typedi';
import SubscriptionPlan from '../../models/SubscriptionPlan';
import UserSubscription from '../../models/UserSubscription';
import Razorpay from 'razorpay';
import config from '../../config';
import { addDays, addMonths } from 'date-fns';

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

    const order = await this.razorpay.orders.create({
      amount: plan.price * 100, // in paise
      currency: 'INR',
      receipt: `sub_${userId}_${Date.now()}`,
    });

    return order;
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

    return subscription;
  }
}
