import { Service, Container } from 'typedi';
import { Server } from 'socket.io';
import Call from '../../models/Call';
import CallHistory from '../../models/CallHistory';
import User from '../../models/User';
import Product from '../../models/Product';
import Message from '../../models/ChatMessage';
import Chat from '../../models/Chat';
import { ChatService } from './ChatService';
import { NotificationService } from '../common/NotificationService';
import {
  CallStatus,
  buildCallNotificationContent,
  buildCallRequestPreview,
  getCallStatusNotificationRecipient,
} from '../../utils/callHelpers';

@Service()
export class CallService {
  constructor(
    private chatService: ChatService,
    private notificationService: NotificationService
  ) {}

  private get io(): Server | undefined {
    try {
      return Container.get<Server>('socket');
    } catch {
      return undefined;
    }
  }

  private async getActorName(userId: string): Promise<string> {
    const user = await User.findById(userId).select('firstName lastName').lean();
    if (!user) return 'Someone';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Someone';
  }

  private assertCanUpdateStatus(
    userId: string,
    callerId: string,
    receiverId: string,
    currentStatus: CallStatus,
    newStatus: CallStatus
  ): void {
    const isCaller = callerId === userId;
    const isReceiver = receiverId === userId;

    if (!isCaller && !isReceiver) {
      throw new Error('You are not authorized to update this call status');
    }

    if (currentStatus === 'pending') {
      if (newStatus === 'accepted' || newStatus === 'rejected') {
        if (!isReceiver) throw new Error('Only the receiver can accept or reject a pending call');
        return;
      }
      if (newStatus === 'cancelled') {
        if (!isCaller) throw new Error('Only the caller can cancel a pending call');
        return;
      }
    }

    if (newStatus === 'cancelled' && currentStatus !== 'pending' && currentStatus !== 'accepted') {
      throw new Error(`Cannot cancel a call with status ${currentStatus}`);
    }
  }

  private async syncCallMessage(
    callId: string,
    status: CallStatus,
    scheduledTime?: Date
  ): Promise<{ message: any; chat: any } | null> {
    const message = await Message.findOne({ scheduledCallId: callId });
    if (!message) return null;

    message.status = status;
    message.stataus = status;
    await message.save();

    const chat = await Chat.findOne({ id: message.chatId });
    if (!chat) return { message, chat: null };

    const preview = buildCallRequestPreview(status, scheduledTime || message.scheduledTime);
    if (chat.lastMessage?.toString() === message._id.toString()) {
      chat.lastMessagePreview = preview;
      chat.lastMessageAt = new Date();
      await chat.save();
    }

    return { message, chat };
  }

  private emitCallRealtime(
    chatId: string,
    callerId: string,
    receiverId: string,
    payload: {
      message?: any;
      chat?: any;
      messageId?: string;
      status: CallStatus;
      callId: string;
    }
  ): void {
    if (!this.io) return;

    if (payload.message) {
      this.io.to(chatId).emit('new_message', payload.message);
    }

    if (payload.chat) {
      this.io.to(chatId).emit('chat_list_update', payload.chat);
      this.io.to(callerId).emit('chat_list_update', payload.chat);
      this.io.to(receiverId).emit('chat_list_update', payload.chat);
    }

    if (payload.messageId) {
      this.io.to(chatId).emit('message_status_updated', {
        messageId: payload.messageId,
        status: payload.status,
        scheduledCallId: payload.callId,
        chatId,
      });
      this.io.to(callerId).emit('call_status_updated', {
        callId: payload.callId,
        status: payload.status,
        chatId,
        messageId: payload.messageId,
      });
      this.io.to(receiverId).emit('call_status_updated', {
        callId: payload.callId,
        status: payload.status,
        chatId,
        messageId: payload.messageId,
      });
    }
  }

