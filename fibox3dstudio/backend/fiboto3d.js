require('dotenv').config();

const fastify = require('fastify')({ logger: true, bodyLimit: 10 * 1024 * 1024 });
const short = require('short-uuid');
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
// Using Node.js built-in fetch (Node 18+)

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('Supabase Client initialized successfully');

// API Keys from environment
const BRIA_API_KEY = process.env.BRIA_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FAL_KEY = process.env.FAL_KEY;

if (!BRIA_API_KEY) console.error('WARNING: BRIA_API_KEY not set!');
if (!GEMINI_API_KEY) console.error('WARNING: GEMINI_API_KEY not set!');
if (!FAL_KEY) console.error('WARNING: FAL_KEY not set!');

// Enable CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

// ========== Authentication Middleware ==========

/**
 * Verify Supabase JWT token and attach user to request
 */
async function verifyAuth(request, reply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Unauthorized: Missing token' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new Error(error?.message || 'Invalid token');
    }
    
    const isAnonymous = user.is_anonymous || false;
    
    request.user = {
      uid: user.id,
      email: user.email,
      isAnonymous: isAnonymous
    };
    
    // Ensure user document exists in database
    await ensureUserExists(user.id, user.email, isAnonymous);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
  }
}

// ========== Quota Management ==========

/**
 * Ensure user document exists in Supabase database
 * Creates new user with default quota if not exists
 */
async function ensureUserExists(userId, email = null, isAnonymous = false) {
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }
  
  if (!existingUser) {
    const defaultQuota = {
      id: userId,
      images_quota: 200,
      models_quota: 100,
      images_used: 0,
      models_used: 0,
      email: email || null,
      is_anonymous: isAnonymous
    };
    
    const { error: insertError } = await supabase
      .from('users')
      .insert([defaultQuota]);
    
    if (insertError) throw insertError;
    
    console.log('Created new user document:', userId);
    return defaultQuota;
  }
  
  return existingUser;
}

/**
 * Check if user has remaining quota for images
 */
async function checkImageQuota(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('images_quota, images_used')
    .eq('id', userId)
    .single();
  
  if (error || !user) {
    throw new Error('User not found');
  }
  
  const remaining = user.images_quota - user.images_used;
  
  if (remaining <= 0) {
    throw new Error('Image quota exceeded');
  }
  
  return remaining;
}

/**
 * Check if user has remaining quota for 3D models
 */
async function checkModelQuota(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('models_quota, models_used')
    .eq('id', userId)
    .single();
  
  if (error || !user) {
    throw new Error('User not found');
  }
  
  const remaining = user.models_quota - user.models_used;
  
  if (remaining <= 0) {
    throw new Error('3D model quota exceeded');
  }
  
  return remaining;
}

/**
 * Increment image usage
 */
async function incrementImageUsage(userId, count = 1) {
  const { error } = await supabase.rpc('increment_images_used', {
    user_id: userId,
    increment_by: count
  });
  
  if (error) throw error;
}

/**
 * Increment model usage
 */
async function incrementModelUsage(userId, count = 1) {
  const { error } = await supabase.rpc('increment_models_used', {
    user_id: userId,
    increment_by: count
  });
  
  if (error) throw error;
}

// ========== Helper Functions ==========

/**
 * Upload base64 image to Supabase Storage
 */
async function uploadBase64ToStorage(base64Data, folder, filename) {
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Image, 'base64');
  
  const filePath = `${folder}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('user-content')
    .upload(filePath, buffer, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('user-content')
    .getPublicUrl(filePath);
  
  return publicUrl;
}

/**
 * Download image from URL and upload to Supabase Storage
 */
async function downloadAndUploadToStorage(imageUrl, folder, filename) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filePath = `${folder}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('user-content')
    .upload(filePath, buffer, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('user-content')
    .getPublicUrl(filePath);
  
  return publicUrl;
}

/**
 * Helper function to find URL with specific extensions in nested object
 */
function findFirstUrlWithExtensions(value, extensions) {
  const queue = [value];
  const seen = new Set();

  while (queue.length) {
    const curr = queue.shift();
    if (!curr) continue;
    if (typeof curr === 'string') {
      const lower = curr.toLowerCase();
      if (extensions.some(ext => lower.endsWith(ext))) return curr;
      continue;
    }

    if (typeof curr !== 'object') continue;
    if (seen.has(curr)) continue;
    seen.add(curr);

    if (Array.isArray(curr)) {
      for (const item of curr) queue.push(item);
      continue;
    }
    for (const k of Object.keys(curr)) queue.push(curr[k]);
  }

  return null;
}

