# Socket.io Real-Time Chat Integration Documentation for Mobile Developers

This document explains the Socket.io connection details, events, and database schema mappings for the real-time chat backend.

## 1. Connection & Handshake
The Socket.io server requires authentication via a JSON Web Token (JWT). Pass the token in the `auth` handshake object or the `Authorization` header.

* **Connection URL**: `ws://<your-server-url>`
* **Handshake Example (React Native)**:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://<your-server-url>', {
  transports: ['websocket'],
  auth: {
    token: 'YOUR_JWT_TOKEN' // Pass JWT token here
  }
});
```

---

## 2. Real-Time Socket Events

### A. Client-to-Server Events

#### 1. `join_room`
Join a specific chat room conversation to receive messages.
* **Payload**:
```json
{
  "chatId": "userAId_userBId"
}
```

#### 2. `send_message`
Send a new message (text, media, call requests, etc.).
* **Payload**:
```json
{
  "chatId": "userAId_userBId",
  "text": "Hello, is this available?",
  "media": [
    { "url": "https://cloudinary-image-url.com/image.jpg" }
  ],
  "chat_type": "text", // "text" | "call_request" | "call_type"
  "productData": {     // Optional (if started from product listing)
    "id": "prod_123",
    "_id": "prod_123",
    "name": "Listing Title",
    "price": 500,
    "media": "https://img.com/pic.jpg",
    "location": "New York"
  },
  "status": "pending" // Optional status for calls/schedules (e.g. 'scheduled')
}
```

#### 3. `mark_as_read`
Clears unread message count and updatesseenAt status for messages in this conversation.
* **Payload**:
```json
{
  "chatId": "userAId_userBId"
}
```

#### 4. `update_message_status`
Update a message status (e.g., accepting/rejecting call requests).
* **Payload**:
```json
{
  "chatId": "userAId_userBId",
  "messageId": "msg_6675e...",
  "status": "accepted" // pending, accepted, rejected, cancelled, ongoing, completed, missed, declined, scheduled
}
```

---

### B. Server-to-Client Events (Listening)

#### 1. `new_message`
Fires when a new message is received in the joined room.
* **Response Payload (Message Object)**:
```json
{
  "_id": "667a4d5e...",
  "chatId": "userAId_userBId",
  "sender": {
    "_id": "667a4d...",
    "firstName": "John",
    "lastName": "Doe",
    "profileImage": null
  },
  "text": "Hello, is this available?",
  "media": [],
  "chat_type": "text",
  "seenAt": null,
  "createdAt": "2026-06-24T10:10:00.000Z",
  "updatedAt": "2026-06-24T10:10:00.000Z"
}
```

#### 2. `chat_list_update`
Fires whenever a room is updated (unread counts change, last message preview changes, new room created).
* **Response Payload (Chat Room Object)**:
```json
{
  "_id": "667a4d...",
  "id": "userAId_userBId",
  "participantKey": "userAId::userBId",
  "participants": ["667a4d...", "667a4e..."],
  "participantDetails": {
    "667a4d...": { "name": "John Doe", "image": "https://profile-img.com" },
    "667a4e...": { "name": "Jane Smith", "image": "" }
  },
  "unreadCounts": {
    "667a4d...": 0,
    "667a4e...": 1
  },
  "lastMessagePreview": "Hello, is this available?",
  "lastMessageSenderId": "667a4d...",
  "lastMessageAt": "2026-06-24T10:10:00.000Z"
}
```

#### 3. `messages_seen`
Fires when a participant marks the conversation as read.
* **Response Payload**:
```json
{
  "chatId": "userAId_userBId",
  "userId": "667a4d...",
  "seenAt": "2026-06-24T10:15:00.000Z"
}
```

#### 4. `message_status_updated`
Fires when a message status is updated.
* **Response Payload**:
```json
{
  "messageId": "msg_6675e...",
  "status": "accepted"
}
```

---

## 3. Fallback HTTP Endpoints

For initial load and pagination, matching HTTP endpoints are available:

* **GET `/v1/api/app/chats`**: List paginated inbox chat rooms for the authenticated user.
* **GET `/v1/api/app/chats/:chatId/messages`**: Fetch paginated messages in a chat conversation.
* **POST `/v1/api/app/chats`**: Create/initialize a room with a participant.
  * Body: `{ "participantId": "667a4e..." }`
