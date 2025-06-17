# API Error Analysis for X_BUZZ_FLOW

## Summary of Issues Found

### 1. Missing Error Handling (No Try-Catch Blocks)
These endpoints have no error handling at all:

- `/api/check-vercel-limits/route.ts` - No try-catch, could fail on JSON parsing
- `/api/test-twitter-oauth/route.ts`
- `/api/auth/test-oauth/route.ts`
- `/api/auth/check-config/route.ts`
- `/api/auth/[...nextauth]/route.ts`
- `/api/auth/debug-full/route.ts`
- `/api/auth/verify-secret/route.ts`
- `/api/auth/twitter-test-pkce/route.ts`
- `/api/auth/debug/route.ts`
- `/api/env-check/route.ts`
- `/api/debug/nextauth/route.ts`

### 2. Parameter Validation Issues

#### Inconsistent Parameter Names
- Some routes use `[id]` while others use `[sessionId]` or `[draftId]`
- This can cause 404 errors if the wrong parameter name is used

#### Missing ID Validation
Most routes properly validate IDs with:
```typescript
if (!id || id === 'undefined' || id === 'null') {
  return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
}
```

However, some routes may be missing this validation.

### 3. Environment Variable Issues
All environment variables appear to be used directly without fallbacks:
- `process.env.OPENAI_API_KEY`
- `process.env.PERPLEXITY_API_KEY`
- `process.env.VERCEL_FUNCTION_MAX_DURATION`
- `process.env.CRON_SECRET`
- Various auth-related environment variables

**Risk**: If any environment variable is missing, the API will crash with undefined errors.

### 4. Database Query Issues

#### Common Patterns That Need Validation:
1. **Direct findUnique without null checks**:
   ```typescript
   const session = await prisma.viralSession.findUnique({ where: { id } })
   // Missing: if (!session) return 404
   ```

2. **Accessing nested properties without validation**:
   ```typescript
   session.concepts as any[] // Could fail if concepts is null
   ```

3. **Array operations on potentially null values**:
   ```typescript
   allConcepts.filter(concept => selectedIds.includes(concept.conceptId))
   // Could fail if allConcepts is not an array
   ```

### 5. Async/Promise Issues

#### Missing await on params in some routes:
- Older routes might not properly await the params Promise in Next.js 15
- This could cause "Cannot read property of undefined" errors

### 6. JSON Parsing Without Error Handling
Several routes parse JSON without try-catch:
```typescript
const body = await request.json() // Could throw if body is not valid JSON
```

### 7. Missing Status Updates on Error
Some routes update database status but don't revert on error:
```typescript
// Updates status to 'PROCESSING'
// If error occurs, status remains 'PROCESSING' forever
```

## Recommended Fixes

### 1. Add Standard Error Wrapper
Create a standard error handling wrapper for all API routes:
```typescript
export function withErrorHandler(handler: Function) {
  return async (request: Request, context: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('API Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
```

### 2. Add Environment Variable Validation
Create an env validation file:
```typescript
export function validateEnv() {
  const required = ['OPENAI_API_KEY', 'DATABASE_URL', ...]
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
  }
}
```

### 3. Standardize Parameter Names
- Use consistent naming: `[id]` for all resource IDs
- Or use descriptive names consistently: `[sessionId]`, `[draftId]`, etc.

### 4. Add Input Validation Middleware
```typescript
export function validateId(id: string) {
  if (!id || id === 'undefined' || id === 'null') {
    throw new Error('Invalid ID')
  }
}
```

### 5. Safe JSON Parsing
```typescript
export async function safeJsonParse(request: Request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}
```

## High Priority Fixes

1. **Auth Routes** - Add error handling to all `/api/auth/*` routes
2. **Database Queries** - Add null checks after all findUnique calls
3. **Environment Variables** - Add validation on app startup
4. **JSON Parsing** - Wrap all request.json() calls in try-catch
5. **Status Management** - Ensure database status is reverted on errors