// ========== API Endpoints ==========

/**
 * GET /api/quota - Get user's quota info
 */
fastify.get('/api/quota', {
  preHandler: verifyAuth
}, async (request, reply) => {
  try {
    // ensureUserExists is already called in verifyAuth, but we'll fetch fresh data
    const { data: user, error } = await supabase
      .from('users')
      .select('images_quota, models_quota, images_used, models_used')
      .eq('id', request.user.uid)
      .single();
    
    if (error || !user) {
      // This shouldn't happen since verifyAuth creates the document
      return reply.code(404).send({ error: 'User not found' });
    }
    
    return {
      imagesQuota: user.images_quota,
      modelsQuota: user.models_quota,
      imagesUsed: user.images_used,
      modelsUsed: user.models_used,
      imagesRemaining: user.images_quota - user.images_used,
      modelsRemaining: user.models_quota - user.models_used
    };
  } catch (error) {
    console.error('Quota fetch error:', {
      error: error.message,
      stack: error.stack,
      userId: request.user?.uid
    });
    return reply.code(500).send({ error: error.message });
  }
});

/**
 * POST /api/generate-image - Generate image with FIBO
 * Accepts: { structuredPrompt, prompt, seed, imageBase64 }
 * Returns: { imageUrl, structuredPrompt, seed }
 */
fastify.post('/api/generate-image', {
  preHandler: verifyAuth
}, async (request, reply) => {
  try {
    await checkImageQuota(request.user.uid);
    
    const { structuredPrompt, prompt, seed, imageBase64 } = request.body;
    
    if (!BRIA_API_KEY) {
      return reply.code(500).send({ error: 'BRIA_API_KEY not configured' });
    }
    
    const requestBody = { sync: true };
    
    // Handle structured_prompt - can be object or string
    if (structuredPrompt) {
      requestBody.structured_prompt = typeof structuredPrompt === 'string' 
        ? structuredPrompt 
        : JSON.stringify(structuredPrompt);
    }
    if (prompt) requestBody.prompt = prompt;
    if (seed) requestBody.seed = seed;
    if (imageBase64) requestBody.images = [imageBase64];
    
    fastify.log.info('Generating image with FIBO...');
    
    const fiboResponse = await fetch('https://engine.prod.bria-api.com/v2/image/generate', {
      method: 'POST',
      headers: {
        'api_token': BRIA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!fiboResponse.ok) {
      const errorText = await fiboResponse.text();
      throw new Error(`FIBO API error: ${fiboResponse.status} - ${errorText}`);
    }
    
    const fiboData = await fiboResponse.json();
    
    // Download the generated image and store in our bucket
    const sessionId = short.generate();
    const storedUrl = await downloadAndUploadToStorage(
      fiboData.result.image_url,
      `users/${request.user.uid}/renders`,
      `${sessionId}.png`
    );
    
    // Increment usage
    await incrementImageUsage(request.user.uid);
    
    // Parse structured prompt if it's a string
    let parsedStructuredPrompt;
    try {
      parsedStructuredPrompt = typeof fiboData.result.structured_prompt === 'string'
        ? JSON.parse(fiboData.result.structured_prompt)
        : fiboData.result.structured_prompt;
    } catch {
      parsedStructuredPrompt = fiboData.result.structured_prompt;
    }
    
    return {
      imageUrl: storedUrl,
      structuredPrompt: parsedStructuredPrompt,
      seed: fiboData.result.seed,
      originalUrl: fiboData.result.image_url
    };
  } catch (error) {
    console.error('Generate image error:', {
      error: error.message,
      stack: error.stack,
      userId: request.user?.uid,
      hasStructuredPrompt: !!request.body?.structuredPrompt,
      hasPrompt: !!request.body?.prompt,
      hasSeed: !!request.body?.seed
    });
    
    if (error.message === 'Image quota exceeded') {
      return reply.code(403).send({ error: 'Image quota exceeded. Please upgrade your account.' });
    }
    
    return reply.code(500).send({ error: error.message });
  }
});

/**
 * POST /api/generate-scene - Generate initial scene from reference image
 * First analyzes with Gemini, then generates with FIBO
 */
fastify.post('/api/generate-scene', {
  preHandler: verifyAuth
}, async (request, reply) => {
  try {
    await checkImageQuota(request.user.uid);
    
    const { imageBase64, mimeType, analysisPrompt } = request.body;
    
    if (!imageBase64 || !analysisPrompt) {
      return reply.code(400).send({ error: 'imageBase64 and analysisPrompt are required' });
    }
    
    if (!BRIA_API_KEY || !GEMINI_API_KEY) {
      return reply.code(500).send({ error: 'API keys not configured' });
    }
    
    // Step 1: Analyze with Gemini to get furniture list
    fastify.log.info('Analyzing image with Gemini...');
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: analysisPrompt },
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
            ]
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 8192 }
        })
      }
    );
    
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini analysis failed: ${errorText}`);
    }
    
    const geminiData = await geminiResponse.json();
    const furnitureList = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!furnitureList) {
      throw new Error('Gemini returned no furniture analysis');
    }
    
    // Step 2: Build FIBO prompt from furniture list
    const fiboPrompt = `You are a professional interior designer converting real photos of interiors into pixel-perfect lifelike recreations. Given a reference image and a detailed description below, recreate the scene as accurately as possible. Preserve perspectives, colors, and objects as-is. Generate a structured prompt from the description.

