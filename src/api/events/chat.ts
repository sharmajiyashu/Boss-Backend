import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';
import Container from 'typedi';
import AppLogger from '../loaders/logger';
import { ChatService } from '../../services/app/ChatService';
import { CallService } from '../../services/app/CallService';
import Message from '../../models/ChatMessage';

export default (socket: AuthenticatedSocket, io: Server) => {
    if (!socket.userId) {
        socket.disconnect();
        return;
    }

    const userId = socket.userId;
    const chatService = Container.get(ChatService);
    const callService = Container.get(CallService);

    socket.join(userId);
    AppLogger.info(`Socket ${socket.id} joined personal room ${userId}`);

    socket.on('join_room', (data: { chatId: string }) => {
        const { chatId } = data;
        if (!chatId) return;
        socket.join(chatId);
        AppLogger.info(`User ${userId} joined chat room: ${chatId}`);
    });

    socket.on('send_message', async (payload: {
        chatId: string;
        text?: string;
        media?: { url: string }[];
        chat_type?: string;
        productData?: any;
        extraData?: any;
    }) => {
        try {
            const { chatId } = payload;
            if (!chatId) return;

            const { message, chat } = await chatService.saveNewMessage(chatId, userId, payload);

            io.to(chatId).emit('new_message', message);

            io.to(chatId).emit('chat_list_update', chat);
            const targetUserId = chat.participants.map((p) => p.toString()).find((id) => id !== userId);
            if (targetUserId) {
                io.to(targetUserId).emit('chat_list_update', chat);
            }
        } catch (error: any) {
            AppLogger.error('Socket send_message error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('mark_as_read', async (data: { chatId: string }) => {
        try {
            const { chatId } = data;
            if (!chatId) return;

            const chat = await chatService.markMessagesAsRead(chatId, userId);

            const now = new Date();
            io.to(chatId).emit('messages_seen', {
                chatId,
                userId,
                seenAt: now
            });

            io.to(userId).emit('chat_list_update', chat);
        } catch (error: any) {
            AppLogger.error('Socket mark_as_read error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('update_message_status', async (data: { chatId: string; messageId: string; status: string }) => {
        try {
            const { chatId, messageId, status } = data;
            if (!chatId || !messageId || !status) return;

            const message = await Message.findOne({ _id: messageId, chatId }).lean();

            if (message?.chat_type === 'call_request' && message.scheduledCallId) {
                const result = await callService.respondToCallMessage(
                    userId,
                    chatId,
                    messageId,
                    status as any
                );
                socket.emit('call_status_updated', {
                    callId: result.call._id.toString(),
                    status,
                    chatId,
                    messageId,
                    result,
                });
                return;
            }

            await chatService.updateMessageStatus(chatId, messageId, status);

            io.to(chatId).emit('message_status_updated', {
                messageId,
                status
            });
        } catch (error: any) {
            AppLogger.error('Socket update_message_status error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('disconnect', () => {
        AppLogger.info('Socket disconnected:', socket.id);
    });
};
