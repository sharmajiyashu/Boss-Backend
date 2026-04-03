import { Inject, Service } from "typedi";
import mongoose from "mongoose";
import User, { IUser } from '../../models/User';
import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import config from "../../config";
import { EmailService } from "./emailService";
import { CONSTANTS } from "../../config/constants";
import { addMinutes } from "date-fns";
import AppLogger from '../../api/loaders/logger';


@Service()
export class AuthenticationService {
    constructor(
        @Inject('mongoConnection') private mongoConnection: typeof mongoose,
        @Inject() private emailService: EmailService,
    ) { }

    private generateToken(userId: string, role: string): string {
        const payload = { userId, role };
        const secret = config.auth.secret;
        const options: jwt.SignOptions = {
            expiresIn: CONSTANTS.JWT_ACCESS_EXPIRY
        };
        return jwt.sign(payload, secret, options) as string;
    }


    private generateOTP(): string {
        // Generates a 6-digit OTP
        // return Math.floor(100000 + Math.random() * 900000).toString();

        return "123456";
    }

    private generateReferralCode(): string {
        // Generates a 6-digit random number for referral code
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async adminLogin(email: string, password: string): Promise<{ token: string; user: IUser }> {
        const user = await User.findOne({
            email,
            userRole: 'admin'
        });

        if (!user || !user.password) {
            throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        const token = this.generateToken(user._id.toString(), user.userRole);

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        return { token, user };
    }

    async userRegister(data: {
        firstName: string;
        lastName: string;
        email: string;
        mobile: string;
        password?: string;
        location?: {
            lat?: number;
            lng?: number;
            address?: string;
            city?: string;
            state?: string;
            zipcode?: string;
        }
    }): Promise<{ token: string; user: IUser }> {
        const existingUser = await User.findOne({ 
            $or: [{ email: data.email }, { mobile: data.mobile }] 
        });

        if (existingUser) {
            throw new Error('User with this email or mobile already exists');
        }

        const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : undefined;

        const user = await User.create({
            ...data,
            password: hashedPassword,
            userRole: 'user',
            referralCode: this.generateReferralCode(),
        });

        const token = this.generateToken(user._id.toString(), user.userRole);

        return { token, user };
    }

    async userLogin(email: string, password: string): Promise<{ token: string; user: IUser }> {
        const user = await User.findOne({
            email,
            userRole: 'user'
        });

        if (!user || !user.password) {
            throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        const token = this.generateToken(user._id.toString(), user.userRole);

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        return { token, user };
    }

    async userSendOTP(mobile: string): Promise<{ otp: string }> {
        let user = await User.findOne({ mobile });

        const otp = this.generateOTP();
        const otpExpires = addMinutes(new Date(), CONSTANTS.OTP_EXPIRY_MINUTES);

        if (!user) {
            // Register new user with this mobile
            user = await User.create({
                firstName: 'User',
                lastName: '',
                mobile,
                otp,
                otpExpires,
                userRole: 'user',
                referralCode: this.generateReferralCode(),
            });
        } else {
            // Update existing user with new OTP
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();
        }

        // Mock: In production, send this via SMS service provider
        AppLogger.info(`Sending OTP ${otp} to mobile ${mobile}`);

        return { otp }; // Return for testing/dev purposes if needed
    }

    async userVerifyOTP(mobile: string, otp: string): Promise<{ token: string; user: IUser }> {
        const user = await User.findOne({
            mobile,
            otp,
            otpExpires: { $gt: new Date() }
        });

        if (!user) {
            throw new Error('Invalid or expired OTP');
        }

        // Clear OTP after successful verification
        user.otp = undefined;
        user.otpExpires = undefined;
        user.lastLoginAt = new Date();
        await user.save();

        const token = this.generateToken(user._id.toString(), user.userRole);

        return { token, user };
    }

    async verifyToken(token: string): Promise<IUser> {
        try {
            const decoded = jwt.verify(token, config.auth.secret) as { userId: string };

            const user = await User.findById(decoded.userId);

            if (!user) {
                throw new Error('User not found');
            }

            return user;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}

