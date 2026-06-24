import { Service } from 'typedi';
import mongoose from 'mongoose';
import Chat, { IChat } from '../../models/Chat';
import Message, { IChatMessage } from '../../models/ChatMessage';
import User from '../../models/User';
import { FirebasePushService } from '../common/FirebasePushService';

export function buildDeterministicRoomId(userIdA: string, userIdB: string): string {
    return [userIdA, userIdB].sort().join('_');
}

export function buildParticipantKey(userIdA: string, userIdB: string): string {
    return [userIdA, userIdB].sort().join('::');
}

@Service()
export class ChatService {
    constructor(private firebasePush: FirebasePushService) { }

    private async assertCanChat(userId: string, otherId: string): Promise<void> {
        if (userId === otherId) throw new Error('Cannot chat with yourself');
        const [me, other] = await Promise.all([
            User.findById(userId).select('blockedUsers userRole'),
            User.findById(otherId).select('blockedUsers userRole isBlocked'),
        ]);
        if (!other) throw new Error('User not found');
        if (other.userRole !== 'user' || other.isBlocked) throw new Error('Cannot start chat with this user');
        const myBlocks = (me?.blockedUsers ?? []).map((id) => id.toString());
        const theirBlocks = (other.blockedUsers ?? []).map((id) => id.toString());
        if (myBlocks.includes(otherId) || theirBlocks.includes(userId)) {
            throw new Error('Cannot message this user');
        }
    }

    public async getOrCreateDirectChat(userId: string, participantId: string) {
        await this.assertCanChat(userId, participantId);
        const roomId = buildDeterministicRoomId(userId, participantId);
        const key = buildParticipantKey(userId, participantId);

        let chat = await Chat.findOne({ id: roomId });
        if (!chat) {
            const [me, other] = await Promise.all([
                User.findById(userId).select('firstName lastName profileImage').populate('profileImage').lean(),
                User.findById(participantId).select('firstName lastName profileImage').populate('profileImage').lean(),
            ]);

            const details = new Map();
            details.set(userId, {
                name: `${me?.firstName || ''} ${me?.lastName || ''}`.trim() || 'User',
                image: (me?.profileImage as any)?.url || '',
            });
            details.set(participantId, {
                name: `${other?.firstName || ''} ${other?.lastName || ''}`.trim() || 'User',
                image: (other?.profileImage as any)?.url || '',
            });

            const unread = new Map();
            unread.set(userId, 0);
            unread.set(participantId, 0);

            chat = await Chat.create({
                id: roomId,
                participantKey: key,
                participants: [
                    new mongoose.Types.ObjectId(userId),
                    new mongoose.Types.ObjectId(participantId),
                ],
                participantDetails: details,
                unreadCounts: unread,
                reads: [
                    { user: new mongoose.Types.ObjectId(userId), lastReadAt: new Date() },
                    { user: new mongoose.Types.ObjectId(participantId), lastReadAt: new Date(0) },
                ],
                lastMessagePreview: '',
            });
        }
        return chat;
    }

