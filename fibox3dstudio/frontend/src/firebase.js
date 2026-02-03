// Supabase configuration and initialization
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Supabase configuration - REPLACE WITH YOUR PROJECT DETAILS
const supabaseConfig = {
  url: "https://cfxkbsigrfjprrwcfvwl.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmeGtic2lncmZqcHJyd2NmdndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjMyNDQsImV4cCI6MjA4NTUzOTI0NH0.HoqME8Jukh3OeHkIQKYdmgvaWLeeTcz9mLDNW0rfFGk"
}

// Initialize Supabase
const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey)

// Initial quotas for new users
const INITIAL_IMAGE_QUOTA = 200
const INITIAL_MODEL_QUOTA = 100

/**
 * Sign in anonymously
 */
export async function signInAnonymousUser() {
  try {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    
    await ensureUserDocument(data.user, 'anonymous')
    return data.user
  } catch (error) {
    console.error('Anonymous sign-in error:', error)
    throw error
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    
    if (error) throw error
    
    // Note: OAuth redirect-based, user data will be available after redirect
    return data
  } catch (error) {
    console.error('Google sign-in error:', error)
    throw error
  }
}

/**
 * Link anonymous account to Google (upgrade)
 * Note: Supabase handles this differently - need to sign in with Google
 * and merge data manually if needed
 */
export async function linkAnonymousToGoogle() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No user signed in')
    if (!user.is_anonymous) throw new Error('User is not anonymous')
    
    // In Supabase, we need to sign in with Google and handle data migration
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '?upgrade=true'
      }
    })
    
    if (error) throw error
    return data
    if (error) throw error
    return data
  } catch (error) {
    console.error('Link to Google error:', error)
    throw error
  }
}

/**
 * Sign out
 */
export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

/**
 * Ensure user document exists with initial quotas
 */
async function ensureUserDocument(user, authType) {
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError
  }
  
  if (!existingUser) {
    // Create new user document with initial quotas
    const { error: insertError } = await supabase
      .from('users')
      .insert([{
        id: user.id,
        email: user.email || null,
        is_anonymous: authType === 'anonymous',
        images_quota: INITIAL_IMAGE_QUOTA,
        models_quota: INITIAL_MODEL_QUOTA,
        images_used: 0,
        models_used: 0
      }])
    
    if (insertError) throw insertError
  }
}

/**
 * Get user quota info
 */
export async function getUserQuota() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No user signed in')
  
  const { data: userData, error } = await supabase
    .from('users')
    .select('images_quota, models_quota, images_used, models_used')
    .eq('id', user.id)
    .single()
  
  if (error || !userData) throw new Error('User document not found')
  
  return {
    imagesQuota: userData.images_quota,
    modelsQuota: userData.models_quota,
    imagesUsed: userData.images_used,
    modelsUsed: userData.models_used,
    imagesRemaining: userData.images_quota - userData.images_used,
    modelsRemaining: userData.models_quota - userData.models_used
  }
}

/**
 * Get ID token for backend API calls
 */
export async function getIdToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No user signed in')
  return session.access_token
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ========== Project Management ==========

/**
 * Create a new project
 */
export async function createProject(name) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No user signed in')
  
  const projectId = `project_${Date.now()}`
  
  const { error } = await supabase
    .from('projects')
    .insert([{
      id: projectId,
      user_id: user.id,
      name: name
    }])
  
  if (error) throw error
  
  return projectId
}

/**
 * Get all projects for current user
 */
export async function getProjects() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No user signed in')
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
  
  if (error) throw error
  
  return projects || []
}

/**
 * Save project state to Storage
 */
export async function saveProject(projectId, projectState) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No user signed in')
  
  const filePath = `${user.id}/projects/${projectId}/project.json`
  const jsonString = JSON.stringify(projectState)
  
  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('user-content')
    .upload(filePath, jsonString, {
      contentType: 'application/json',
      upsert: true
    })
  
  if (uploadError) throw uploadError
  
  // Update project metadata
  const { error: updateError } = await supabase
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', user.id)
  
  if (updateError) throw updateError
  
  return true
}

/**
 * Load project state from Storage
 */
export async function loadProject(projectId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No user signed in')
  
  const filePath = `${user.id}/projects/${projectId}/project.json`
  
  try {
    const { data, error } = await supabase.storage
      .from('user-content')
      .download(filePath)
    
    if (error) {
      if (error.message.includes('not found')) {
        return null // Project file doesn't exist yet
      }
      throw error
    }
    
    const text = await data.text()
    return JSON.parse(text)
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      return null
    }
    throw error
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No user signed in')
  
  // Delete from database
  const { error: dbError } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id)
  
  if (dbError) throw dbError
  
  // Try to delete from Storage (may not exist)
  try {
    const filePath = `${user.id}/projects/${projectId}/project.json`
    await supabase.storage
      .from('user-content')
      .remove([filePath])
  } catch (error) {
    // Ignore if file doesn't exist
    console.warn('Failed to delete project file:', error)
  }
  
  return true
}

/**
 * Rename a project
 */
export async function renameProject(projectId, newName) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No user signed in')
  
  const { error } = await supabase
    .from('projects')
    .update({
      name: newName,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .eq('user_id', user.id)
  
  if (error) throw error
  
  return true
}

/**
 * Get renders for current user with pagination
 * @param {string|null} pageToken - Token for next page, null for first page
 * @param {number} pageSize - Number of items per page (default 8)
 */
export async function getRenders(pageToken = null, pageSize = 8) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No user signed in')
  
  const folderPath = `${user.id}/renders`
  
  try {
    const { data: files, error } = await supabase.storage
      .from('user-content')
      .list(folderPath, {
        limit: pageSize,
        offset: pageToken ? parseInt(pageToken) : 0,
        sortBy: { column: 'name', order: 'desc' }
      })
    
    if (error) {
      if (error.message.includes('not found')) {
        return { renders: [], nextPageToken: null, hasMore: false }
      }
      throw error
    }
    
    // Get public URLs for all files
    const renders = files.map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from('user-content')
        .getPublicUrl(`${folderPath}/${file.name}`)
      
      return {
        name: file.name,
        url: publicUrl,
        fullPath: `${folderPath}/${file.name}`
      }
    })
    
    const hasMore = files.length === pageSize
    const nextPageToken = hasMore ? String((pageToken ? parseInt(pageToken) : 0) + pageSize) : null
    
    return {
      renders,
      nextPageToken,
      hasMore
    }
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      return { renders: [], nextPageToken: null, hasMore: false }
    }
    throw error
  }
}

/**
 * Create a project variation from a specific activity state
 */
export async function createProjectVariation(baseName, activityState) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No user signed in')
  
  // Generate variation name
  const variationName = `${baseName}_variation`
  
  // Create the project
  const projectId = await createProject(variationName)
  
  // Build project state from activity
  const projectState = {
    version: '2.0',
    timestamp: new Date().toISOString(),
    structuredPrompt: activityState.structuredPrompt,
    seed: activityState.seed,
    imageUrl: activityState.imageUrl,
    furnitureList: activityState.furnitureList || null,
    glbList: activityState.glbList || [],
    studioBoundingBoxes: activityState.studioBoundingBoxes || null,
    studioGlbAssignments: activityState.studioGlbAssignments || {},
    ideationBoundingBoxes: activityState.ideationBoundingBoxes || null,
    activityHistory: activityState.activityHistory || [],
    currentHistoryIndex: activityState.currentHistoryIndex ?? -1
  }
  
  // Save the state
  await saveProject(projectId, projectState)
  
  return {
    projectId,
    projectName: variationName,
    projectState
  }
}

export { supabase }
