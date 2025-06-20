# Restrictive Status Checks Analysis

## Summary of Status Flow Issues

The API flow uses string-based status values without a proper enum, leading to potential mismatches and stuck flows. Here are all the restrictive status checks that could cause issues:

## 1. Status Values Used in the System

Based on the code analysis, these status values are used:
- `CREATED` - Initial session state
- `COLLECTING` - Perplexity is collecting topics
- `TOPICS_COLLECTED` - Topics have been collected
- `GENERATING_CONCEPTS` - GPT is generating concepts
- `CONCEPTS_GENERATED` - Concepts have been generated
- `GENERATING_CONTENT` / `GENERATING` - Claude is generating content
- `CONTENTS_GENERATED` - Contents have been generated  
- `COMPLETED` - All processing is done
- `ERROR` - An error occurred

## 2. Restrictive Status Checks Found

### `/api/generation/content/sessions/[id]/collect/route.ts` (Line 44)
```typescript
if (session.status !== 'CREATED') {
  return NextResponse.json(
    { error: 'Session already started' },
    { status: 400 }
  )
}
```
**Issue**: Only allows collecting topics if status is exactly `CREATED`. If session is in `ERROR` or any other state, it cannot retry.

### `/api/generation/content/sessions/[id]/generate-concepts/route.ts` (Lines 51-57)
```typescript
if (session.status !== 'TOPICS_COLLECTED' && session.status !== 'GENERATING_CONCEPTS') {
  return NextResponse.json(
    { error: 'Invalid session status for concept generation' },
    { status: 400 }
  )
}
```
**Issue**: Only allows concept generation from these two states. If stuck in `COLLECTING` or `ERROR`, cannot proceed.

### `/api/flow/[id]/next/route.ts` (Line 34-429)
The main flow controller has a switch statement that handles specific status values, but:
- Has no handling for intermediate states like `GENERATING`
- Treats `GENERATING_CONTENT` and `GENERATING` as the same (lines 349-350)
- No recovery path for stuck states except `ERROR`

## 3. Missing Status Transitions

### No Recovery from Stuck States
- If a session is stuck in `COLLECTING` but topics are actually present, there's no way to move to `TOPICS_COLLECTED`
- If stuck in `GENERATING_CONCEPTS` but concepts exist, no way to move to `CONCEPTS_GENERATED`
- No manual override or force-proceed options

### Status Inconsistencies
- Some APIs use `GENERATING_CONTENT`, others use `GENERATING`
- No validation that status transitions are valid (e.g., can jump from `CREATED` to `COMPLETED`)

## 4. Recommended Fixes

### 1. Add Status Recovery Logic
Instead of strict equality checks, allow progression based on data presence:
```typescript
// Instead of:
if (session.status !== 'CREATED')

// Use:
if (session.status !== 'CREATED' && !session.topics)
```

### 2. Create Status Validation Utility
```typescript
const canCollectTopics = (session: ViralSession) => {
  return !session.topics || session.status === 'CREATED' || session.status === 'ERROR';
}

const canGenerateConcepts = (session: ViralSession) => {
  return session.topics && (!session.concepts || session.status === 'TOPICS_COLLECTED' || 
         session.status === 'GENERATING_CONCEPTS' || session.status === 'ERROR');
}
```

### 3. Add Force Progress Option
Allow APIs to accept a `force` parameter to override status checks when data is present:
```typescript
const { force = false } = body;
if (!force && session.status !== 'CREATED') {
  // strict check
} else if (session.topics && !force) {
  // data-based check
}
```

### 4. Implement Status Sync Function
Create an API endpoint that syncs status based on actual data:
```typescript
// /api/flow/[id]/sync-status
const syncStatus = async (session) => {
  if (session.contents?.length > 0) return 'CONTENTS_GENERATED';
  if (session.concepts?.length > 0) return 'CONCEPTS_GENERATED';
  if (session.topics) return 'TOPICS_COLLECTED';
  return session.status;
}
```

### 5. Use Proper Status Enum
Convert the string status to an enum in Prisma schema:
```prisma
enum ViralSessionStatus {
  CREATED
  COLLECTING
  TOPICS_COLLECTED
  GENERATING_CONCEPTS
  CONCEPTS_GENERATED
  GENERATING_CONTENT
  CONTENTS_GENERATED
  COMPLETED
  ERROR
}

model ViralSession {
  status ViralSessionStatus @default(CREATED)
}
```

## 5. Critical Issues to Fix Immediately

1. **collect/route.ts** - Allow retrying from ERROR state
2. **generate-concepts/route.ts** - Allow proceeding if topics exist regardless of status
3. **flow/[id]/next/route.ts** - Add data-based progression checks in autoProgress mode
4. Add a status recovery endpoint for stuck sessions