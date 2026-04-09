import { Service } from 'typedi';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import config from '../../config';
import User from '../../models/User';

@Service()
export class VerificationService {
  private generateJwt() {
    const payload = {
      partnerId: config.digiverification.partnerCode,
      timestamp: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, config.digiverification.tokenKey, { algorithm: 'HS256' });
  }

  public async sendOtp(userId: string, aadhaarNumber: string) {
    const token = this.generateJwt();
    try {
      const response = await axios.post(
        `${config.digiverification.baseUrl}/api/v5/aadhaar/send-otp`,
        { aadhaar_number: aadhaarNumber },
        {
          headers: {
            'jwt-token': token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      // The response usually contains a reference_id in data.data or similar
      const referenceId = response.data?.data?.reference_id || response.data?.reference_id;

      if (referenceId) {
        // Store reference_id and aadhaar in user model
        await User.findByIdAndUpdate(userId, {
          'aadhaarVerification.aadhaarNumber': aadhaarNumber,
          'aadhaarVerification.referenceId': referenceId,
          'aadhaarVerification.status': 'pending',
        });
      }

      return response.data;
    } catch (error: any) {
      console.error('DigiVerification sendOtp error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to send OTP');
    }
  }

  public async verifyOtp(userId: string, otp: string) {
    const user = await User.findById(userId);
    if (!user || !user.aadhaarVerification?.referenceId) {
      throw new Error('No pending verification found');
    }

    const token = this.generateJwt();
    try {
      const response = await axios.post(
        `${config.digiverification.baseUrl}/api/v5/aadhaar/verify-otp`,
        {
          otp: otp,
          reference_id: user.aadhaarVerification.referenceId,
        },
        {
          headers: {
            'jwt-token': token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      // Check if success
      if (response.data.status === 'success' || response.data.success || response.data.message === 'OTP Verified Successfully') {
        await User.findByIdAndUpdate(userId, {
          'aadhaarVerification.status': 'verified',
          'aadhaarVerification.verifiedAt': new Date(),
          isVerified: true,
        });
      } else {
        await User.findByIdAndUpdate(userId, {
          'aadhaarVerification.status': 'failed',
        });
      }

      return response.data;
    } catch (error: any) {
      console.error('DigiVerification verifyOtp error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify OTP');
    }
  }
}
