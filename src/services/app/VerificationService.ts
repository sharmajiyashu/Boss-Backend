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
      const apiResponse = response.data;

      if (apiResponse.status === false) {
        throw new Error(apiResponse.message || 'Failed to send OTP');
      }

      const referenceId = apiResponse.data?.reference_id || apiResponse.reference_id;

      if (referenceId) {
        // Store reference_id and aadhaar in user model
        await User.findByIdAndUpdate(userId, {
          'aadhaarVerification.aadhaarNumber': aadhaarNumber,
          'aadhaarVerification.referenceId': referenceId,
          'aadhaarVerification.status': 'pending',
        });
      }

      return apiResponse;
    } catch (error: any) {
      if (error.response?.data) {
        const apiError = error.response.data;
        throw new Error(apiError.message || 'Failed to send OTP');
      }
      throw error;
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
      const apiResponse = response.data;

      // Check if success
      // Based on typical DigiVerification API, status could be boolean or string
      const isSuccess = apiResponse.status === true || apiResponse.status === 'success' || apiResponse.success === true;

      if (isSuccess) {
        await User.findByIdAndUpdate(userId, {
          'aadhaarVerification.status': 'verified',
          'aadhaarVerification.verifiedAt': new Date(),
          isVerified: true,
        });
      } else {
        await User.findByIdAndUpdate(userId, {
          'aadhaarVerification.status': 'failed',
        });
        throw new Error(apiResponse.message || 'OTP verification failed');
      }

      return apiResponse;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to verify OTP');
      }
      throw error;
    }
  }
}