    public async listChats(userId: string, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const uidObj = new mongoose.Types.ObjectId(userId);
        const [chats, total] = await Promise.all([
            Chat.find({ participants: uidObj })
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Chat.countDocuments({ participants: uidObj }),
        ]);

        return {
            chats,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }

    public async getMessages(chatId: string, userId: string, page: number, limit: number) {
        const chat = await Chat.findOne({ id: chatId }).lean();
        if (!chat || !chat.participants.some((p) => p.toString() === userId)) {
            throw new Error('Chat not found');
        }
        const skip = (page - 1) * limit;
        const [messages, total] = await Promise.all([
            Message.find({ chatId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: 'sender',
                    select: 'firstName lastName profileImage',
                    populate: { path: 'profileImage' },
                })
                .lean(),
            Message.countDocuments({ chatId }),
        ]);

        return {
            messages: messages.reverse(),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }

    public async saveNewMessage(chatId: string, userId: string, payload: any) {
        const chat = await Chat.findOne({ id: chatId });
        if (!chat || !chat.participants.some((p) => p.toString() === userId)) {
            throw new Error('Chat not found');
        }

        const text = payload.text?.trim() || '';
        const media = payload.media || [];
        const chat_type = payload.chat_type || 'text';

        const messageData: any = {
            chat: chat._id,
            chatId: chat.id,
            sender: new mongoose.Types.ObjectId(userId),
            text,
            media,
            chat_type,
            productData: payload.productData,
            status: payload.status,
            stataus: payload.stataus || payload.status,
            requestId: payload.requestId,
            scheduledAtStr: payload.scheduledAtStr,
            scheduledTime: payload.scheduledTime ? new Date(payload.scheduledTime) : undefined,
            scheduledCallId: payload.scheduledCallId ? new mongoose.Types.ObjectId(payload.scheduledCallId) : undefined,
            scheduledBy: payload.scheduledBy ? new mongoose.Types.ObjectId(payload.scheduledBy) : undefined,
        };

        const message = new Message(messageData);
        if (chat_type === 'call_request') {
            message.requestId = message._id.toString();
        }

        await message.save();

        const now = message.createdAt || new Date();
        chat.lastMessage = message._id as mongoose.Types.ObjectId;
        chat.lastMessageAt = now;
        chat.lastMessagePreview = text || (media.length ? `[${media.length} image(s)]` : '');
        chat.lastMessageSenderId = userId;

        // Increment target participant's unread count
        const targetUserId = chat.participants.map((p) => p.toString()).find((id) => id !== userId);
        if (targetUserId) {
            const currentCount = chat.unreadCounts.get(targetUserId) || 0;
            chat.unreadCounts.set(targetUserId, currentCount + 1);
        }

        const rIdx = chat.reads.findIndex((x) => x.user.toString() === userId);
        if (rIdx >= 0) chat.reads[rIdx].lastReadAt = now;
        else chat.reads.push({ user: new mongoose.Types.ObjectId(userId), lastReadAt: now });

        await chat.save();

        const populated = await Message.findById(message._id)
            .populate({
                path: 'sender',
                select: 'firstName lastName profileImage',
                populate: { path: 'profileImage' },
            })
            .lean();

        // Trigger FCM push notification to other user
        if (targetUserId) {
            const senderDetails = chat.participantDetails.get(userId);
            const name = senderDetails?.name || 'Someone';
            await this.firebasePush.notifyUser(targetUserId, {
                title: name,
                body: text || 'Sent a photo',
                data: {
                    type: 'chat_message',
                    chatId: chat.id,
                    messageId: String(message._id),
                    senderId: userId,
                },
            });
        }

        return { message: populated, chat };
    }

    public async markMessagesAsRead(chatId: string, userId: string) {
        const chat = await Chat.findOne({ id: chatId });
        if (!chat || !chat.participants.some((p) => p.toString() === userId)) {
            throw new Error('Chat not found');
        }

        chat.unreadCounts.set(userId, 0);
        const now = new Date();
        const idx = chat.reads.findIndex((x) => x.user.toString() === userId);
        if (idx >= 0) chat.reads[idx].lastReadAt = now;
        else chat.reads.push({ user: new mongoose.Types.ObjectId(userId), lastReadAt: now });

        await chat.save();

        // Update seenAt for messages in room sent by other user
        await Message.updateMany(
            { chatId, sender: { $ne: new mongoose.Types.ObjectId(userId) }, seenAt: null },
            { $set: { seenAt: now } }
        );

        return chat;
    }

    public async updateMessageStatus(chatId: string, messageId: string, status: string) {
        const message = await Message.findOne({ _id: messageId, chatId });
        if (!message) {
            throw new Error('Message not found');
        }

        message.status = status;
        message.stataus = status; // Backward compatibility
        await message.save();

        return message;
    }

    public async sendMessage(chatId: string, userId: string, input: { text?: string; mediaIds?: string[] }) {
        const mediaUrls: { url: string }[] = [];
        if (input.mediaIds && input.mediaIds.length > 0) {
            const mediaDocs = await mongoose.model('Media').find({
                _id: { $in: input.mediaIds.map((id) => new mongoose.Types.ObjectId(id)) }
            }).select('url').lean();
            mediaUrls.push(...mediaDocs.map((m: any) => ({ url: m.url })));
        }
        const result = await this.saveNewMessage(chatId, userId, {
            text: input.text,
            media: mediaUrls
        });
        return result.message;
    }

    public async markChatRead(chatId: string, userId: string) {
        await this.markMessagesAsRead(chatId, userId);
        return { ok: true };
    }
}
