# 🔐 Task #004: Authentication System Implementation (Login with Zustand & Passport)

## 📖 Story
As a developer, I need to implement a complete authentication system with login, session persistence, and protected routes, so that users can securely access the application using OAuth tokens from the backend API.

---

## ✅ Technical Tasks

### Backend
- [x] 🔒 Configure Passport OAuth keys permissions (600 for private, 644 for public)
- [x] 🗄️ Create PassportClientSeeder (Development & Production)
- [x] 🔧 Update init.sh to auto-generate Passport keys if missing
- [x] ✅ Verify admin user exists: admin@sushigo.com / admin123456

### Frontend
- [x] 📦 Install Zustand for state management
- [x] 🏪 Create auth.store.ts with Zustand (replacing AuthContext)
- [x] 🔌 Create API client with axios interceptors
- [x] 🔧 Create auth.service.ts with typed API methods
- [x] 🖼️ Create Login page with form validation
- [x] 🛡️ Implement authentication check in Layout component
- [x] 🚪 Add logout functionality in Header
- [x] 🗑️ Remove AuthContext and ProtectedRoute (replaced by Zustand)
- [x] ✨ Add loading states and error handling

---

## 📋 Implementation Details

### 1. Passport Configuration

#### Keys Permissions
- **oauth-private.key**: `600` (read/write owner only)
- **oauth-public.key**: `644` (read for all, write owner only)

#### OAuth Clients Created by Seeder
```php
// PassportClientSeeder (LockedSeeder)
- Personal Access Client (UUID)
  - grant_types: ['personal_access']
  - provider: null

- Password Grant Client (UUID)
  - grant_types: ['password', 'refresh_token']
  - provider: 'users'
```

**Location**:
- `database/seeders/Development/PassportClientSeeder.php`
- `database/seeders/Production/PassportClientSeeder.php`

**Seeder Type**: `LockedSeeder` (runs once, locks automatically)

#### init.sh Improvements
```bash
# Checks if oauth keys exist, generates if missing
if [ ! -f "$PASSPORT_PRIVATE_KEY" ] || [ ! -f "$PASSPORT_PUBLIC_KEY" ]; then
    php artisan passport:keys --force
fi

# Sets correct permissions (after general storage permissions)
chmod 600 storage/oauth-private.key
chmod 644 storage/oauth-public.key
```

### 2. Frontend State Management Migration

#### From Context API to Zustand

**Before (Context API)**:
- `AuthContext.tsx` with Provider wrapper
- Required wrapping in `__root.tsx`
- More boilerplate code

**After (Zustand)**:
- `stores/auth.store.ts` with persist middleware
- No Provider needed
- Cleaner, more performant

#### Auth Store Structure
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}
```

**Features**:
- ✅ Automatic localStorage persistence
- ✅ Token validation on mount
- ✅ TypeScript typed
- ✅ Better performance with granular updates

### 3. API Integration

#### Axios Client (`lib/api-client.ts`)
- Base URL: `http://localhost:8080/api/v1`
- Request interceptor: Injects Bearer token
- Response interceptor: Handles 401 errors, redirects to login

#### Auth Service (`services/auth.service.ts`)
**Endpoints**:
- POST `/auth/login` - User login
- POST `/auth/logout` - User logout
- GET `/auth/me` - Get authenticated user
- POST `/auth/register` - User registration

**Response Types**: Fully typed with TypeScript interfaces

### 4. Component Updates

#### Login Page (`pages/Login.tsx`)
- Route: `/login`
- Form with email/password validation
- Error display from store
- Loading state with spinner
- Demo credentials shown
- Uses Zustand: `useAuthStore()`

#### Layout (`components/layout/Layout.tsx`)
- Calls `initializeAuth()` on mount
- Shows loading spinner during auth check
- Redirects unauthenticated users to /login
- Hides sidebar/header on login page
- Uses Zustand: `useAuthStore()`

#### Header (`components/layout/Header.tsx`)
- Displays user name from store
- Logout button with icon
- Calls `logout()` from store
- Redirects to /login after logout
- Uses Zustand: `useAuthStore()`

#### Root Route (`pages/__root.tsx`)
- Simplified: No AuthProvider wrapper needed
- Direct Layout component export

### 5. Files Removed
- ❌ `contexts/AuthContext.tsx` (replaced by Zustand)
- ❌ `components/ProtectedRoute.tsx` (logic moved to Layout)

---

## 🔄 Authentication Flow

1. **Initial Load**:
   - `Layout.tsx` calls `initializeAuth()`
   - Checks localStorage for token
   - If token exists, calls `/auth/me` to validate
   - Sets user and isAuthenticated state

2. **Login**:
   - User submits credentials
   - `auth.store.ts` calls `authService.login()`
   - Stores token and user in localStorage
   - Redirects to Dashboard

3. **API Requests**:
   - Axios interceptor adds Bearer token to all requests
   - If 401 response, clears token and redirects to login

4. **Logout**:
   - Calls `/auth/logout` API
   - Clears localStorage
   - Redirects to /login

