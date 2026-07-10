# Chat and Message Deletion APIs

These APIs allow mobile applications to delete entire chats (conversations) or individual chat messages.

---

## 1. Delete Chat
Deletes a chat conversation and all messages within it. Only participants of the chat can perform this action.

- **Endpoint:** `DELETE /api/app/chats/:chatId`
- **Authentication:** Required (Bearer Token)
- **URL Parameters:**
  - `chatId` (string, required): The unique room ID of the chat.

### Headers:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Success Response:
- **Code:** `200 OK`
- **Body:**
```json
{
  "success": true,
  "message": "Chat deleted successfully",
  "data": {
    "success": true
  }
}
```

### Error Responses:
- **Code:** `404 Not Found` (Chat does not exist or user is not a participant)
```json
{
  "success": false,
  "message": "Chat not found"
}
```

---

## 2. Delete Message
Deletes a specific message inside a chat. Only participants of the chat can perform this action. If the deleted message was the last message in the chat, the conversation preview (sender, message snippet, time) is automatically updated to the previous message.

- **Endpoint:** `DELETE /api/app/chats/:chatId/messages/:messageId`
- **Authentication:** Required (Bearer Token)
- **URL Parameters:**
  - `chatId` (string, required): The unique room ID of the chat.
  - `messageId` (string, required): The `_id` of the message to delete.

### Headers:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Success Response:
- **Code:** `200 OK`
- **Body:**
```json
{
  "success": true,
  "message": "Message deleted successfully",
  "data": {
    "success": true
  }
}
```

### Error Responses:
- **Code:** `404 Not Found` (Chat or message does not exist, or user is not a participant)
```json
{
  "success": false,
  "message": "Message not found"
}
```
