# DinoOverlay Deployment Guide

## Option 1: Deploy to Vercel (Recommended)

### Prerequisites
- Vercel account
- Google AI API key
- Database (Supabase/PlanetScale recommended)

### Steps
1. **Connect to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Set Environment Variables in Vercel Dashboard**
   - Go to your project settings
   - Add all variables from .env.example
   - Deploy: `vercel --prod`

3. **Your API will be available at:**
   - `https://your-project.vercel.app/api/overlay/edit-image`
   - `https://your-project.vercel.app/api/overlay/chat`

## Option 2: Deploy to Railway

### Steps
1. **Connect to Railway**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   ```

2. **Deploy**
   ```bash
   railway up
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set GEMINI_API_KEY=your-key
   # ... add all other variables
   ```

## Option 3: Deploy to Your Own Server

### Using Docker
```bash
# Build
docker build -t dino-overlay-api .

# Run
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your-key \
  -e DATABASE_URL=your-db \
  dino-overlay-api
```

## Database Setup

### Option A: Supabase (Recommended)
1. Create account at supabase.com
2. Create new project
3. Get connection string
4. Run migrations (we'll create these)

### Option B: PlanetScale
1. Create account at planetscale.com
2. Create database
3. Get connection string

## CDN Setup

### Option A: Vercel Edge Network
- Automatic with Vercel deployment
- Serves your widget files globally

### Option B: AWS CloudFront + S3
- More control, better for large scale
- Requires AWS setup

## Testing Your Deployment

```bash
# Test edit-image endpoint
curl -X POST https://your-api-url.vercel.app/api/overlay/edit-image \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-test-api-key" \
  -d '{
    "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
    "prompt": "add a modern sofa"
  }'

# Test chat endpoint
curl -X POST https://your-api-url.vercel.app/api/overlay/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-test-api-key" \
  -d '{
    "message": "How can I improve this room?"
  }'
```