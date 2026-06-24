import { Service } from 'typedi';
import mongoose from 'mongoose';
import Notification, { INotification } from '../../models/Notification';
import { FirebasePushService } from './FirebasePushService';
import Container from 'typedi';

export interface INotificationPayload {
  title: string;
  message: string;
  recipient: string | mongoose.Types.ObjectId; // User ObjectId, 'all', or 'admin'
  sender?: string | mongoose.Types.ObjectId;
  type?: string;
  metadata?: any;
}

@Service()
export class NotificationService {
  private get pushService() {
    return Container.get(FirebasePushService);
  }

  public async createNotification(payload: INotificationPayload): Promise<INotification> {
    const notification = new Notification({
      title: payload.title,
      message: payload.message,
      recipient: payload.recipient,
      sender: payload.sender,
      type: payload.type || 'general',
      metadata: payload.metadata
    });

    await notification.save();

    // If it's a specific user, attempt to send FCM push notification
    if (
      typeof payload.recipient === 'string' &&
      payload.recipient !== 'all' &&
      payload.recipient !== 'admin'
    ) {
      this.sendPush(payload.recipient, payload.title, payload.message, payload.metadata);
    } else if (payload.recipient instanceof mongoose.Types.ObjectId) {
      this.sendPush(payload.recipient.toString(), payload.title, payload.message, payload.metadata);
    } else if (payload.recipient === 'all') {
      this.sendPushToAll(payload.title, payload.message, payload.metadata);
    }

    return notification;
  }

  private async sendPushToAll(title: string, body: string, metadata?: any) {
    try {
      const users = await mongoose.model('User').find({
        'fcmTokens.0': { $exists: true }
      }).select('fcmTokens').lean();

      const tokens = users.flatMap(u => (u.fcmTokens ?? []).map((t: any) => t.token)).filter(Boolean);
      if (!tokens.length) return;

      const data: Record<string, string> = {};
      if (metadata) {
        Object.keys(metadata).forEach((key) => {
          if (metadata[key] !== undefined && metadata[key] !== null) {
            data[key] = String(metadata[key]);
          }
        });
      }
      await this.pushService.notifyTokens(tokens, { title, body, data });
    } catch (error) {
      // Fail silently for FCM push error to not break main flow
    }
  }

  private async sendPush(userId: string, title: string, body: string, metadata?: any) {
    try {
      const data: Record<string, string> = {};
      if (metadata) {
        Object.keys(metadata).forEach((key) => {
          if (metadata[key] !== undefined && metadata[key] !== null) {
            data[key] = String(metadata[key]);
          }
        });
      }
      await this.pushService.notifyUser(userId, { title, body, data });
    } catch (error) {
      // Fail silently for FCM push error to not break main flow
    }
  }

  public async getNotifications(
    recipientId: string,
    role: 'user' | 'admin',
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    let query: any;
    if (role === 'admin') {
      // Admins get notifications addressed to 'admin'
      query = { recipient: 'admin' };
    } else {
      // Users get notifications addressed to their userId OR 'all'
      query = {
        $or: [
          { recipient: recipientId },
          { recipient: 'all' }
        ]
      };
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'firstName lastName email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query)
    ]);

    // Calculate unread count specifically for this user
    let unreadCount = 0;
    if (role === 'admin') {
      unreadCount = await Notification.countDocuments({
        recipient: 'admin',
        isRead: false
      });
    } else {
      // For users: unread if recipient is userId and isRead is false,
      // OR if recipient is 'all' and userId is NOT in readBy array.
      unreadCount = await Notification.countDocuments({
        $or: [
          { recipient: recipientId, isRead: false },
          { recipient: 'all', readBy: { $ne: new mongoose.Types.ObjectId(recipientId) } }
        ]
      });
    }

    // Format output to include a personalized isRead flag
    const formattedNotifications = notifications.map(notif => {
      const isBroadcast = notif.recipient === 'all';
      const isReadPersonalized = isBroadcast
        ? notif.readBy.some(id => id.toString() === recipientId)
        : notif.isRead;

      return {
        ...notif.toObject(),
        isRead: isReadPersonalized
      };
    });

    return {
      notifications: formattedNotifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount
    };
  }

  public async markAsRead(notificationId: string, userId: string, role: 'user' | 'admin'): Promise<boolean> {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return false;
    }

    if (notification.recipient === 'all') {
      const userObjId = new mongoose.Types.ObjectId(userId);
      if (!notification.readBy.includes(userObjId)) {
        notification.readBy.push(userObjId);
        await notification.save();
      }
      return true;
    }

    // Double check authorization
    if (role === 'admin' && notification.recipient !== 'admin') {
      return false;
    }
    if (role === 'user' && notification.recipient.toString() !== userId) {
      return false;
    }

    notification.isRead = true;
    await notification.save();
    return true;
  }
}
