# Species Image Curator

A local web application for curating images in the species-images folders. This tool allows you to easily manage which images are blacklisted for each species.

**Note:** This application is packaged in its own directory and accesses the `species-images` folder from the parent directory.

## Features

- **Species Overview**: View all species directories with image counts and blacklist statistics
- **Expandable Interface**: Click on any species to expand and view its images
- **Image Management**: Click on any image to toggle its blacklist status
- **Search Functionality**: Search for species by name
- **Real-time Statistics**: See total species, images, and blacklisted counts
- **Modern UI**: Clean, responsive interface with smooth animations

## Installation

1. Install dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Use the application:
   - Browse species in the main list
   - Click on a species name to expand and view its images
   - Click on any image to toggle its blacklist status
   - Use the search box to filter species by name
   - View statistics at the top of the page

## How It Works

- **Species Listing**: The app reads all directories in the `species-images/` folder
- **Image Display**: For each species, it shows all image files (excluding thumbnails)
- **Blacklist Management**: 
  - Blacklisted images are stored in `species-images/<species-name>/blacklist.json`
  - The file contains an array of image filenames
  - Clicking an image toggles its presence in this array
- **Visual Feedback**: Blacklisted images are visually marked and dimmed

## API Endpoints

- `GET /api/species` - List all species directories
- `GET /api/species/:name/images` - Get images for a specific species
- `POST /api/species/:name/blacklist/:image` - Toggle blacklist status for an image
- `GET /api/species/:name/blacklist` - Get blacklist for a species

## File Structure

```
image-curator/             # Application directory
├── server.js              # Express server
├── package.json           # Dependencies
├── start-curator.sh       # Startup script
├── README-CURATOR.md      # This documentation
└── public/
    ├── index.html        # Main application page
    ├── styles.css        # Styling
    └── script.js         # Frontend JavaScript

../species-images/         # Your existing species image directories (parent directory)
├── species1/
│   ├── image1.jpg
│   ├── image2.jpg
│   └── blacklist.json
└── species2/
    ├── image1.jpg
    └── blacklist.json
```

## Development

For development with auto-restart:
```bash
npm run dev
```

## Notes

- This application is designed for local use only
- Images are served directly from the `species-images` directory
- The blacklist.json files are automatically created/updated when you toggle image status
- The application handles missing blacklist files gracefully
