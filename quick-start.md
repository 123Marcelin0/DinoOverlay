# DinoOverlay Quick Start

## 1. Get Google AI API Key
1. Go to https://aistudio.google.com/
2. Create project → Enable APIs → Generate key
3. Copy the API key

## 2. Deploy to Vercel (5 minutes)
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - GEMINI_API_KEY=your-google-api-key
# - DATABASE_URL=your-database-url
```

## 3. Set Up Database
**Option A: Supabase (Free)**
1. Go to https://supabase.com/
2. Create project
3. Go to SQL Editor
4. Run the SQL from `database-schema.sql`
5. Copy connection string to Vercel env vars

**Option B: PlanetScale (Free)**
1. Go to https://planetscale.com/
2. Create database
3. Run schema
4. Copy connection string

## 4. Test Your API
```bash
# Replace YOUR_VERCEL_URL with your actual URL
curl -X POST https://YOUR_VERCEL_URL.vercel.app/api/overlay/edit-image \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{
    "imageData": "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "prompt": "add a modern sofa"
  }'
```

## 5. Create API Keys for Customers
You'll need to build an admin panel or use database directly to create API keys for customers.

## 6. Update Widget CDN URLs
In your widget code, update the API endpoint to point to your deployed API:
```javascript
window.DinoOverlayConfig = {
  apiKey: 'customer-api-key',
  apiEndpoint: 'https://YOUR_VERCEL_URL.vercel.app/api/overlay'
};
```

## Next Steps
- Set up customer dashboard
- Create API key management
- Set up monitoring
- Configure custom domain