# Aegisum API Documentation

Base URL: `https://aegisum.co.za/api`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Authentication

#### POST /auth/initialize
Initialize user from Telegram WebApp data.

**Request Body:**
```json
{
  "telegramId": 123456789,
  "username": "testuser",
  "firstName": "Test",
  "lastName": "User",
  "languageCode": "en"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "telegramId": 123456789,
    "username": "testuser",
    "firstName": "Test",
    "lastName": "User",
    "aegtBalance": "0",
    "tonBalance": "0",
    "minerLevel": 1,
    "energyCapacity": 1000
  }
}
```

#### POST /auth/login
Login user and get JWT tokens.

**Request Body:**
```json
{
  "telegramId": 123456789
}
```

**Response:**
```json
{
  "success": true,
  "user": { /* user object */ },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

### Mining

#### GET /mining/status
Get current mining status for authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "isActive": true,
    "hashrate": 100,
    "currentBlock": 12345,
    "blockStartTime": "2023-12-12T10:00:00Z",
    "progress": 45.5,
    "timeRemaining": 98000,
    "blocksMined": 15,
    "totalRewards": "15000000000",
    "energy": {
      "current": 750,
      "max": 1000,
      "regenRate": 250
    },
    "minerLevel": 1
  }
}
```

#### POST /mining/start
Start mining operation.

**Response:**
```json
{
  "success": true,
  "message": "Mining started successfully",
  "data": {
    "blockNumber": 12346,
    "hashrate": 100,
    "energyUsed": 99,
    "estimatedCompletion": "2023-12-12T10:03:00Z"
  }
}
```

#### POST /mining/stop
Stop current mining operation.

**Response:**
```json
{
  "success": true,
  "message": "Mining stopped successfully"
}
```

#### GET /mining/history
Get mining history with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `type` (optional): Filter by type ('all', 'solo', 'pool')

**Response:**
```json
{
  "success": true,
  "data": {
    "blocks": [
      {
        "id": 1,
        "blockNumber": 12345,
        "blockHash": "0x1234...",
        "hashrate": 100,
        "reward": "1000000000",
        "treasuryFee": "100000000",
        "isSolo": true,
        "energyUsed": 99,
        "minedAt": "2023-12-12T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "pages": 1
    },
    "stats": {
      "totalBlocks": 15,
      "totalRewards": "15000000000",
      "soloBlocks": 3,
      "poolBlocks": 12,
      "avgHashrate": 100,
      "lastMining": "2023-12-12T10:00:00Z"
    }
  }
}
```

### Energy

#### GET /energy/status
Get current energy status.

**Response:**
```json
{
  "success": true,
  "data": {
    "current": 750,
    "max": 1000,
    "regenRate": 250,
    "lastUpdate": 1702377600000
  }
}
```

#### POST /energy/refill
Refill energy using TON payment.

**Request Body:**
```json
{
  "amount": 500,
  "transactionHash": "0xabcd..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Energy refilled successfully",
  "data": {
    "energyAdded": 500,
    "newTotal": 1000,
    "tonCost": "0.05"
  }
}
```

### User

#### GET /user/profile
Get user profile information.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "telegramId": 123456789,
    "username": "testuser",
    "firstName": "Test",
    "lastName": "User",
    "aegtBalance": "15000000000",
    "tonBalance": "0",
    "minerLevel": 1,
    "energyCapacity": 1000,
    "createdAt": "2023-12-01T00:00:00Z",
    "updatedAt": "2023-12-12T10:00:00Z"
  }
}
```

#### GET /user/balance
Get user balance information.

**Response:**
```json
{
  "success": true,
  "balance": {
    "aegt": "15000000000",
    "ton": "0"
  }
}
```

### Upgrades

#### GET /upgrades
Get available upgrades.

**Response:**
```json
{
  "success": true,
  "upgrades": [
    {
      "id": 1,
      "name": "Miner Level 2",
      "description": "Increase hashrate to 200 H/s",
      "upgradeType": "miner",
      "levelRequirement": 1,
      "costTon": "100000000",
      "benefitValue": 100,
      "benefitType": "hashrate",
      "isActive": true
    }
  ]
}
```

#### POST /upgrades/:id/purchase
Purchase an upgrade.

**Request Body:**
```json
{
  "transactionHash": "0xabcd..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Upgrade purchased successfully",
  "data": {
    "upgradeId": 1,
    "tonPaid": "100000000",
    "newLevel": 2,
    "newHashrate": 200
  }
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2023-12-12T10:00:00Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Request validation failed
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict
- `TOO_MANY_REQUESTS` (429): Rate limit exceeded
- `INTERNAL_ERROR` (500): Server error

## Rate Limits

- Authentication endpoints: 10 requests per 15 minutes per IP
- Mining endpoints: 30 requests per minute per IP
- General API: 100 requests per 15 minutes per IP
- User-specific: 60 requests per minute per user

## WebSocket Events (Future)

The API will support WebSocket connections for real-time updates:

- `mining:progress` - Mining progress updates
- `mining:complete` - Block completion notifications
- `energy:update` - Energy regeneration updates
- `balance:update` - Balance change notifications

## SDK Usage Examples

### JavaScript/TypeScript

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://aegisum.co.za/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Start mining
const startMining = async () => {
  try {
    const response = await api.post('/mining/start');
    console.log('Mining started:', response.data);
  } catch (error) {
    console.error('Failed to start mining:', error.response.data);
  }
};

// Get mining status
const getMiningStatus = async () => {
  try {
    const response = await api.get('/mining/status');
    return response.data.data;
  } catch (error) {
    console.error('Failed to get status:', error.response.data);
  }
};
```

### Python

```python
import requests

class AegisumAPI:
    def __init__(self, token):
        self.base_url = 'https://aegisum.co.za/api'
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def start_mining(self):
        response = requests.post(
            f'{self.base_url}/mining/start',
            headers=self.headers
        )
        return response.json()
    
    def get_mining_status(self):
        response = requests.get(
            f'{self.base_url}/mining/status',
            headers=self.headers
        )
        return response.json()['data']
```