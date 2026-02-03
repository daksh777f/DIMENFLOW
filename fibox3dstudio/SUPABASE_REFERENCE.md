# Supabase Quick Reference

Quick reference for common Supabase operations used in FIBOx3D Studio.

## Authentication

### Sign In Anonymously
```javascript
const { data, error } = await supabase.auth.signInAnonymously()
```

### Sign In with Google OAuth
```javascript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin
  }
})
```

### Sign Out
```javascript
const { error } = await supabase.auth.signOut()
```

### Get Current User
```javascript
const { data: { user } } = await supabase.auth.getUser()
```

### Get Session Token
```javascript
const { data: { session } } = await supabase.auth.getSession()
const token = session.access_token
```

### Listen to Auth Changes
```javascript
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event)
  console.log('User:', session?.user)
})
```

## Database Operations

### Select (Read)
```javascript
// Get single record
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()

// Get multiple records
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false })

// Select specific columns
const { data, error } = await supabase
  .from('users')
  .select('images_quota, images_used')
  .eq('id', userId)
  .single()
```

### Insert (Create)
```javascript
const { data, error } = await supabase
  .from('users')
  .insert([{
    id: userId,
    email: 'user@example.com',
    images_quota: 200,
    models_quota: 100,
    images_used: 0,
    models_used: 0
  }])
```

### Update
```javascript
const { error } = await supabase
  .from('projects')
  .update({
    name: newName,
    updated_at: new Date().toISOString()
  })
  .eq('id', projectId)
  .eq('user_id', userId)
```

### Delete
```javascript
const { error } = await supabase
  .from('projects')
  .delete()
  .eq('id', projectId)
  .eq('user_id', userId)
```

### Call Database Function (RPC)
```javascript
// Increment images_used
const { error } = await supabase.rpc('increment_images_used', {
  user_id: userId,
  increment_by: 1
})

// Increment models_used
const { error } = await supabase.rpc('increment_models_used', {
  user_id: userId,
  increment_by: 1
})
```

## Storage Operations

### Upload File
```javascript
const { data, error } = await supabase.storage
  .from('user-content')
  .upload(filePath, fileData, {
    contentType: 'image/png',
    cacheControl: '3600',
    upsert: true // Overwrite if exists
  })
```

### Download File
```javascript
const { data, error } = await supabase.storage
  .from('user-content')
  .download(filePath)

// If successful, data is a Blob
const text = await data.text()
const json = JSON.parse(text)
```

### Get Public URL
```javascript
const { data: { publicUrl } } = supabase.storage
  .from('user-content')
  .getPublicUrl(filePath)
```

### List Files
```javascript
const { data: files, error } = await supabase.storage
  .from('user-content')
  .list(folderPath, {
    limit: 10,
    offset: 0,
    sortBy: { column: 'name', order: 'desc' }
  })
```

### Delete Files
```javascript
const { error } = await supabase.storage
  .from('user-content')
  .remove([filePath1, filePath2])
```

## Backend (Service Role Key)

### Initialize Client
```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY, // Service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### Verify JWT Token
```javascript
const { data: { user }, error } = await supabase.auth.getUser(token)
```

## Error Handling

### Common Error Codes
- `PGRST116` - Row not found (not necessarily an error)
- `23505` - Unique constraint violation
- `23503` - Foreign key constraint violation
- `42501` - Insufficient privileges (RLS issue)

### Example Error Handling
```javascript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()

if (error) {
  if (error.code === 'PGRST116') {
    // Row not found - handle gracefully
    console.log('User does not exist')
  } else {
    // Other error
    throw error
  }
}
```

## Best Practices

### 1. Always Check for Errors
```javascript
const { data, error } = await supabase.from('users').select('*')
if (error) throw error
// Use data...
```

### 2. Use Single() for Single Records
```javascript
// When expecting one record, use .single()
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single() // ← Important!
```

### 3. Filter by User ID for Security
```javascript
// Always filter by user_id when using service role key
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId) // ← Security filter
```

### 4. Use RPC for Complex Operations
```javascript
// Instead of read → calculate → update
// Create a database function for atomic operations
await supabase.rpc('increment_images_used', { user_id: userId })
```

### 5. Handle Storage 404s Gracefully
```javascript
try {
  const { data, error } = await supabase.storage
    .from('user-content')
    .download(filePath)
  
  if (error && error.message.includes('not found')) {
    return null // File doesn't exist - expected case
  }
  if (error) throw error
  
  return data
} catch (error) {
  // Handle unexpected errors
}
```

## Common Patterns

### User Creation with Default Quota
```javascript
async function ensureUserExists(userId, email, isAnonymous) {
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError
  }
  
  if (!existingUser) {
    const { error: insertError } = await supabase
      .from('users')
      .insert([{
        id: userId,
        email,
        is_anonymous: isAnonymous,
        images_quota: 200,
        models_quota: 100,
        images_used: 0,
        models_used: 0
      }])
    
    if (insertError) throw insertError
  }
}
```

### Upload with Public URL
```javascript
async function uploadAndGetUrl(buffer, filePath) {
  const { error } = await supabase.storage
    .from('user-content')
    .upload(filePath, buffer, { upsert: true })
  
  if (error) throw error
  
  const { data: { publicUrl } } = supabase.storage
    .from('user-content')
    .getPublicUrl(filePath)
  
  return publicUrl
}
```

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