Your task is to create a structured prompt that encapsulates the essence of the items below. Do NOT include any items that are not mentioned in this itemized list.

${furnitureList}`;
    
    // Step 3: Generate with FIBO
    fastify.log.info('Generating scene with FIBO...');
    
    const fiboResponse = await fetch('https://engine.prod.bria-api.com/v2/image/generate', {
      method: 'POST',
      headers: {
        'api_token': BRIA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        images: [imageBase64],
        prompt: fiboPrompt,
        sync: true
      })
    });
    
    if (!fiboResponse.ok) {
      const errorText = await fiboResponse.text();
      throw new Error(`FIBO API error: ${fiboResponse.status} - ${errorText}`);
    }
    
    const fiboData = await fiboResponse.json();
    
    // Download and store
    const sessionId = short.generate();
    const storedUrl = await downloadAndUploadToStorage(
      fiboData.result.image_url,
      `users/${request.user.uid}/renders`,
      `${sessionId}.png`
    );
    
    await incrementImageUsage(request.user.uid);
    
    // Parse structured prompt
    let structuredPrompt;
    try {
      structuredPrompt = JSON.parse(fiboData.result.structured_prompt);
    } catch {
      structuredPrompt = fiboData.result.structured_prompt;
    }
    
    return {
      furnitureList,
      structuredPrompt,
      seed: fiboData.result.seed,
      imageUrl: storedUrl
    };
  } catch (error) {
    console.error('Generate scene error:', {
      error: error.message,
      stack: error.stack,
      userId: request.user?.uid,
      hasImageBase64: !!request.body?.imageBase64,
      hasAnalysisPrompt: !!request.body?.analysisPrompt
    });
    
    if (error.message === 'Image quota exceeded') {
      return reply.code(403).send({ error: 'Image quota exceeded.' });
    }
    
    return reply.code(500).send({ error: error.message });
  }
});

/**
 * POST /api/analyze-image - Analyze image with Gemini
 * Supports text-only prompts or prompts with images (base64 or URL)
 */
fastify.post('/api/analyze-image', {
  preHandler: verifyAuth
}, async (request, reply) => {
  try {
    const { prompt, model = 'gemini-2.5-flash', json = false, imageBase64, mimeType, imageUrl } = request.body;
    
    if (!prompt) {
      return reply.code(400).send({ error: 'Prompt is required' });
    }
    
    if (!GEMINI_API_KEY) {
      return reply.code(500).send({ error: 'GEMINI_API_KEY not configured' });
    }
    
    // Build parts array
    const parts = [{ text: prompt }];
    
    // Add image if provided (base64 takes precedence over URL)
    if (imageBase64) {
      parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } });
    } else if (imageUrl) {
      // Fetch image from URL and convert to base64
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image from URL');
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString('base64');
      parts.push({ inline_data: { mime_type: 'image/jpeg', data: base64 } });
    }
    
    fastify.log.info(`Analyzing with Gemini (${model})...`);
    
    const generationConfig = { temperature: 0, maxOutputTokens: 8192 };
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig
        })
      }
    );
    
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }
    
    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error('Gemini returned no response');
    }
    
    // Parse JSON if requested
    if (json) {
      // Extract JSON from response text (may be wrapped in markdown code blocks)
      let jsonText = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      return JSON.parse(jsonText);
    }
    
    return { text: responseText };
  } catch (error) {
    console.error('Analyze image error:', {
      error: error.message,
      stack: error.stack,
      userId: request.user?.uid,
      model: request.body?.model,
      hasPrompt: !!request.body?.prompt,
      hasImageBase64: !!request.body?.imageBase64,
      hasImageUrl: !!request.body?.imageUrl
    });
    return reply.code(500).send({ error: error.message });
  }
});

/**
 * POST /api/detect-bboxes - Detect bounding boxes with Gemini
 * Accepts prompt and imageBase64 (or imageUrl), uses Gemini 3 Pro Preview with thinking
 * For Firebase Storage URLs, passes directly to Gemini without re-encoding
 */
fastify.post('/api/detect-bboxes', {
  preHandler: verifyAuth
}, async (request, reply) => {
  try {
    const { prompt, imageBase64, imageUrl } = request.body;
    
    if (!prompt) {
      return reply.code(400).send({ error: 'prompt is required' });
    }
    
    if (!imageBase64 && !imageUrl) {
      return reply.code(400).send({ error: 'imageBase64 or imageUrl is required' });
    }
    
    if (!GEMINI_API_KEY) {
      return reply.code(500).send({ error: 'GEMINI_API_KEY not configured' });
    }
    
    let imagePart;
    
    // Check if it's a Firebase Storage URL - pass directly to Gemini
    if (imageUrl && imageUrl.includes('storage.googleapis.com/fiboto3d.firebasestorage.app')) {
      fastify.log.info('Using Firebase Storage URL directly');
      imagePart = {
        file_data: {
          mime_type: 'image/jpeg',
          file_uri: imageUrl
        }
      };
    } else if (imageBase64) {
      // Use base64 inline data
      const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imagePart = {
        inline_data: {
          mime_type: 'image/jpeg',
          data: base64Image
        }
      };
    } else if (imageUrl) {
      // Fetch from URL and convert to base64
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from URL: ${imageResponse.statusText}`);
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      imagePart = {
        inline_data: {
          mime_type: 'image/jpeg',
          data: base64Image
        }
      };
    }

    fastify.log.info('Detecting bounding boxes with Gemini...');
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              imagePart
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192
          }
        })
      }
    );
    
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }
    
    const geminiData = await geminiResponse.json();
    console.log(geminiData);
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error('No response from Gemini');
    }
    
    // Extract JSON from response text (may be wrapped in markdown code blocks)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Detect bboxes error:', {
      error: error.message,
      stack: error.stack,
      userId: request.user?.uid,
      hasPrompt: !!request.body?.prompt,      hasImageBase64: !!request.body?.imageBase64,      hasImageUrl: !!request.body?.imageUrl
    });
    return reply.code(500).send({ error: error.message });
  }
});