  private async sendCallNotification(
    status: CallStatus,
    actorId: string,
    callerId: string,
    receiverId: string,
    metadata: Record<string, string>,
    scheduledTime?: Date
  ): Promise<void> {
    const recipientId = getCallStatusNotificationRecipient(status, callerId, receiverId, actorId);
    if (recipientId === actorId) return;

    const actorName = await this.getActorName(actorId);
    const { title, message } = buildCallNotificationContent(status, actorName, scheduledTime);

    await this.notificationService.createNotification({
      title,
      message,
      recipient: recipientId,
      sender: actorId,
      type: 'call_request',
      metadata: {
        ...metadata,
        status,
        type: 'call_request',
      },
    });
  }

  /**
   * Schedule a new call — creates chat + call_request message + notification
   */
  public async scheduleCall(
    callerId: string,
    receiverId: string,
    scheduledTime: Date,
    notes?: string,
    productId?: string
  ) {
    const receiverExists = await User.findById(receiverId);
    if (!receiverExists) {
      throw new Error('Receiver user not found');
    }

    if (callerId === receiverId) {
      throw new Error('You cannot schedule a call with yourself');
    }

    let productData: any;
    if (productId) {
      const product = await Product.findById(productId)
        .populate('media')
        .lean();
      if (!product) {
        throw new Error('Product not found');
      }
      productData = {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.name,
        price: product.price,
        media: product.media,
        location: product.location,
      };
    }

    const chat = await this.chatService.getOrCreateDirectChat(callerId, receiverId);

    const call = await Call.create({
      caller: callerId,
      receiver: receiverId,
      product: productId || undefined,
      chatId: chat.id,
      status: 'pending',
      scheduledTime,
      notes,
    });

    const preview = buildCallRequestPreview('pending', scheduledTime);
    const { message, chat: updatedChat } = await this.chatService.saveNewMessage(chat.id, callerId, {
      chat_type: 'call_request',
      scheduledCallId: call._id.toString(),
      scheduledBy: callerId,
      status: 'pending',
      scheduledTime,
      scheduledAtStr: scheduledTime.toISOString(),
      text: notes || preview,
      productData,
      skipFcm: true,
    });

    await this.sendCallNotification(
      'pending',
      callerId,
      callerId,
      receiverId,
      {
        callId: call._id.toString(),
        chatId: chat.id,
        messageId: message?._id?.toString() || '',
        productId: productId || '',
        scheduledTime: scheduledTime.toISOString(),
      },
      scheduledTime
    );

    this.emitCallRealtime(chat.id, callerId, receiverId, {
      message,
      chat: updatedChat,
      messageId: message?._id?.toString(),
      status: 'pending',
      callId: call._id.toString(),
    });

    const populatedCall = await Call.findById(call._id)
      .populate({
        path: 'caller',
        select: 'firstName lastName profileImage',
        populate: { path: 'profileImage', select: 'url mimetype type' },
      })
      .populate({
        path: 'receiver',
        select: 'firstName lastName profileImage',
        populate: { path: 'profileImage', select: 'url mimetype type' },
      })
      .populate('product');

    return {
      call: populatedCall,
      chat: updatedChat,
      message,
    };
  }

  /**
   * Update scheduled call status (syncs chat message + notifications)
   */
  public async updateCallStatus(userId: string, callId: string, status: CallStatus) {
    const call = await Call.findById(callId);
    if (!call) {
      throw new Error('Call schedule not found');
    }

    const callerId = call.caller.toString();
    const receiverId = call.receiver.toString();

    this.assertCanUpdateStatus(userId, callerId, receiverId, call.status as CallStatus, status);

    call.status = status;
    await call.save();

    const synced = await this.syncCallMessage(callId, status, call.scheduledTime);

    await this.sendCallNotification(
      status,
      userId,
      callerId,
      receiverId,
      {
        callId: call._id.toString(),
        chatId: call.chatId || synced?.message?.chatId || '',
        messageId: synced?.message?._id?.toString() || '',
      },
      call.scheduledTime
    );

    if (synced?.message && call.chatId) {
      this.emitCallRealtime(call.chatId, callerId, receiverId, {
        chat: synced.chat,
        messageId: synced.message._id.toString(),
        status,
        callId: call._id.toString(),
      });
    }

    return {
      call,
      message: synced?.message || null,
      chat: synced?.chat || null,
    };
  }

