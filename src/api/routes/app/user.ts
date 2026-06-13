import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { UserService } from '../../../services/app/UserService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';
import { validate } from '../../validators';
import { fcmTokenBodySchema, removeFcmTokenBodySchema } from '../../validators/chat';
import {
  createAddressSchema,
  updateAddressSchema,
  updateLocationSchema,
  addressIdParamSchema,
} from '../../validators/user';

export default (router: Router) => {
  const userService = Container.get(UserService);

  // GET /api/app/user/profile - Get current user profile
  router.get('/user/profile',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const user = await userService.getProfile(userId);
        return ResponseWrapper.success(res, user, 'Profile fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // PATCH /api/app/user/profile - Update current user profile
  router.patch('/user/profile',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const updatedUser = await userService.updateProfile(userId, req.body);
        return ResponseWrapper.success(res, updatedUser, 'Profile updated successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // GET /api/app/profile/location - Get current location and saved addresses
  router.get('/profile/location',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const result = await userService.getLocation(userId);
        return ResponseWrapper.success(res, result, 'Location fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // POST /api/app/profile/location - Set current location (saved address or custom)
  router.post('/profile/location',
    appAuthMiddleware,
    validate(updateLocationSchema),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const result = await userService.updateLocation(userId, req.body);
        return ResponseWrapper.success(res, result, 'Location updated successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // GET /api/app/profile/addresses - List saved addresses
  router.get('/profile/addresses',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const addresses = await userService.getAddresses(userId);
        return ResponseWrapper.success(res, addresses, 'Addresses fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // POST /api/app/profile/addresses - Save a new address
  router.post('/profile/addresses',
    appAuthMiddleware,
    validate(createAddressSchema),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const result = await userService.addAddress(userId, req.body);
        return ResponseWrapper.success(res, result, 'Address saved successfully', 201);
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // PATCH /api/app/profile/addresses/:addressId - Update a saved address
  router.patch('/profile/addresses/:addressId',
    appAuthMiddleware,
    validate(addressIdParamSchema, 'params'),
    validate(updateAddressSchema),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const addressId = req.params.addressId as string;
        const result = await userService.updateAddress(userId, addressId, req.body);
        return ResponseWrapper.success(res, result, 'Address updated successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // DELETE /api/app/profile/addresses/:addressId - Delete a saved address
  router.delete('/profile/addresses/:addressId',
    appAuthMiddleware,
    validate(addressIdParamSchema, 'params'),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const addressId = req.params.addressId as string;
        const result = await userService.deleteAddress(userId, addressId);
        return ResponseWrapper.success(res, result, 'Address deleted successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  router.post(
    '/user/fcm-token',
    appAuthMiddleware,
    validate(fcmTokenBodySchema),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const { token, deviceType } = req.body;
        const result = await userService.registerFcmToken(userId, token, deviceType);
        return ResponseWrapper.success(res, result, 'FCM token registered');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  router.delete(
    '/user/fcm-token',
    appAuthMiddleware,
    validate(removeFcmTokenBodySchema),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const { token } = req.body;
        const result = await userService.removeFcmToken(userId, token);
        return ResponseWrapper.success(res, result, 'FCM token removed');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );
};
