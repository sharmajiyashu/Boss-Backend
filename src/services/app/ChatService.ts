import { Service } from 'typedi';
import mongoose from 'mongoose';
import Chat, { IChat } from '../../models/Chat';

type ChatListLean = {
    _id: mongoose.Types.ObjectId;
    participants: mongoose.Types.ObjectId[];
    reads: IChat['reads'];
    lastMessage?: mongoose.Types.ObjectId | null;
    [key: string]: unknown;
};
import Message from '../../models/ChatMessage';
import User from '../../models/User';
import Media from '../../models/Media';
import { FirebasePushService } from '../common/FirebasePushService';

export function buildParticipantKey(userIdA: string, userIdB: string): string {
    return [userIdA, userIdB].sort().join('::');
}

function senderIdOf(message: { sender: unknown }): string {
    const s = message.sender as { _id?: mongoose.Types.ObjectId } | mongoose.Types.ObjectId | string | undefined;
    if (s && typeof s === 'object' && '_id' in s && s._id) return s._id.toString();
    if (s && typeof s === 'object' && typeof (s as mongoose.Types.ObjectId).toString === 'function') {
        return (s as mongoose.Types.ObjectId).toString();
    }
    return String(s);
}

@Service()
export class ChatService {
    constructor(private firebasePush: FirebasePushService) {}

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

    private getReadAt(chat: { reads?: { user: mongoose.Types.ObjectId; lastReadAt: Date }[] }, uid: string): Date {
        const r = chat.reads?.find((x) => x.user.toString() === uid);
        return r?.lastReadAt ?? new Date(0);
    }

    private async unreadCountForChat(chatId: mongoose.Types.ObjectId, userId: string, reads: IChat['reads']): Promise<number> {
        const lastRead = this.getReadAt({ reads }, userId);
        return Message.countDocuments({
            chat: chatId,
            sender: { $ne: new mongoose.Types.ObjectId(userId) },
            createdAt: { $gt: lastRead },
        });
    }

    private isOutgoingSeenByOther(
        lastMessage: { sender?: unknown; createdAt?: Date } | null,
        userId: string,
        participants: mongoose.Types.ObjectId[],
        reads: IChat['reads']
    ): boolean | null {
        if (!lastMessage?.createdAt) return null;
        if (senderIdOf(lastMessage as { sender: unknown }) !== userId) return null;
        const otherId = participants.map((p) => p.toString()).find((id) => id !== userId);
        if (!otherId) return null;
        const otherRead = this.getReadAt({ reads }, otherId);
        return new Date(lastMessage.createdAt) <= otherRead;
    }

    public async getOrCreateDirectChat(userId: string, participantId: string) {
        await this.assertCanChat(userId, participantId);
        const key = buildParticipantKey(userId, participantId);
        let chat = await Chat.findOne({ participantKey: key });
        if (!chat) {
            chat = await Chat.create({
                participantKey: key,
                participants: [
                    new mongoose.Types.ObjectId(userId),
                    new mongoose.Types.ObjectId(participantId),
                ],
                reads: [
                    { user: new mongoose.Types.ObjectId(userId), lastReadAt: new Date(0) },
                    { user: new mongoose.Types.ObjectId(participantId), lastReadAt: new Date(0) },
                ],
                lastMessagePreview: '',
            });
        }
        return this.chatDetailForList(chat.toObject() as unknown as ChatListLean, userId);
    }

    private async chatDetailForList(c: ChatListLean, userId: string) {
        const otherId = c.participants.map((p) => p.toString()).find((id) => id !== userId);
        const [otherUser, unread, lastMsgDoc] = await Promise.all([
            otherId
                ? User.findById(otherId).select('firstName lastName profileImage').populate('profileImage').lean()
                : null,
            this.unreadCountForChat(c._id, userId, c.reads),
            c.lastMessage
                ? Message.findById(c.lastMessage as mongoose.Types.ObjectId)
                      .select('sender createdAt')
                      .lean()
                : null,
        ]);
        const seen = this.isOutgoingSeenByOther(lastMsgDoc, userId, c.participants, c.reads);
        return {
            ...c,
            otherUser,
            unreadCount: unread,
            isLastMessageSeenByOther: seen,
        };
    }