5. **Protected Routes**:
   - Layout checks `isAuthenticated`
   - Redirects to /login if false
   - Shows content if true

---

## 🧪 Testing

### Backend
```bash
# Check seeder status
php artisan seeder:status

# Verify OAuth clients exist
php artisan tinker --execute="DB::table('oauth_clients')->count()"

# Check admin user
php artisan tinker --execute="App\Models\User::where('email', 'admin@sushigo.com')->first()"

# Verify key permissions
ls -la storage/oauth-*.key
# Expected: -rw------- oauth-private.key (600)
# Expected: -rw-r--r-- oauth-public.key (644)
```

### Frontend
```bash
# Start dev server
cd /app/code/webapp
npm run dev

# Login at http://localhost:5174/login
# Credentials: admin@sushigo.com / admin123456
```

### Manual Testing
1. ✅ Visit app → Redirects to /login
2. ✅ Enter wrong credentials → Shows error
3. ✅ Enter correct credentials → Redirects to Dashboard
4. ✅ Refresh page → Stays authenticated
5. ✅ Click logout → Returns to login
6. ✅ Close browser, reopen → Still authenticated (localStorage)

---

## 📊 Database State

### Users (from config/seeders.php)
```php
[
  'admin@sushigo.com' => 'admin123456',  // super-admin role
  'demo@sushigo.com' => 'demo123456',    // user role
  'test@example.com' => 'password',      // user role
]
+ 10 random factory users
```

### OAuth Clients
```
✓ SushiGo Personal Access Client (UUID, locked)
✓ SushiGo Password Grant Client (UUID, locked)
```

### Seeder Status
```
PassportClientSeeder → 🔒 Locked
RoleSeeder          → 🔒 Locked
PermissionSeeder    → 🔒 Locked
UserSeeder          → ✓ Executed
UserRoleSeeder      → ✓ Executed
```

---

## 🚀 Docker Integration

With `docker-compose up`, the system automatically:
1. ✅ Checks for Passport keys, generates if missing
2. ✅ Sets correct permissions (600/644)
3. ✅ Runs migrations
4. ✅ Runs seeders (respects locks)
5. ✅ Creates OAuth clients
6. ✅ Creates admin user
7. ✅ System ready for login

---

## 📦 Dependencies Added

### Backend
- ✅ laravel/passport (already installed)

### Frontend
- ✅ zustand (v5.x)
- ✅ axios (already installed)

---

## 🎯 Conventions Followed

### Backend
- ✅ Seeder system with tracking & locking
- ✅ Used `LockedSeeder` base class for OAuth clients
- ✅ Ordered seeders by dependencies
- ✅ User credentials in `config/seeders.php`

### Frontend
- ✅ TypeScript typed interfaces
- ✅ Zustand for state management
- ✅ Service layer pattern (auth.service.ts)
- ✅ API client with interceptors
- ✅ Proper error handling

### Git (ready for commit)
```bash
# Backend changes
feat(auth): add Passport OAuth client seeder with auto-key generation

- Create PassportClientSeeder for Development and Production
- Update init.sh to auto-generate Passport keys if missing
- Set correct key permissions (600 private, 644 public)
- Add PassportClientSeeder to seeder orchestrators
- Use LockedSeeder base class for automatic locking
- Generate UUID-based client IDs for modern Passport

# Frontend changes
feat(auth): migrate authentication to Zustand state management

- Install zustand and create auth.store.ts with persist middleware
- Replace AuthContext with useAuthStore hook in all components
- Remove AuthContext.tsx and ProtectedRoute.tsx (no longer needed)
- Simplify __root.tsx (no Provider wrapper required)
- Add initializeAuth() call in Layout component
- Improve auth flow with automatic token validation
```

---

## ⏱️ Time

### 📊 Estimates
- **Optimistic:** `2h`
- **Pessimistic:** `4h`
- **Tracked:** `2h 45m`

### 📅 Sessions
```json
[
  { "date": "2025-11-04", "start": "17:00", "end": "20:30" },
  { "date": "2025-11-04", "start": "21:20", "end": "23:00" }
]
```

---

## ✅ Completion Checklist

- [x] Passport keys auto-generated with correct permissions
- [x] OAuth clients created via seeders (locked)
- [x] Admin user exists and working
- [x] Zustand store implemented with persistence
- [x] Login page functional with validation
- [x] Protected routes working
- [x] Logout functionality operational
- [x] Token persistence across page reloads
- [x] Error handling throughout
- [x] Loading states implemented
- [x] Documentation complete

---

## 🔗 Related Tasks

- **Task #001**: Setup (Docker, monorepo structure)
- **Task #002**: Auth API and Seeders (backend foundation)
- **Task #003**: TypeScript migration and routing (frontend foundation)
- **Task #004**: **[CURRENT]** Authentication system implementation

**Next**: Task #005 - Dashboard and navigation implementation

---

**Status**: ✅ **COMPLETED**
**Date**: 2025-11-04
**Author**: Development Team

