import { Service } from 'typedi';
import User from '../../models/User';

const MAX_FCM_TOKENS = 10;

@Service()
export class UserService {
  public async getProfile(userId: string) {
    return User.findById(userId).populate('profileImage');
  }

  public async updateProfile(userId: string, data: any) {
    return User.findByIdAndUpdate(userId, data, { new: true }).populate('profileImage');
  }

  /** Register device token for Firebase push (chat). Removes token from other users if reused. */
  public async registerFcmToken(userId: string, token: string, deviceType?: 'android' | 'ios' | 'web') {
    await User.updateMany(
      { _id: { $ne: userId }, 'fcmTokens.token': token },
      { $pull: { fcmTokens: { token } } }
    );

    await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { token } } });

    await User.updateOne(
      { _id: userId },
      {
        $push: {
          fcmTokens: {
            $each: [{ token, deviceType, updatedAt: new Date() }],
            $position: 0,
            $slice: MAX_FCM_TOKENS,
          },
        },
      }
    );

    return User.findById(userId).select('fcmTokens').lean();
  }

  public async removeFcmToken(userId: string, token: string) {
    await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { token } } });
    return { ok: true };
  }
}
