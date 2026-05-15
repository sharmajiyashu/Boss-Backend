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

  public async getLocation(userId: string) {
    const user = await User.findById(userId).select('location');
    return user?.location;
  }

  public async updateLocation(userId: string, locationData: any) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { location: locationData } },
      { new: true }
    ).select('location');
    return user?.location;
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
