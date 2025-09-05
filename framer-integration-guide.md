# DinoOverlay + Framer Integration Guide

## Step 1: Add DinoOverlay Script to Framer

### Method A: Site Settings (Recommended)
1. Go to **Framer Dashboard** → **Your Site**
2. Click **Settings** → **General** → **Custom Code**
3. In the **"Head"** section, add:

```html
<!-- DinoOverlay Integration for Framer -->
<script>
  window.DinoOverlayConfig = {
    apiKey: 'dino_8d85697fca7bad3db26fb5ab9d5e76091606d0c64fb58c7433815a91561e958b',
    apiEndpoint: 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay',
    theme: 'auto',
    enableAnalytics: false,
    debug: true
  };
</script>
<script src="https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/cdn/dino-overlay-loader.min-0.1.0.js" async></script>
```

### Method B: HTML Embed Component
1. Add **HTML Embed** component to your page
2. Paste the same script above

## Step 2: Make Images Editable in Framer

### Option 1: CSS Class (Easiest)
1. **Select your image** in Framer
2. **Properties panel** → **CSS Class**
3. **Add**: `editable-room`

### Option 2: Code Component (Most Flexible)
Create a new Code Component:

```jsx
import React from "react"

export default function EditableRoomImage(props) {
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <img 
        src={props.imageUrl}
        alt={props.altText || "Room Image"}
        className="editable-room"
        style={{
          width: "100%",
          height: props.height || "auto",
          objectFit: "cover",
          borderRadius: props.borderRadius || "12px",
          cursor: "pointer",
          transition: "transform 0.3s ease, box-shadow 0.3s ease"
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.02)";
          e.target.style.boxShadow = "0 10px 30px rgba(0,0,0,0.2)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
          e.target.style.boxShadow = "none";
        }}
      />
      {props.showBadge && (
        <div style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "5px 10px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "500"
        }}>
          ✨ AI Editable
        </div>
      )}
    </div>
  )
}
```

**Component Properties:**
- `imageUrl` (string) - Required
- `altText` (string) - Image description
- `height` (string) - Image height (e.g., "300px")
- `borderRadius` (string) - Corner radius (e.g., "12px")
- `showBadge` (boolean) - Show "AI Editable" badge

### Option 3: HTML Embed for Individual Images
```html
<div style="position: relative; width: 100%;">
  <img 
    src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop" 
    class="editable-room" 
    alt="Modern Living Room"
    style="
      width: 100%; 
      height: auto; 
      border-radius: 12px; 
      cursor: pointer;
      transition: transform 0.3s ease;
    "
    onmouseover="this.style.transform='scale(1.02)'"
    onmouseout="this.style.transform='scale(1)'"
  />
  <div style="
    position: absolute; 
    top: 10px; 
    right: 10px; 
    background: rgba(0,0,0,0.7); 
    color: white; 
    padding: 5px 10px; 
    border-radius: 20px; 
    font-size: 12px;
  ">
    ✨ Click to Edit
  </div>
</div>
```

## Step 3: Test Your Integration

1. **Publish your Framer site**
2. **Visit the live URL**
3. **Click on images** with `editable-room` class
4. **DinoOverlay interface should appear!**

## Framer-Specific Tips

### Custom Styling
Add this CSS to your Framer site for better integration:

```css
/* Custom styles for DinoOverlay in Framer */
.editable-room {
  cursor: pointer !important;
  transition: all 0.3s ease !important;
}

.editable-room:hover {
  transform: scale(1.02) !important;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important;
}

/* Ensure DinoOverlay appears above Framer elements */
.dino-overlay-container {
  z-index: 999999 !important;
}
```

### Responsive Design
Make sure your images work on all devices:

```jsx
// Responsive Code Component
export default function ResponsiveEditableImage(props) {
  return (
    <img 
      src={props.imageUrl}
      className="editable-room"
      style={{
        width: "100%",
        height: "auto",
        maxWidth: "100%",
        borderRadius: "clamp(8px, 2vw, 16px)",
        cursor: "pointer"
      }}
    />
  )
}
```

## Troubleshooting

### If DinoOverlay doesn't appear:
1. Check browser console (F12) for errors
2. Make sure the script is in the `<head>` section
3. Verify images have the `editable-room` class
4. Try using HTML Embed instead of CSS classes

### If images don't respond:
1. Check if the class is properly applied
2. Try adding `!important` to CSS rules
3. Use the Code Component method instead

## Example Gallery Component

```jsx
import React from "react"

const roomImages = [
  {
    url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
    title: "Modern Living Room"
  },
  {
    url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop", 
    title: "Chef's Kitchen"
  },
  {
    url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop",
    title: "Master Bedroom"
  }
]

export default function EditableGallery() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "20px",
      padding: "20px"
    }}>
      {roomImages.map((room, index) => (
        <div key={index} style={{ position: "relative" }}>
          <img
            src={room.url}
            alt={room.title}
            className="editable-room"
            style={{
              width: "100%",
              height: "250px",
              objectFit: "cover",
              borderRadius: "12px",
              cursor: "pointer"
            }}
          />
          <h3 style={{ marginTop: "10px", textAlign: "center" }}>
            {room.title}
          </h3>
        </div>
      ))}
    </div>
  )
}
```

🎉 **Your Framer site now has AI-powered image editing!**