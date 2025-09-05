# DinoOverlay Test Environment Guide

## Overview
This test environment simulates a real hosted website where DinoOverlay can be tested without the limitations of Framer's free plan. It provides a complete testing suite for debugging and validating the integration.

## Access the Test Environment

### Local Testing
```bash
# Start your development server
npm run dev

# Navigate to:
http://localhost:3000/test-environment
```

### Production Testing (Vercel)
```
https://dino-overlay-system.vercel.app/test-environment
```

## Features

### 🏠 Real Estate Image Detection
- **Automatic Detection**: Images are automatically identified based on keywords, context, and size
- **Visual Indicators**: Detected images get a blue border and tooltip
- **Smart Filtering**: Only real estate-related images are enhanced

### 🔧 Debug Panel
Located on the right side of the screen:
- **Status Indicator**: Shows current system status
- **Debug Log**: Real-time logging of all DinoOverlay activities
- **API Testing**: Direct API connection testing
- **Image Counter**: Shows how many images were detected

### 🎨 Image Editing Interface
Click any detected image to open the editing overlay:
- **Quick Actions**: Pre-defined editing options (Brighten, Enhance, Virtual Staging, Declutter)
- **Custom Prompts**: Write your own editing instructions
- **Real-time Processing**: Shows processing status and results

## Test Scenarios

### 1. Image Detection Test
- ✅ **Should Detect**: Property photos, house exteriors, room interiors, kitchen/bathroom images
- ❌ **Should NOT Detect**: Landscapes, food photos, portraits, small images

### 2. API Integration Test
1. Click "Test API" in the debug panel
2. Check for successful connection to Vercel backend
3. Monitor debug log for any errors

### 3. Editing Workflow Test
1. Click on any detected real estate image
2. Try different quick actions
3. Test custom prompt functionality
4. Verify processing status updates

### 4. Cross-Browser Testing
Test in multiple browsers:
- Chrome/Edge (Chromium-based)
- Firefox
- Safari (if available)

## Debug Information

### Status Indicators
- 🔵 **Blue**: Information/Loading
- 🟢 **Green**: Success
- 🟡 **Yellow**: Warning
- 🔴 **Red**: Error

### Common Issues & Solutions

#### Images Not Detected
- Check if images meet minimum size requirements (200x150px)
- Verify alt text or surrounding context contains real estate keywords
- Check debug log for detection details

#### API Connection Issues
- Verify Vercel deployment is active
- Check environment variables are set correctly
- Monitor network tab in browser dev tools

#### Overlay Not Opening
- Check for JavaScript errors in browser console
- Verify click handlers are properly attached
- Check if overlay styles are loaded

## Integration Testing

### For Website Builders
This environment simulates how DinoOverlay would work on:
- **Jimdo**: Standard HTML/CSS/JS integration
- **Wix**: Custom code embed
- **Squarespace**: Code injection
- **WordPress**: Plugin or theme integration
- **Webflow**: Custom code components

### Performance Monitoring
- Image detection speed
- API response times
- Overlay loading performance
- Memory usage with multiple images

## Deployment Verification

### Pre-deployment Checklist
- [ ] All images load correctly
- [ ] Detection algorithm works as expected
- [ ] API endpoints respond successfully
- [ ] Overlay interface is fully functional
- [ ] Debug panel shows accurate information
- [ ] Mobile responsiveness works

### Post-deployment Testing
1. Access the live test environment
2. Run through all test scenarios
3. Check API connectivity
4. Verify image detection accuracy
5. Test editing functionality

## Advanced Testing

### Load Testing
- Test with 20+ images on a single page
- Monitor performance with large images
- Check memory usage over time

### Edge Cases
- Very small images (should be ignored)
- Images without alt text
- Images with unusual aspect ratios
- Slow-loading images

### Mobile Testing
- Touch interactions
- Responsive overlay design
- Performance on mobile devices

## Troubleshooting

### Debug Commands
```javascript
// In browser console:

// Check detected images
console.log(window.dinoOverlay);

// Force re-detection
location.reload();

// Check API status
fetch('https://dino-overlay-system.vercel.app/api/overlay/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'test', imageUrl: 'test' })
}).then(r => console.log('API Status:', r.status));
```

### Log Analysis
Monitor the debug log for:
- Image detection results
- API call success/failure
- Processing times
- Error messages

## Next Steps

After successful testing:
1. **Integration**: Copy the working code to target platforms
2. **Customization**: Adjust detection keywords for specific use cases
3. **Optimization**: Fine-tune performance based on test results
4. **Deployment**: Roll out to production websites

## Support

If you encounter issues:
1. Check the debug log for error messages
2. Test API connectivity separately
3. Verify all dependencies are loaded
4. Check browser console for JavaScript errors

This test environment provides a complete sandbox for validating DinoOverlay functionality before deploying to production websites.