# Benghazi Property Search Webapp

A full-stack property search application with React frontend and Node.js backend, featuring Google Maps integration.

## Features

- **30/70 Layout Split**: Search sidebar (30%) and Google Maps view (70%)
- **Advanced Filters**: Property type, price range, and land size filters
- **Search Functionality**: Search properties by title or address
- **Interactive Map**: Google Maps with property markers and info windows
- **Real-time Filtering**: Properties update dynamically based on filters

## Tech Stack

- **Frontend**: React, Google Maps API (@react-google-maps/api)
- **Backend**: Node.js, Express
- **Styling**: CSS

## Setup Instructions

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 2. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Maps JavaScript API"
4. Create credentials (API Key)
5. Copy your API key

### 3. Configure Environment Variables

Create a `.env` file in the `client` folder:

```bash
cd client
echo REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE > .env
cd ..
```

Replace `YOUR_API_KEY_HERE` with your actual Google Maps API key.

Also update the API key in `client/src/components/MapView.js`:
```javascript
<LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY">
```

### 4. Run the Application

```bash
# Start backend server (runs on port 5000)
npm run server

# In a new terminal, start React frontend (runs on port 3000)
npm run client

# Or run both concurrently
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/properties

## API Endpoints

- `GET /api/properties` - Get all properties with optional filters
  - Query params: `propertyType`, `minPrice`, `maxPrice`, `minLandSize`, `maxLandSize`, `search`
- `GET /api/properties/:id` - Get specific property by ID

## Project Structure

```
Benghazi/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.js      # Search and filter sidebar
│   │   │   └── MapView.js      # Google Maps component
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── .env                # Environment variables
│   └── package.json
├── server/                # Node.js backend
│   └── index.js          # Express server with API endpoints
├── package.json          # Root package.json
└── README.md
```

## Customization

### Add More Properties

Edit `server/index.js` and add properties to the `properties` array:

```javascript
{
  id: 7,
  title: "New Property",
  propertyType: "Villa",
  price: 500000,
  landSize: 600,
  location: { lat: 32.8900, lng: 13.1900 },
  address: "Your Address"
}
```

### Modify Filters

Update filter options in `client/src/components/Sidebar.js`

### Change Map Center

Update the `center` constant in `client/src/components/MapView.js`

## License

ISC
