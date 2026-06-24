import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';
import Container from 'typedi';
import AppLogger from '../loaders/logger';
import { ChatService } from '../../services/app/ChatService';

export default (socket: AuthenticatedSocket, io: Server) => {
    if (!socket.userId) {
        socket.disconnect();
        return;
    }

    const userId = socket.userId;
    const chatService = Container.get(ChatService);

    // Join user's personal room for direct notifications/chat list updates
    socket.join(userId);
    AppLogger.info(`Socket ${socket.id} joined personal room ${userId}`);

    // 1. join_room
    socket.on('join_room', (data: { chatId: string }) => {
        const { chatId } = data;
        if (!chatId) return;
        socket.join(chatId);
        AppLogger.info(`User ${userId} joined chat room: ${chatId}`);
    });

    // 2. send_message
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

            // Broadcast the new message to all participants in the room
            io.to(chatId).emit('new_message', message);

            // Emit chat list update to both participants (room + personal rooms)
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

    // 3. mark_as_read
    socket.on('mark_as_read', async (data: { chatId: string }) => {
        try {
            const { chatId } = data;
            if (!chatId) return;

            const chat = await chatService.markMessagesAsRead(chatId, userId);

            // Broadcast messages_seen to room
            const now = new Date();
            io.to(chatId).emit('messages_seen', {
                chatId,
                userId,
                seenAt: now
            });

            // Emit chat list update to user
            io.to(userId).emit('chat_list_update', chat);
        } catch (error: any) {
            AppLogger.error('Socket mark_as_read error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    // 4. update_message_status
    socket.on('update_message_status', async (data: { chatId: string; messageId: string; status: string }) => {
        try {
            const { chatId, messageId, status } = data;
            if (!chatId || !messageId || !status) return;

            await chatService.updateMessageStatus(chatId, messageId, status);

            // Broadcast status update to room
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
