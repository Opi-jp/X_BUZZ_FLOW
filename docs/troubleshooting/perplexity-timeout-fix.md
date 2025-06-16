# Perplexity API Timeout Fix

## Problem
The application was using `AbortSignal.timeout()` which can cause compatibility issues in certain environments, even though it's supported in Node.js 16.14+.

## Error Message
```
AbortSignal.timeout is not a function
```

## Solution
Replace `AbortSignal.timeout()` with a more compatible `AbortController` implementation.

### Files Fixed
1. `/lib/perplexity.ts` - Line 96
2. `/app/api/news/collect/start/route.ts` - Line 118

### Before (Problematic Code)
```typescript
signal: AbortSignal.timeout(30000) // 30秒のタイムアウト
```

### After (Fixed Code)
```typescript
// Create AbortController for timeout (more compatible than AbortSignal.timeout)
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒のタイムアウト

const response = await fetch(url, {
  // ... other options
  signal: controller.signal
})

// Clear timeout if request completes
clearTimeout(timeoutId)
```

## Benefits
1. Better compatibility across different Node.js environments
2. More explicit timeout handling
3. Ability to clear timeout if request completes early
4. Works with all Node.js versions that support AbortController (Node.js 15+)

## Testing
The fix has been tested and confirmed to work with:
- Direct Perplexity API calls
- Phase 1 Execute in the CoT system
- RSS feed collection

## Additional Notes
- `AbortSignal.timeout()` was introduced in Node.js 16.14.0
- Some environments or build tools may not properly support it
- The `AbortController` approach is more widely supported and reliable