    public async listChats(userId: string, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const uidObj = new mongoose.Types.ObjectId(userId);
        const [chats, total] = await Promise.all([
            Chat.find({ participants: uidObj })
                .sort({ lastMessageAt: -1, updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Chat.countDocuments({ participants: uidObj }),
        ]);

        const enriched = await Promise.all(chats.map((c) => this.chatDetailForList(c as ChatListLean, userId)));

        return {
            chats: enriched,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }

    public async getMessages(chatId: string, userId: string, page: number, limit: number) {
        const chat = await Chat.findById(chatId).lean();
        if (!chat || !chat.participants.some((p) => p.toString() === userId)) {
            throw new Error('Chat not found');
        }
        const skip = (page - 1) * limit;
        const [messages, total] = await Promise.all([
            Message.find({ chat: chat._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('media')
                .populate('sender', 'firstName lastName profileImage')
                .lean(),
            Message.countDocuments({ chat: chat._id }),
        ]);

        const withSeen = messages.map((m) => {
            const isMine = senderIdOf(m) === userId;
            let seenByOther: boolean | undefined;
            if (isMine) {
                const otherId = chat.participants.map((p) => p.toString()).find((id) => id !== userId);
                if (otherId) {
                    const otherRead = this.getReadAt(chat, otherId);
                    seenByOther = new Date(m.createdAt) <= otherRead;
                }
            }
            return { ...m, seenByOther: isMine ? seenByOther : undefined };
        });

        return {
            messages: withSeen.reverse(),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }

    public async sendMessage(chatId: string, userId: string, input: { text?: string; mediaIds?: string[] }) {
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.some((p) => p.toString() === userId)) {
            throw new Error('Chat not found');
        }

        const text = input.text?.trim();
        const mediaIds = input.mediaIds ?? [];
        if (!text && mediaIds.length === 0) {
            throw new Error('Message must include text or at least one image');
        }

        if (mediaIds.length > 0) {
            const count = await Media.countDocuments({
                _id: { $in: mediaIds.map((id) => new mongoose.Types.ObjectId(id)) },
            });
            if (count !== mediaIds.length) throw new Error('Invalid media reference');
        }

        const preview = text?.slice(0, 120) ?? (mediaIds.length ? `[${mediaIds.length} image(s)]` : '');

        const message = await Message.create({
            chat: chat._id,
            sender: new mongoose.Types.ObjectId(userId),
            text: text || undefined,
            media: mediaIds.map((id) => new mongoose.Types.ObjectId(id)),
        });

        const now = message.createdAt ?? new Date();
        chat.lastMessage = message._id as mongoose.Types.ObjectId;
        chat.lastMessageAt = now;
        chat.lastMessagePreview = preview;

        const rIdx = chat.reads.findIndex((x) => x.user.toString() === userId);
        if (rIdx >= 0) chat.reads[rIdx].lastReadAt = now;
        else chat.reads.push({ user: new mongoose.Types.ObjectId(userId), lastReadAt: now });

        await chat.save();

        const populated = await Message.findById(message._id)
            .populate('media')
            .populate('sender', 'firstName lastName profileImage')
            .lean();

        const recipientId = chat.participants.map((p) => p.toString()).find((id) => id !== userId);
        if (recipientId) {
            const sender = await User.findById(userId).select('firstName lastName').lean();
            const name = sender ? `${sender.firstName} ${sender.lastName}`.trim() : 'Someone';
            await this.firebasePush.notifyUser(recipientId, {
                title: name,
                body: text || 'Sent a photo',
                data: {
                    type: 'chat_message',
                    chatId: String(chat._id),
                    messageId: String(message._id),
                    senderId: userId,
                },
            });
        }

        return populated;
    }

    public async markChatRead(chatId: string, userId: string) {
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.some((p) => p.toString() === userId)) {
            throw new Error('Chat not found');
        }
        const now = new Date();
        const idx = chat.reads.findIndex((x) => x.user.toString() === userId);
        if (idx >= 0) chat.reads[idx].lastReadAt = now;
        else chat.reads.push({ user: new mongoose.Types.ObjectId(userId), lastReadAt: now });
        await chat.save();
        return { ok: true, lastReadAt: now };
    }
}
