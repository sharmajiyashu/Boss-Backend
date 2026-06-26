import { Service, Inject } from 'typedi';
import { Server } from 'socket.io';
import Call from '../../models/Call';
import CallHistory from '../../models/CallHistory';
import User from '../../models/User';
import Notification from '../../models/Notification';
import Message from '../../models/ChatMessage';
import { ChatService } from './ChatService';

@Service()
export class CallService {
  constructor(
    @Inject('socket') private io: Server,
    private chatService: ChatService
  ) {}
  /**
   * Schedule a new call
   */
  public async scheduleCall(callerId: string, receiverId: string, scheduledTime: Date, notes?: string) {
    // Check if receiver exists
    const receiverExists = await User.findById(receiverId);
    if (!receiverExists) {
      throw new Error('Receiver user not found');
    }

    if (callerId === receiverId) {
      throw new Error('You cannot schedule a call with yourself');
    }

    const call = await Call.create({
      caller: callerId,
      receiver: receiverId,
      status: 'pending',
      scheduledTime,
      notes,
    });

    const chat = await this.chatService.getOrCreateDirectChat(callerId, receiverId);

    const { message, chat: updatedChat } = await this.chatService.saveNewMessage(chat.id, callerId, {
      chat_type: 'call_request',
      scheduledCallId: call._id.toString(),
      status: 'pending',
      scheduledTime: scheduledTime,
      text: notes || 'Scheduled a call request'
    });

    await Notification.create({
      title: 'New Call Request',
      message: 'You have a new call request',
      recipient: receiverId,
      sender: callerId,
      type: 'call_request',
      metadata: {
        callId: call._id.toString(),
        chatId: chat.id,
        messageId: message?._id?.toString()
      }
    });

    if (this.io) {
      this.io.to(chat.id).emit('new_message', message);
      this.io.to(chat.id).emit('chat_list_update', updatedChat);
      this.io.to(callerId).emit('chat_list_update', updatedChat);
      this.io.to(receiverId).emit('chat_list_update', updatedChat);
    }

    return call;
  }

  /**
   * Update scheduled call status
   */
  public async updateCallStatus(userId: string, callId: string, status: string) {
    const call = await Call.findById(callId);
    if (!call) {
      throw new Error('Call schedule not found');
    }

    // Both caller and receiver can update status (e.g. caller can cancel, receiver can accept/reject/start)
    if (call.receiver.toString() !== userId && call.caller.toString() !== userId) {
      throw new Error('You are not authorized to update this call status');
    }

    call.status = status as any;
    await call.save();

    const message = await Message.findOne({ scheduledCallId: call._id });
    if (message) {
      message.status = status;
      message.stataus = status; 
      await message.save();

      if (this.io) {
        this.io.to(message.chatId).emit('message_status_updated', {
          messageId: message._id.toString(),
          status
        });
      }
    }

    if (status === 'accepted' || status === 'rejected') {
      await Notification.create({
        title: `Call Request ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
        message: `Your call request has been ${status}`,
        recipient: call.caller,
        sender: call.receiver,
        type: 'call_request_update',
        metadata: {
          callId: call._id.toString(),
          status
        }
      });
    }

    return call;
  }

  /**
   * Get call history for a user (as caller or receiver)
   * showing profile images and names.
   */
  public async getCallHistory(userId: string) {
    const calls = await Call.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'caller',
        select: 'firstName lastName profileImage',
        populate: {
          path: 'profileImage',
          select: 'url mimetype type',
        },
      })
      .populate({
        path: 'receiver',
        select: 'firstName lastName profileImage',
        populate: {
          path: 'profileImage',
          select: 'url mimetype type',
        },
      });

    return calls;
  }

  /**
   * Get detail of a specific scheduled call
   */
  public async getCallDetail(userId: string, callId: string) {
    const call = await Call.findById(callId)
      .populate({
        path: 'caller',
        select: 'firstName lastName profileImage',
        populate: {
          path: 'profileImage',
          select: 'url mimetype type',
        },
      })
      .populate({
        path: 'receiver',
        select: 'firstName lastName profileImage',
        populate: {
          path: 'profileImage',
          select: 'url mimetype type',
        },
      });

    if (!call) {
      throw new Error('Call schedule not found');
    }

    if (call.caller._id.toString() !== userId && call.receiver._id.toString() !== userId) {
      throw new Error('You are not authorized to view this call detail');
    }

    return call;
  }

  /**
   * Save a call log/history entry (Zegocloud logs)
   */
  public async saveCallHistory(
    callerId: string,
    receiverId: string,
    startTime: Date,
    endTime: Date,
    status: 'completed' | 'missed' | 'declined',
    scheduledCallId?: string
  ) {
    // Check if receiver exists
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

    // If there is a scheduled call, update its status accordingly
    if (scheduledCallId) {
      const callStatus = status === 'completed' ? 'completed' : status === 'declined' ? 'declined' : 'missed';
      await Call.findByIdAndUpdate(scheduledCallId, { status: callStatus });
    }

    return callHistory;
  }

  /**
   * Get call history list (completed/missed calls) for a user
   */
  public async getCallHistoryLogs(userId: string) {
    const history = await CallHistory.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'caller',
        select: 'firstName lastName profileImage',
        populate: {
          path: 'profileImage',
          select: 'url mimetype type',
        },
      })
      .populate({
        path: 'receiver',
        select: 'firstName lastName profileImage',
        populate: {
          path: 'profileImage',
          select: 'url mimetype type',
        },
      });

    return history;
  }
}
