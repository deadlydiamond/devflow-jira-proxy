# 🚀 Vercel Deployment Guide

## Quick Setup

### 1. Login to Vercel
```bash
vercel login
```
- Choose "Continue with GitHub"
- Authorize Vercel in your browser

### 2. Deploy Your App
```bash
vercel
```

### 3. Follow the Prompts
- **Link to existing project**: `No`
- **Project name**: `devflow-jira-proxy`
- **Framework**: `Other`
- **Root directory**: `./`
- **Build command**: `npm run build`
- **Output directory**: `dist/devflow`
- **Install command**: `npm install`

### 4. Update Your Angular Service
After deployment, you'll get a URL like: `https://devflow-jira-proxy.vercel.app`

Update `src/app/services/jira.ts` line 241:
```typescript
return 'https://YOUR-ACTUAL-URL.vercel.app/api/jira';
```

## Benefits
✅ No CORS issues  
✅ No XSRF issues  
✅ Free hosting  
✅ Automatic scaling  
✅ Better security  

## Test Your Deployment
Visit: `https://your-app.vercel.app/api/jira/rest/api/2/myself` 