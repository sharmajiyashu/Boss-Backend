import { Service } from 'typedi';
import User from '../../models/User';
import Report from '../../models/Report';

@Service()
export class UserActionService {
  public async reportUser(reporterId: string, data: { targetUserId?: string; targetProductId?: string; reason: string; description?: string }) {
    return Report.create({
      reporter: reporterId,
      targetUser: data.targetUserId,
      targetProduct: data.targetProductId,
      reason: data.reason,
      description: data.description
    });
  }

  public async blockUser(userId: string, targetUserId: string) {
    return User.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: targetUserId }
    }, { new: true });
  }

  public async unblockUser(userId: string, targetUserId: string) {
    return User.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: targetUserId }
    }, { new: true });
  }
}
