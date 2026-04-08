import { Service } from 'typedi';
import User from '../../models/User';

@Service()
export class UserService {
  public async getProfile(userId: string) {
    return User.findById(userId).populate('profileImage');
  }

  public async updateProfile(userId: string, data: any) {
    return User.findByIdAndUpdate(userId, data, { new: true }).populate('profileImage');
  }
}