  /**
   * Respond to a call_request message from chat (accept / reject / cancel)
   */
  public async respondToCallMessage(
    userId: string,
    chatId: string,
    messageId: string,
    status: CallStatus
  ) {
    const message = await Message.findOne({ _id: messageId, chatId, chat_type: 'call_request' });
    if (!message || !message.scheduledCallId) {
      throw new Error('Call request message not found');
    }

    return this.updateCallStatus(userId, message.scheduledCallId.toString(), status);
  }

  public async getCallHistory(userId: string) {
    const calls = await Call.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'caller',
        select: 'firstName lastName profileImage',
        populate: { path: 'profileImage', select: 'url mimetype type' },
      })
      .populate({
        path: 'receiver',
        select: 'firstName lastName profileImage',
        populate: { path: 'profileImage', select: 'url mimetype type' },
      })
      .populate('product');

    return calls;
  }

  public async getCallDetail(userId: string, callId: string) {
    const call = await Call.findById(callId)
      .populate({
        path: 'caller',
        select: 'firstName lastName profileImage',
        populate: { path: 'profileImage', select: 'url mimetype type' },
      })
      .populate({
        path: 'receiver',
        select: 'firstName lastName profileImage',
        populate: { path: 'profileImage', select: 'url mimetype type' },
      })
      .populate('product');

    if (!call) {
      throw new Error('Call schedule not found');
    }

    if (call.caller._id.toString() !== userId && call.receiver._id.toString() !== userId) {
      throw new Error('You are not authorized to view this call detail');
    }

    const message = await Message.findOne({ scheduledCallId: call._id }).lean();

    return { call, message };
  }

  public async saveCallHistory(
    callerId: string,
    receiverId: string,
    startTime: Date,
    endTime: Date,
    status: 'completed' | 'missed' | 'declined',
    scheduledCallId?: string
  ) {
    const receiverExists = await User.findById(receiverId);
    if (!receiverExists) {
      throw new Error('Receiver user not found');
    }

    const duration = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

    const callHistory = await CallHistory.create({
      caller: callerId,
      receiver: receiverId,
      scheduledCallId: scheduledCallId || undefined,
      startTime,
      endTime,
      duration,
      status,
    });

    if (scheduledCallId) {
      const callStatus: CallStatus =
        status === 'completed' ? 'completed' : status === 'declined' ? 'declined' : 'missed';

      const call = await Call.findByIdAndUpdate(
        scheduledCallId,
        { status: callStatus },
        { new: true }
      );

      if (call) {
        const synced = await this.syncCallMessage(scheduledCallId, callStatus, call.scheduledTime);

        await this.sendCallNotification(
          callStatus,
          callerId,
          call.caller.toString(),
          call.receiver.toString(),
          {
            callId: call._id.toString(),
            chatId: call.chatId || '',
            messageId: synced?.message?._id?.toString() || '',
          },
          call.scheduledTime
        );

        if (synced?.message && call.chatId) {
          this.emitCallRealtime(call.chatId, call.caller.toString(), call.receiver.toString(), {
            chat: synced.chat,
            messageId: synced.message._id.toString(),
            status: callStatus,
            callId: call._id.toString(),
          });
        }
      }
    }

    return callHistory;
  }

  public async getCallHistoryLogs(userId: string) {
    const history = await CallHistory.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'caller',
        select: 'firstName lastName profileImage',
        populate: { path: 'profileImage', select: 'url mimetype type' },
      })
      .populate({
        path: 'receiver',
        select: 'firstName lastName profileImage',
        populate: { path: 'profileImage', select: 'url mimetype type' },
      });

    return history;
  }
}
