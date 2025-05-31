# 🔌 API Reference

*Complete API documentation for the Arcadia Gaming Platform*

## 📍 **Base URL**

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## 🔐 **Authentication**

All API endpoints require authentication via Supabase Auth. Include the auth token in headers:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_AUTH_TOKEN',
  'Content-Type': 'application/json'
}
```

---

## 🎮 **Bingo Sessions API**

### **Create Session**
```http
POST /api/bingo/sessions
```

**Request Body:**
```json
{
  "boardId": "uuid",
  "displayName": "Player Name",
  "color": "#FF6B6B",
  "team": null
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "session_code": "ABC123",
    "status": "waiting",
    "current_state": [...],
    "version": 1
  },
  "player": {
    "id": "uuid",
    "display_name": "Player Name",
    "color": "#FF6B6B",
    "is_host": true
  }
}
```

### **Join Session by Code**
```http
POST /api/bingo/sessions/join-by-code
```

**Request Body:**
```json
{
  "session_code": "ABC123",
  "user_id": "uuid",
  "display_name": "Player 2",
  "avatar_url": "https://..."
}
```

**Response:**
```json
{
  "session": { ... },
  "player": { ... }
}
```

### **Get Session Board State**
```http
GET /api/bingo/sessions/{id}/board-state
```

**Response:**
```json
{
  "current_state": [
    {
      "id": "uuid",
      "content": "Challenge text",
      "position": 0,
      "isMarked": false
    }
  ],
  "version": 5
}
```

### **Update Board State**
```http
PATCH /api/bingo/sessions/{id}/board-state
```

**Request Body:**
```json
{
  "board_state": [...],
  "version": 5
}
```

**Response:**
```json
{
  "id": "uuid",
  "current_state": [...],
  "version": 6
}
```

### **Mark/Unmark Cell**
```http
POST /api/bingo/sessions/{id}/mark-cell
```

**Request Body:**
```json
{
  "cell_position": 4,
  "user_id": "uuid",
  "action": "mark", // or "unmark"
  "version": 6
}
```

**Response:**
```json
{
  "id": "uuid",
  "current_state": [...],
  "version": 7
}
```

### **Start Session**
```http
POST /api/bingo/sessions/{id}/start
```

**Response:**
```json
{
  "id": "uuid",
  "status": "active",
  "started_at": "2025-05-31T..."
}
```

### **List Sessions**
```http
GET /api/bingo/sessions?boardId={uuid}&status=active
```

**Query Parameters:**
- `boardId` (required): Board UUID
- `status`: Filter by status (waiting/active/completed)

**Response:**
```json
[
  {
    "id": "uuid",
    "session_code": "ABC123",
    "status": "active",
    "players": [...]
  }
]
```

---

## 👥 **Players API**

### **Get Session Players**
```http
GET /api/bingo/sessions/players?sessionId={uuid}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "display_name": "Player 1",
    "color": "#FF6B6B",
    "is_host": true,
    "is_ready": true,
    "score": 0
  }
]
```

### **Join Session**
```http
POST /api/bingo/sessions/join
```

**Request Body:**
```json
{
  "sessionId": "uuid",
  "displayName": "Player Name",
  "color": "#4ECDC4",
  "team": 1
}
```

---

## 📋 **Bingo Boards API**

### **Create Board**
```http
POST /api/bingo
```

**Request Body:**
```json
{
  "title": "Board Title",
  "description": "Description",
  "size": "5x5",
  "difficulty": "medium",
  "visibility": "public",
  "cards": ["card-id-1", "card-id-2", ...],
  "tags": ["tag1", "tag2"]
}
```

### **Get Board**
```http
GET /api/bingo/{id}
```

### **Update Board**
```http
PATCH /api/bingo/{id}
```

### **Delete Board**
```http
DELETE /api/bingo/{id}
```

---

## 💬 **Discussions API**

### **Create Discussion**
```http
POST /api/discussions
```

**Request Body:**
```json
{
  "title": "Discussion Title",
  "content": "Content here...",
  "game_type": "minecraft",
  "tags": ["help", "tips"]
}
```

### **List Discussions**
```http
GET /api/discussions?game_type=minecraft&limit=20&offset=0
```

**Query Parameters:**
- `game_type`: Filter by game
- `tags`: Filter by tags (comma-separated)
- `limit`: Results per page (default: 20)
- `offset`: Pagination offset

---

## 📝 **Submissions API**

### **Submit Board Completion**
```http
POST /api/submissions
```

**Request Body:**
```json
{
  "board_id": "uuid",
  "content": "Completion proof",
  "media_urls": ["https://..."]
}
```

---

## ⚡ **Real-time Events**

### **WebSocket Connection**
```javascript
const channel = supabase
  .channel('session:SESSION_ID')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'bingo_sessions',
    filter: 'id=eq.SESSION_ID'
  }, handleUpdate)
  .subscribe()
```

### **Event Types**
- `cell_marked`: Cell marked by player
- `cell_unmarked`: Cell unmarked
- `player_joined`: New player joined
- `player_left`: Player left session
- `game_started`: Session started
- `game_completed`: Session completed

---

## 🚨 **Error Responses**

### **400 Bad Request**
```json
{
  "error": "Invalid request body"
}
```

### **401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

### **404 Not Found**
```json
{
  "error": "Resource not found"
}
```

### **409 Conflict**
```json
{
  "error": "Version conflict",
  "current_version": 7
}
```

### **429 Rate Limited**
```json
{
  "error": "Too many requests"
}
```

### **500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

---

## 🔧 **Rate Limiting**

- **Default**: 100 requests per minute per IP
- **Authenticated**: 500 requests per minute per user
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

## 📚 **Related Documentation**

- [`MULTIPLAYER_GUIDE.md`](../MULTIPLAYER_GUIDE.md) - Multiplayer system overview
- [`DATABASE_SCHEMA.md`](../architecture/DATABASE_SCHEMA.md) - Database structure
- [`HOOK_REFERENCE.md`](../HOOK_REFERENCE.md) - Frontend integration