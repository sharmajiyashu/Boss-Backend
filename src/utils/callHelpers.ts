export type CallStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'ongoing'
  | 'completed'
  | 'missed'
  | 'declined';

export function formatScheduledTime(date: Date): string {
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildCallRequestPreview(status: CallStatus, scheduledTime?: Date): string {
  const timeLabel = scheduledTime ? formatScheduledTime(scheduledTime) : '';
  const statusLabels: Record<CallStatus, string> = {
    pending: 'Call request pending',
    accepted: 'Call accepted',
    rejected: 'Call rejected',
    cancelled: 'Call cancelled',
    ongoing: 'Call in progress',
    completed: 'Call completed',
    missed: 'Call missed',
    declined: 'Call declined',
  };
  const label = statusLabels[status] || 'Call request';
  return timeLabel ? `${label} · ${timeLabel}` : label;
}

export function buildCallNotificationContent(
  status: CallStatus,
  actorName: string,
  scheduledTime?: Date
): { title: string; message: string } {
  const timeLabel = scheduledTime ? formatScheduledTime(scheduledTime) : '';
  switch (status) {
    case 'pending':
      return {
        title: 'New call request',
        message: timeLabel
          ? `${actorName} scheduled a call for ${timeLabel}`
          : `${actorName} sent you a call request`,
      };
    case 'accepted':
      return {
        title: 'Call accepted',
        message: timeLabel
          ? `${actorName} accepted your call for ${timeLabel}`
          : `${actorName} accepted your call request`,
      };
    case 'rejected':
      return {
        title: 'Call rejected',
        message: `${actorName} rejected your call request`,
      };
    case 'cancelled':
      return {
        title: 'Call cancelled',
        message: `${actorName} cancelled the call request`,
      };
    case 'ongoing':
      return {
        title: 'Call started',
        message: `${actorName} started the call`,
      };
    case 'completed':
      return {
        title: 'Call completed',
        message: `Call with ${actorName} has ended`,
      };
    case 'missed':
      return {
        title: 'Missed call',
        message: `You missed a call from ${actorName}`,
      };
    case 'declined':
      return {
        title: 'Call declined',
        message: `${actorName} declined the call`,
      };
    default:
      return { title: 'Call update', message: `Call status updated to ${status}` };
  }
}

export function getCallStatusNotificationRecipient(
  status: CallStatus,
  callerId: string,
  receiverId: string,
  actorId: string
): string {
  if (status === 'pending') {
    return receiverId;
  }
  if (actorId === receiverId) {
    return callerId;
  }
  return receiverId;
}
