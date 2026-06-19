# Mobile Developer API Documentation: Notification System

This document outlines the API endpoints that the mobile application (iOS & Android) must integrate to display, paginate, and manage user notifications.

---

## 1. Authentication
All endpoints require a bearer authentication token in the request headers:

```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

---

## 2. Endpoints

### A. Get Notifications List (with Pagination & Unread Count)
Retrieve a paginated list of notifications targeting the authenticated user (including direct notifications and system broadcast messages).

* **URL**: `/api/app/notifications`
* **Method**: `GET`
* **Headers**:
  * `Authorization: Bearer <ACCESS_TOKEN>`
* **Query Parameters**:
  * `page` (optional, default `1`): The page number to fetch.
  * `limit` (optional, default `10`): Number of notifications per page.

#### Example Request
```http
GET /api/app/notifications?page=1&limit=10 HTTP/1.1
Host: api.yourdomain.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Example Response (Success `200 OK`)
```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": {
    "notifications": [
      {
        "_id": "648a1d2f83f1234567890abc",
        "title": "Product Approved",
        "message": "Your product \"iPhone 13 Pro\" has been approved.",
        "recipient": "648a1d2f83f4567890abcdef",
        "sender": {
          "_id": "648a1d2f83f9876543210fed",
          "firstName": "Admin",
          "lastName": "User",
          "email": "admin@example.com"
        },
        "type": "product_approved",
        "metadata": {
          "productId": "648a1d2f83f0011223344556"
        },
        "isRead": false,
        "createdAt": "2026-06-19T12:00:00.000Z",
        "updatedAt": "2026-06-19T12:00:00.000Z"
      },
      {
        "_id": "648b2e3f83f0987654321abc",
        "title": "System Maintenance Announcement",
        "message": "The system will undergo scheduled maintenance from 2 AM to 4 AM UTC tomorrow.",
        "recipient": "all",
        "sender": {
          "_id": "648a1d2f83f9876543210fed",
          "firstName": "Admin",
          "lastName": "User",
          "email": "admin@example.com"
        },
        "type": "broadcast",
        "isRead": true,
        "createdAt": "2026-06-19T10:30:00.000Z",
        "updatedAt": "2026-06-19T10:45:00.000Z"
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "unreadCount": 1
  }
}
```

---

### B. Mark Notification as Read
Mark a specific notification (either personal or a system-wide broadcast message) as read.

* **URL**: `/api/app/notifications/:id/read`
* **Method**: `PATCH`
* **Headers**:
  * `Authorization: Bearer <ACCESS_TOKEN>`
* **Path Parameters**:
  * `id`: The unique MongoDB `_id` of the notification to be marked as read.

#### Example Request
```http
PATCH /api/app/notifications/648a1d2f83f1234567890abc/read HTTP/1.1
Host: api.yourdomain.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Example Response (Success `200 OK`)
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "success": true
  }
}
```

---

## 3. Firebase Cloud Messaging (FCM) Integration
For real-time push notifications, the mobile app should configure Firebase Cloud Messaging. 

### Registering FCM Tokens
To receive push notifications, the mobile client must upload/register their device FCM Token. Make sure to call your existing token registration endpoint (typically `PUT /api/app/users/profile` or the profile update route) with the following structure:
```json
{
  "fcmTokens": [
    {
      "token": "d8X3...example_token",
      "deviceType": "android" 
    }
  ]
}
```
*(Acceptable values for `deviceType` are: `"android"`, `"ios"`, `"web"`)*

### Push Notification Payload Format
When a notification is dispatched, it arrives via FCM multicast with the following structure:

```json
{
  "notification": {
    "title": "Product Approved",
    "body": "Your product \"iPhone 13 Pro\" has been approved."
  },
  "data": {
    "productId": "648a1d2f83f0011223344556"
  }
}
```
* **Use case**: You can extract the `productId` or other keys inside the custom `data` object to handle navigation actions (e.g., redirecting the user to the specific product details screen when they tap the push notification).
