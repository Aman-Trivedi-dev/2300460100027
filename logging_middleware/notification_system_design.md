# Stage 1

## Notification System — REST API Design & Contract

### Core Actions Identified

A notification platform for logged-in users must support the following core actions:

1. **Fetch notifications** — retrieve all notifications for the logged-in user
2. **Fetch a single notification** — get details of one notification
3. **Mark as read** — mark one or all notifications as read
4. **Delete a notification** — remove a notification
5. **Get unread count** — badge count for the UI
6. **Real-time delivery** — push new notifications instantly via SSE or WebSocket

---

## REST API Endpoints

### 1. Get All Notifications

**GET** `/api/v1/notifications`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

**Query Params (optional):**
```
?page=1&limit=20&status=unread
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_001",
        "title": "New message received",
        "body": "You have a new message from Admin.",
        "type": "message",
        "isRead": false,
        "createdAt": "2026-06-11T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

---

### 2. Get Single Notification

**GET** `/api/v1/notifications/:id`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "notif_001",
    "title": "New message received",
    "body": "You have a new message from Admin.",
    "type": "message",
    "isRead": false,
    "createdAt": "2026-06-11T10:00:00Z"
  }
}
```

**Response `404 Not Found`:**
```json
{
  "success": false,
  "message": "Notification not found"
}
```

---

### 3. Mark Notification as Read

**PATCH** `/api/v1/notifications/:id/read`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "notif_001",
    "isRead": true
  }
}
```

---

### 4. Mark All Notifications as Read

**PATCH** `/api/v1/notifications/read-all`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 12
  }
}
```

---

### 5. Delete a Notification

**DELETE** `/api/v1/notifications/:id`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

### 6. Get Unread Notification Count

**GET** `/api/v1/notifications/unread-count`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 7
  }
}
```

---

## Real-Time Notification Mechanism

### Approach: Server-Sent Events (SSE)

SSE is preferred over WebSockets for one-directional server-to-client push (notifications), as it is simpler, works over HTTP/1.1, and auto-reconnects.

**Endpoint:**

**GET** `/api/v1/notifications/stream`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>",
  "Accept": "text/event-stream"
}
```

**Server Response (stream):**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"id":"notif_002","title":"Order shipped","body":"Your order #1234 has been shipped.","type":"order","isRead":false,"createdAt":"2026-06-11T11:00:00Z"}

data: {"id":"notif_003","title":"Promo alert","body":"Flash sale starts now!","type":"promo","isRead":false,"createdAt":"2026-06-11T11:05:00Z"}
```

**Client-side (JavaScript):**
```javascript
const es = new EventSource("/api/v1/notifications/stream", {
  headers: { Authorization: `Bearer ${token}` }
});

es.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  showNotificationBadge(notification);
};
```

### Alternative: WebSocket (for bi-directional needs)

If the frontend also needs to send acknowledgements in real time, WebSocket at `ws://yourdomain/ws/notifications` can be used instead.

---

## Summary Table

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | Get all notifications (paginated) |
| GET | `/api/v1/notifications/:id` | Get single notification |
| PATCH | `/api/v1/notifications/:id/read` | Mark one as read |
| PATCH | `/api/v1/notifications/read-all` | Mark all as read |
| DELETE | `/api/v1/notifications/:id` | Delete a notification |
| GET | `/api/v1/notifications/unread-count` | Get unread badge count |
| GET | `/api/v1/notifications/stream` | SSE stream for real-time push |

---

# Stage 2

## Persistent Storage Design

### Recommended Database: PostgreSQL (Relational)

**Why PostgreSQL?**

- Notifications are structured and relational (linked to users)
- Supports efficient indexed queries on `user_id`, `isRead`, `createdAt`
- JSONB column can store flexible `metadata` per notification type
- Strong ACID guarantees ensure no notification is lost
- Scales well with partitioning and indexing strategies

---

## DB Schema

### Table: `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,          -- e.g. 'message', 'order', 'promo'
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,                     -- flexible extra data per type
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

---

## SQL Queries Based on Stage 1 APIs

### 1. Get all notifications for a user (paginated)
```sql
SELECT id, title, body, type, is_read, created_at
FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

### 2. Get single notification
```sql
SELECT * FROM notifications
WHERE id = $1 AND user_id = $2;
```

### 3. Mark one notification as read
```sql
UPDATE notifications
SET is_read = TRUE
WHERE id = $1 AND user_id = $2;
```

### 4. Mark all notifications as read
```sql
UPDATE notifications
SET is_read = TRUE
WHERE user_id = $1 AND is_read = FALSE;
```

### 5. Delete a notification
```sql
DELETE FROM notifications
WHERE id = $1 AND user_id = $2;
```

### 6. Get unread count
```sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = $1 AND is_read = FALSE;
```

---

## Problems at Scale & Solutions

### Problem 1: Table becomes too large (millions of rows)
**Solution: Table Partitioning by `created_at`**
```sql
-- Partition notifications by month
CREATE TABLE notifications PARTITION BY RANGE (created_at);

