import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { ChatService } from '../../../services/app/ChatService';
import { CloudinaryService } from '../../../services/common/CloudinaryService';
import { MediaService } from '../../../services/common/MediaService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';
import { validate } from '../../validators';
import upload from '../../middleware/upload';
import { MediaType } from '../../../constants/enum';
import {
    createDirectChatSchema,
    chatListQuerySchema,
    chatMessagesQuerySchema,
    sendChatMessageSchema,
} from '../../validators/chat';
import { respondCallMessageSchema } from '../../validators/call';
import { CallService } from '../../../services/app/CallService';

export default (router: Router) => {
    const chatService = Container.get(ChatService);
    const callService = Container.get(CallService);
    const cloudinaryService = Container.get(CloudinaryService);
    const mediaService = Container.get(MediaService);

    // POST /chats — open or create 1:1 chat
    router.post(
        '/chats',
        appAuthMiddleware,
        validate(createDirectChatSchema),
        async (req: Request, res: Response) => {
            try {
                const userId = req.user.id;
                const { participantId } = req.body;
                const chat = await chatService.getOrCreateDirectChat(userId, participantId);
                return ResponseWrapper.success(res, chat, 'Chat ready', 201);
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message, 400);
            }
        }
    );

    // GET /chats — inbox (unread counts + last message seen state)
    router.get(
        '/chats',
        appAuthMiddleware,
        validate(chatListQuerySchema, 'query'),
        async (req: Request, res: Response) => {
            try {
                const userId = req.user.id;
                const { page, limit } = req.query as unknown as { page: number; limit: number };
                const result = await chatService.listChats(userId, page, limit);
                return ResponseWrapper.success(res, result, 'Chats fetched successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        }
    );

    // POST /chats/upload — upload chat images (then send message with returned mediaIds)
    router.post(
        '/chats/upload',
        appAuthMiddleware,
        upload.array('images', 10),
        async (req: Request, res: Response) => {
            try {
                const files = req.files as Express.Multer.File[];
                if (!files?.length) {
                    return ResponseWrapper.error(res, 'No images uploaded', 400);
                }
                const uploadResults = await cloudinaryService.uploadMedia(MediaType.image, files, 'chat');
                const mediaDocs = await Promise.all(
                    uploadResults.map((result) =>
                        mediaService.createMedia({
                            url: result.url,
                            mimetype: result.mimetype,
                            type: MediaType.image,
                            size: result.size,
                            width: result.width,
                            height: result.height,
                        })
                    )
                );
                const mediaIds = mediaDocs.map((d) => d._id.toString());
                return ResponseWrapper.success(res, { mediaIds }, 'Images uploaded successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        }
    );

    // GET /chats/:chatId/messages
    router.get(
        '/chats/:chatId/messages',
        appAuthMiddleware,
        validate(chatMessagesQuerySchema, 'query'),
        async (req: Request, res: Response) => {
            try {
                const userId = req.user.id;
                const chatId = req.params.chatId as string;
                const { page, limit } = req.query as unknown as { page: number; limit: number };
                const result = await chatService.getMessages(chatId, userId, page, limit);
                return ResponseWrapper.success(res, result, 'Messages fetched successfully');
            } catch (error: any) {
                const code = error.message === 'Chat not found' ? 404 : 400;
                return ResponseWrapper.error(res, error.message, code);
            }
        }
    );

    // POST /chats/:chatId/messages — JSON body: text, mediaIds (from /chats/upload)
    router.post(
        '/chats/:chatId/messages',
        appAuthMiddleware,
        validate(sendChatMessageSchema),
        async (req: Request, res: Response) => {
            try {
                const userId = req.user.id;
                const chatId = req.params.chatId as string;
                const message = await chatService.sendMessage(chatId, userId, req.body);
                return ResponseWrapper.success(res, message, 'Message sent', 201);
            } catch (error: any) {
                const code = error.message === 'Chat not found' ? 404 : 400;
                return ResponseWrapper.error(res, error.message, code);
            }
        }
    );

    // PATCH /chats/:chatId/messages/:messageId/call-status — accept/reject/cancel call from chat
    router.patch(
        '/chats/:chatId/messages/:messageId/call-status',
        appAuthMiddleware,
        validate(respondCallMessageSchema),
        async (req: Request, res: Response) => {
            try {
                const userId = req.user.id;
                const chatId = req.params.chatId as string;
                const messageId = req.params.messageId as string;
                const { status } = req.body;
                const result = await callService.respondToCallMessage(userId, chatId, messageId, status);
                return ResponseWrapper.success(res, result, `Call ${status} successfully`);
            } catch (error: any) {
                const code = error.message.includes('not found') ? 404 : 400;
                return ResponseWrapper.error(res, error.message, code);
            }
        }
    );

    // PATCH /chats/:chatId/read — mark conversation read (seen / clear unread)
    router.patch(
        '/chats/:chatId/read',
        appAuthMiddleware,
        async (req: Request, res: Response) => {
            try {
                const userId = req.user.id;
                const chatId = req.params.chatId as string;
                const result = await chatService.markChatRead(chatId, userId);
                return ResponseWrapper.success(res, result, 'Marked as read');
            } catch (error: any) {
                const code = error.message === 'Chat not found' ? 404 : 400;
                return ResponseWrapper.error(res, error.message, code);
            }
        }
    );

    // DELETE /chats/:chatId — Delete a chat and all its messages
    router.delete(
        '/chats/:chatId',
        appAuthMiddleware,
        async (req: Request, res: Response) => {
            try {
                const userId = req.user.id;
                const chatId = req.params.chatId as string;
                const result = await chatService.deleteChat(chatId, userId);
                return ResponseWrapper.success(res, result, 'Chat deleted successfully');
            } catch (error: any) {
                const code = error.message === 'Chat not found' ? 404 : 400;
                return ResponseWrapper.error(res, error.message, code);
            }
        }
    );

    // DELETE /chats/:chatId/messages/:messageId — Delete a message in a chat
    router.delete(
        '/chats/:chatId/messages/:messageId',
        appAuthMiddleware,
        async (req: Request, res: Response) => {
            try {
                const userId = req.user.id;
                const chatId = req.params.chatId as string;
                const messageId = req.params.messageId as string;
                const result = await chatService.deleteMessage(chatId, messageId, userId);
                return ResponseWrapper.success(res, result, 'Message deleted successfully');
            } catch (error: any) {
                const code = error.message.includes('not found') ? 404 : 400;
                return ResponseWrapper.error(res, error.message, code);
            }
        }
    );
};
