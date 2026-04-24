import { Router, Request, Response } from 'express';
import Container from "typedi";
import { UserService } from "../../../services/admin/UserService";
import { ResponseWrapper } from '../../responseWrapper';
import { CloudinaryService } from '../../../services/common/CloudinaryService';
import { MediaService } from '../../../services/common/MediaService';
import upload from '../../middleware/upload';
import { MediaType } from '../../../constants/enum';
import User from '../../../models/User';
import Product from '../../../models/Product';
import Payment from '../../../models/Payment';
import Chat from '../../../models/Chat';

export default (router: Router) => {
    const userService = Container.get(UserService);
    const cloudinaryService = Container.get(CloudinaryService);
    const mediaService = Container.get(MediaService);

    // GET /api/admin/users - Get paginated users with filters
    router.get('/users',
        async (req: Request, res: Response) => {
            try {
                const { page = 1, limit = 10, search, city, state, role } = req.query as any;

                const result = await userService.getUsers(
                    { page: parseInt(page), limit: parseInt(limit) },
                    { search, city, state, role }
                );

                return ResponseWrapper.success(res, result, 'Users fetched successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    // POST /api/admin/users/upload - Upload user profile image
    router.post('/users/upload',
        upload.single('image'),
        async (req: Request, res: Response) => {
            try {
                const file = req.file;

                if (!file) {
                    return ResponseWrapper.error(res, 'No image uploaded');
                }

                // Upload to cloudinary
                const uploadResults = await cloudinaryService.uploadMedia(
                    MediaType.image,
                    [file],
                    'user-profiles'
                );

                const result = uploadResults[0];

                // Save to Media model
                const mediaDoc = await mediaService.createMedia({
                    url: result.url,
                    mimetype: result.mimetype,
                    type: MediaType.image,
                    size: result.size,
                    width: result.width,
                    height: result.height
                });

                return ResponseWrapper.success(
                    res,
                    {
                        mediaId: mediaDoc._id.toString(),
                        url: mediaDoc.url
                    },
                    'Profile image uploaded successfully'
                );
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    // GET /api/admin/users/:id - Get single user
    router.get('/users/:id',
        async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;
                const result = await User.findById(id).populate('profileImage');
                if (!result) return ResponseWrapper.error(res, 'User not found', 404);

                return ResponseWrapper.success(res, result, 'User details fetched successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    // GET /api/admin/users/:id/listings - Get user's product listings
    router.get('/users/:id/listings',
        async (req: Request, res: Response) => {
            try {
                const userId = req.params.id as string;
                const { status } = req.query as any;

                const query: any = { seller: userId };
                if (status) query.status = status;

                const products = await Product.find(query)
                    .populate({ path: 'category', populate: { path: 'media' } })
                    .populate({ path: 'subcategory', populate: { path: 'media' } })
                    .populate('media')
                    .sort({ createdAt: -1 });

                return ResponseWrapper.success(res, products, 'User listings fetched');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    // GET /api/admin/users/:id/interests - Get users who chatted about this user's products (interested buyers)
    router.get('/users/:id/interests',
        async (req: Request, res: Response) => {
            try {
                const userId = req.params.id as string;

                // Find all chats where this user is a participant
                const chats = await Chat.find({ participants: userId })
                    .populate('participants', 'firstName lastName email mobile profileImage')
                    .sort({ lastMessageAt: -1 });

                // Map to interested users (the other participant)
                const interests = chats.map(chat => {
                    const otherParticipant = (chat.participants as any[]).find(
                        (p: any) => p._id.toString() !== userId
                    );
                    return {
                        _id: chat._id,
                        user: otherParticipant,
                        lastMessage: chat.lastMessagePreview,
                        lastMessageAt: chat.lastMessageAt,
                        createdAt: chat.createdAt,
                    };
                }).filter(i => i.user);

                return ResponseWrapper.success(res, interests, 'Interested users fetched');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    // GET /api/admin/users/:id/payments - Get user's payment history
    router.get('/users/:id/payments',
        async (req: Request, res: Response) => {
            try {
                const userId = req.params.id as string;
                const payments = await Payment.find({ user: userId })
                    .sort({ createdAt: -1 });

                return ResponseWrapper.success(res, payments, 'User payments fetched');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    // PUT /api/admin/users/:id - Update user profile
    router.put('/users/:id',
        async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;
                const result = await User.findByIdAndUpdate(id, req.body, { new: true }).populate('profileImage');
                if (!result) return ResponseWrapper.error(res, 'User not found', 404);

                return ResponseWrapper.success(res, result, 'User profile updated successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });
}