CREATE TABLE notifications_2026_06
  PARTITION OF notifications
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```
Old partitions can be archived or dropped cheaply.

---

### Problem 2: Slow reads for unread count on large tables
**Solution: Materialized counter cache**

Maintain a separate `notification_counts` table and update it via triggers:
```sql
CREATE TABLE notification_counts (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  unread_count INT DEFAULT 0
);

-- Decrement on read, increment on insert via app logic or DB trigger
```

---

### Problem 3: Fan-out — sending to thousands of users at once
**Solution: Message Queue (Redis + Bull / RabbitMQ)**

Instead of writing to DB directly, push notification jobs to a queue. Workers consume and write to DB + push via SSE/WebSocket. This prevents DB overload during spikes.

---

### Problem 4: SSE connections don't scale across multiple servers
**Solution: Redis Pub/Sub**

Each server subscribes to a Redis channel per user. When a notification is created, publish to that channel — all servers receive it and push to their connected SSE clients.

```
Notification Created → Redis Publish(user_id, payload)
                          ↓
              All servers subscribed → push to SSE client
```

---

### Problem 5: Stale/old notifications taking up space
**Solution: TTL-based cleanup job**
```sql
-- Run nightly: delete notifications older than 90 days
DELETE FROM notifications
WHERE created_at < NOW() - INTERVAL '90 days'
  AND is_read = TRUE;
```

---

# Stage 3

## Query Analysis & Optimization

### The Original Query
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

---

### Is this query accurate?

**Functionally yes** — it correctly fetches unread notifications for a student ordered by oldest first. However it has serious **performance problems** at scale (50,000 students, 5,000,000 notifications).

---

### Why is it slow?

**1. No index on `(studentID, isRead)`**

Without a composite index, the database does a **full table scan** across all 5,000,000 rows to find matching records. At this scale that means reading millions of rows just to return a few dozen.

**2. `SELECT *` fetches all columns**

Fetching every column (including large `body`, `metadata` fields) increases I/O significantly. Only necessary columns should be selected.

**3. No LIMIT clause**

If a student has thousands of unread notifications, the query returns all of them at once — unbounded result sets are expensive for both DB and network.

---

### What to change

**Step 1 — Add a composite index:**
```sql
CREATE INDEX idx_notifications_student_unread
ON notifications(studentID, isRead, createdAt ASC);
```

This index covers all three clauses (`WHERE studentID`, `WHERE isRead`, `ORDER BY createdAt`) in one B-tree scan — turning a full table scan into a fast index lookup.

**Step 2 — Select only needed columns:**
```sql
SELECT id, title, body, type, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC
LIMIT 20;
```

**Step 3 — Add pagination** with `LIMIT` + `OFFSET` or cursor-based pagination.

---

### Computation Cost Comparison

| | Before (no index) | After (composite index) |
|---|---|---|
| Scan type | Full table scan | Index range scan |
| Rows examined | ~5,000,000 | ~few dozen |
| Time complexity | O(n) | O(log n) |
| Estimated time | Seconds | Milliseconds |

---

### Should you index every column?

**No — this advice is ineffective and harmful.**

Here's why:

- **Write penalty:** Every `INSERT`, `UPDATE`, and `DELETE` must update all indexes. With an index on every column, writes become significantly slower.
- **Storage cost:** Each index takes disk space. On 5M rows with many indexes, this adds up to GBs of overhead.
- **Query planner confusion:** Too many indexes can confuse the query optimizer — it may pick a suboptimal index.
- **Low-selectivity columns waste space:** Indexing a boolean like `isRead` alone is nearly useless since it only has 2 values. It works only as part of a composite index.

**Best practice:** Only index columns that appear in `WHERE`, `ORDER BY`, or `JOIN` clauses in your most frequent and slowest queries.

---

### Query: All students who got a Placement notification in the last 7 days

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL '7 days';
```

**With student details joined:**
```sql
SELECT DISTINCT n.studentID, s.name, s.email
FROM notifications n
JOIN students s ON s.id = n.studentID
WHERE n.notificationType = 'Placement'
  AND n.createdAt >= NOW() - INTERVAL '7 days';
```

**Recommended supporting index:**
```sql
CREATE INDEX idx_notifications_type_created
ON notifications(notificationType, createdAt DESC);
```

This allows the DB to jump directly to `Placement` notifications and scan only the last 7 days worth of rows, instead of scanning the full 5M row table.
