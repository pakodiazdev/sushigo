# API Client Architecture

## 📋 Overview

The frontend uses a centralized API client configuration to ensure consistent communication with the backend API.

## 🏗️ Architecture

### Centralized Configuration

**File**: `src/lib/api-client.ts`

This file exports a single, pre-configured axios instance (`apiClient`) that all API calls should use.

#### Features:

1. **Centralized Base URL**
   - Configured via `VITE_API_URL` environment variable
   - Default: `http://localhost:8080/api/v1`
   - Easy to change for different environments (dev, staging, production)

2. **Automatic Authentication**
   - Request interceptor automatically adds `Bearer` token from localStorage
   - Reads from `auth-storage` (Zustand store)
   - No need to manually add auth headers in each API call

3. **Global Error Handling**
   - Response interceptor handles 401 (Unauthorized) errors
   - Automatically redirects to `/login` and clears auth storage
   - Consistent error handling across the app

4. **Standard Headers**
   - `Content-Type: application/json`
   - `Accept: application/json`

## 📁 File Structure

```
src/
├── lib/
│   └── api-client.ts          # ⭐ Centralized API client
├── services/
│   └── inventory-api.ts       # Uses apiClient
└── components/
    └── inventory/
        ├── location-form.tsx  # Uses apiClient
        ├── variant-form.tsx   # Uses apiClient
        ├── opening-balance-form.tsx  # Uses apiClient
        └── stock-out-form.tsx # Uses apiClient
```

## 🚀 Usage

### Import the Client

```typescript
import { apiClient } from '@/lib/api-client'
```

### Make API Calls

```typescript
// GET request
const response = await apiClient.get('/inventory-locations')

// GET with params
const response = await apiClient.get('/items', {
  params: { type: 'PRODUCTO', is_active: true }
})

// POST request
const response = await apiClient.post('/items', {
  sku: 'PROD-001',
  name: 'Product Name'
})

// PUT request
const response = await apiClient.put('/items/123', {
  name: 'Updated Name'
})

// DELETE request
await apiClient.delete('/items/123')
```

### Example: Creating an API Service

```typescript
// src/services/inventory-api.ts
import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse, Item } from '@/types/inventory'

export const itemApi = {
  list: (params?: { type?: string; is_active?: boolean }) =>
    apiClient.get<PaginatedResponse<Item>>('/items', { params }),

  get: (id: number) =>
    apiClient.get<Item>(`/items/${id}`),

  create: (data: Partial<Item>) =>
    apiClient.post<Item>('/items', data),

  update: (id: number, data: Partial<Item>) =>
    apiClient.put<Item>(`/items/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/items/${id}`),
}
```

### Example: Using in a Component

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

function MyComponent() {
  const { data } = useQuery({
    queryKey: ['operating-units'],
    queryFn: async () => {
      const response = await apiClient.get('/operating-units')
      return response.data.data
    },
  })

  return <div>{/* ... */}</div>
}
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root of the webapp directory:

```bash
# .env
VITE_API_URL=http://localhost:8080/api/v1
```

### Different Environments

**Development** (`.env.development`):
```bash
VITE_API_URL=http://localhost:8080/api/v1
```

**Production** (`.env.production`):
```bash
VITE_API_URL=https://api.sushigo.com/api/v1
```

**Staging** (`.env.staging`):
```bash
VITE_API_URL=https://staging-api.sushigo.com/api/v1
```

## 🔒 Authentication Flow

1. User logs in via `/login`
2. Backend returns JWT token
3. Frontend stores token in `auth-storage` (localStorage)
4. `apiClient` request interceptor reads token from storage
5. Automatically adds `Authorization: Bearer <token>` to all requests
6. If token expires (401 response), user is redirected to `/login`

## 🚫 What NOT to Do

❌ **DON'T** create new axios instances in components:
```typescript
// ❌ BAD
const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1'
})
```

❌ **DON'T** hardcode URLs:
```typescript
// ❌ BAD
const response = await axios.get('http://localhost:8080/api/v1/items')
```

❌ **DON'T** manually add auth headers:
```typescript
// ❌ BAD
const response = await apiClient.get('/items', {
  headers: {
    Authorization: `Bearer ${token}`  // Already handled by interceptor
  }
})
```

## ✅ Best Practices

✅ **DO** use the centralized `apiClient`:
```typescript
// ✅ GOOD
import { apiClient } from '@/lib/api-client'
const response = await apiClient.get('/items')
```

✅ **DO** create typed API services:
```typescript
// ✅ GOOD
export const itemApi = {
  list: () => apiClient.get<PaginatedResponse<Item>>('/items'),
}
```

✅ **DO** use relative paths (no base URL):
```typescript
// ✅ GOOD
apiClient.get('/items')  // Base URL is already configured
```

## 📊 Benefits

1. **Single Source of Truth**: One place to configure API URL
2. **Easy Environment Management**: Change `VITE_API_URL` and all calls update
3. **Consistent Auth**: All requests automatically authenticated
4. **Global Error Handling**: 401 errors handled in one place
5. **Type Safety**: TypeScript support for all API calls
6. **Maintainability**: Easier to update, test, and debug

## 🔄 Migration from Old Code

If you find code using direct axios calls, refactor it:

**Before**:
```typescript
import axios from 'axios'

const response = await axios.get('http://localhost:8080/api/v1/items')
```

**After**:
```typescript
import { apiClient } from '@/lib/api-client'

const response = await apiClient.get('/items')
```

## 📝 Summary

- ✅ Use `apiClient` from `@/lib/api-client` for ALL API calls
- ✅ Configure `VITE_API_URL` in `.env` file
- ✅ No need to manually handle auth tokens
- ✅ Automatic error handling for 401 responses
- ✅ Type-safe API calls with TypeScript