/**
 * POST /api/generate-3d-model - Generate 3D model using local TripoSR (100% free)
 */
fastify.post('/api/generate-3d-model', {
  preHandler: verifyAuth
}, async (request, reply) => {
  const tempDir = os.tmpdir();
  const tempImagePath = path.join(tempDir, `triposr-input-${short.generate()}.png`);
  const tempGlbPath = path.join(tempDir, `triposr-output-${short.generate()}.glb`);
  
  try {
    await checkModelQuota(request.user.uid);
    
    const { imageUrl } = request.body;
    
    if (!imageUrl) {
      return reply.code(400).send({ error: 'imageUrl is required' });
    }
    
    fastify.log.info('Generating 3D model with TripoSR locally...');
    
    // Download image to temp file
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    fs.writeFileSync(tempImagePath, Buffer.from(imageBuffer));
    
    fastify.log.info('Image downloaded, calling TripoSR Python script...');
    
    // Use virtual environment Python from tripo-env (one level up from backend)
    const pythonPath = path.join(__dirname, '..', 'tripo-env', 'Scripts', 'python.exe');
    fastify.log.info(`Using Python: ${pythonPath}`);
    
    // Call TripoSR Python script
    const pythonProcess = spawn(pythonPath, [
      path.join(__dirname, 'triposr_generate.py'),
      tempImagePath,
      tempGlbPath
    ]);
    
    let stderr = '';
    let stdout = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      fastify.log.info('TripoSR:', data.toString().trim());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      fastify.log.info('TripoSR:', data.toString().trim());
    });
    
    // Wait for process to complete (with 15 minute timeout for first-time model download)
    const exitCode = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('TripoSR process timed out after 15 minutes'));
      }, 900000); // 15 minutes for first time (model download)
      
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        resolve(code);
      });
      
      pythonProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    if (exitCode !== 0) {
      throw new Error(`TripoSR failed with exit code ${exitCode}: ${stderr}`);
    }
    
    if (!fs.existsSync(tempGlbPath)) {
      throw new Error('TripoSR did not generate output file');
    }
    
    // Read generated GLB
    const glbBuffer = fs.readFileSync(tempGlbPath);
    fastify.log.info('TripoSR generated GLB:', glbBuffer.length, 'bytes');
    
    // Upload to Supabase
    const fileName = `3d-models/${request.user.uid}/${short.generate()}.glb`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-content')
      .upload(fileName, glbBuffer, {
        contentType: 'model/gltf-binary',
        upsert: false
      });
    
    if (uploadError) {
      throw new Error(`Failed to upload model: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-content')
      .getPublicUrl(fileName);
    
    // Increment usage
    await incrementModelUsage(request.user.uid);
    
    // Cleanup temp files
    try {
      fs.unlinkSync(tempImagePath);
      fs.unlinkSync(tempGlbPath);
    } catch (e) {
      fastify.log.warn('Failed to cleanup temp files:', e.message);
    }
    
    return {
      modelUrl: publicUrl,
      imageUrl,
      method: 'TripoSR (local)',
      note: 'Real 3D model generated locally with TripoSR'
    };
  } catch (error) {
    console.error('Generate 3D model error:', {
      error: error.message,
      stack: error.stack,
      userId: request.user?.uid,
      imageUrl: request.body?.imageUrl
    });
    
    if (error.message === '3D model quota exceeded') {
      return reply.code(403).send({ error: '3D model quota exceeded.' });
    }
    
    return reply.code(500).send({ error: error.message });
  }
});

/**
 * POST /api/fibo-render - Existing endpoint for FIBO renders
 */
fastify.post('/api/fibo-render', {
  preHandler: verifyAuth
}, async (request, reply) => {
  try {
    await checkImageQuota(request.user.uid);
    
    const { screenshot } = request.body;
    
    if (!screenshot) {
      return reply.code(400).send({ error: 'Screenshot is required' });
    }
    
    if (!BRIA_API_KEY) {
      return reply.code(500).send({ error: 'BRIA_API_KEY not configured' });
    }
    
    const sessionId = short.generate();
    fastify.log.info(`Starting FIBO render session: ${sessionId}`);
    
    // Upload original screenshot
    const originalFilename = `${sessionId}-original.png`;
    const originalUrl = await uploadBase64ToStorage(
      screenshot, 
      `users/${request.user.uid}/renders`, 
      originalFilename
    );
    
    const prompt = "You must maintain and accurately describe all objects in the scene without changing any of their aspects, and accurately describe their spatial relations to each other. Then, create the photorealistic 3D render of the room for interior design. Add HDR lighting effect.";
    
    fastify.log.info('Generating 2 FIBO variants in parallel...');
    
    const fiboPromises = [1, 2].map(async (variant) => {
      const fiboResponse = await fetch('https://engine.prod.bria-api.com/v2/image/generate', {
        method: 'POST',
        headers: {
          'api_token': BRIA_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          images: [originalUrl],
          prompt: prompt,
          aspect_ratio: '4:3',
          sync: true
        })
      });
      
      if (!fiboResponse.ok) {
        const errorText = await fiboResponse.text();
        throw new Error(`FIBO API error for variant ${variant}: ${fiboResponse.status} - ${errorText}`);
      }
      
      const fiboData = await fiboResponse.json();
      const fiboImageUrl = fiboData.result.image_url;
      
      // Store result
      const resultFilename = `${sessionId}-variant${variant}.png`;
      const storedUrl = await downloadAndUploadToStorage(
        fiboImageUrl, 
        `users/${request.user.uid}/renders`, 
        resultFilename
      );
      
      return {
        id: variant,
        imageUrl: storedUrl,
        originalFiboUrl: fiboImageUrl
      };
    });
    
    const results = await Promise.all(fiboPromises);
    
    // Increment usage (2 images generated)
    await incrementImageUsage(request.user.uid, 2);
    
    fastify.log.info(`FIBO render session ${sessionId} completed successfully`);
    
    return {
      sessionId,
      originalUrl,
      results
    };
  } catch (error) {
    console.error('FIBO render error:', {
      error: error.message,
      stack: error.stack,
      userId: request.user?.uid,
      hasScreenshot: !!request.body?.screenshot
    });
    
    if (error.message === 'Image quota exceeded') {
      return reply.code(403).send({ error: 'Image quota exceeded.' });
    }
    
    return reply.code(500).send({ error: error.message });
  }
});

/**
 * POST /api/fetch-opengraph - Fetch OpenGraph metadata
 */
fastify.post('/api/fetch-opengraph', {
}, async (request, reply) => {
  try {
    const { url } = request.body;
    
    if (!url) {
      return reply.code(400).send({ error: 'URL is required' });
    }
    
    let normalizedUrl = url.trim();
    const hashIndex = normalizedUrl.indexOf('#');
    if (hashIndex !== -1) {
      normalizedUrl = normalizedUrl.substring(0, hashIndex);
    }
    
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    fastify.log.info(`Fetching OpenGraph data from: ${normalizedUrl}`);
    
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      return reply.code(400).send({ error: 'Link not supported' });
    }
    
    const html = await response.text();
    
    const ogTitle = (html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) || 
                     html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
                     html.match(/<title>([^<]+)<\/title>/i))?.[1] || null;
    
    const ogDescription = (html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) || 
                           html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i) ||
                           html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i))?.[1] || null;
    
    const ogImage = (html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) || 
                     html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i))?.[1] || null;
    
    if (!ogTitle && !ogDescription && !ogImage) {
      return reply.code(400).send({ error: 'No OpenGraph metadata found' });
    }
    
    let base64Image = null;
    
    if (ogImage) {
      try {
        let imageUrl = ogImage;
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          const urlObj = new URL(normalizedUrl);
          imageUrl = urlObj.origin + imageUrl;
        } else if (!imageUrl.startsWith('http')) {
          const urlObj = new URL(normalizedUrl);
          imageUrl = urlObj.origin + '/' + imageUrl;
        }
        
        const imageResponse = await fetch(imageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          base64Image = Buffer.from(arrayBuffer).toString('base64');
        }
      } catch (e) {
        fastify.log.warn('Failed to download OG image:', e.message);
      }
    }
    
    return {
      title: ogTitle,
      description: ogDescription,
      imageBase64: base64Image,
      normalizedUrl
    };
  } catch (error) {
    console.error('OpenGraph fetch error:', {
      error: error.message,
      stack: error.stack,
      userId: request.user?.uid,
      url: request.body?.url
    });
    return reply.code(500).send({ error: error.message });
  }
});

/**
 * Root endpoint
 */
fastify.get('/', async (request, reply) => {
  return {
    name: 'FIBOx3D Studio API',
    version: '2.0',
    status: 'running',
    database: 'Supabase',
    endpoints: {
      health: '/health',
      quota: '/api/quota',
      generateImage: '/api/generate-image',
      generateScene: '/api/generate-scene',
      generate3D: '/api/generate-3d'
    }
  };
});

/**
 * Health check endpoint
 */
fastify.get('/health', async (request, reply) => {
  try {
    // Test Supabase connection
    const { error: dbError } = await supabase.from('users').select('count').limit(1).single();
    
    return { 
      status: 'ok',
      supabase: dbError ? 'error: ' + dbError.message : 'connected',
      briaApiKey: BRIA_API_KEY ? 'configured' : 'missing',
      geminiApiKey: GEMINI_API_KEY ? 'configured' : 'missing',
      falKey: FAL_KEY ? 'configured' : 'missing'
    };
  } catch (error) {
    console.error('Health check error:', {
      error: error.message,
      stack: error.stack
    });
    return reply.code(500).send({ 
      status: 'error',
      error: error.message
    });
  }
});

/**
 * Start the server
 */
const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await fastify.listen({ port, host: '127.0.0.1' });
    console.log(`✓ Server listening on port ${port}`);
    console.log(`✓ Health check: http://localhost:${port}/health`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();