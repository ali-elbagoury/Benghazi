require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://yourdomain.com'
    : 'http://localhost:3000',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promisify pool for easier async/await usage
const promisePool = pool.promise();

// API Routes
app.get('/api/properties', async (req, res) => {
  try {
    const { propertyType, minPrice, maxPrice, minLandSize, maxLandSize, search } = req.query;
    
    // Build dynamic SQL query
    let query = 'SELECT * FROM properties WHERE 1=1';
    const params = [];

    // Filter by property type
    if (propertyType && propertyType !== 'All') {
      query += ' AND type = ?';
      params.push(propertyType);
    }

    // Filter by price range
    if (minPrice) {
      query += ' AND price >= ?';
      params.push(parseInt(minPrice));
    }
    if (maxPrice) {
      query += ' AND price <= ?';
      params.push(parseInt(maxPrice));
    }

    // Filter by land size
    if (minLandSize) {
      query += ' AND landsize >= ?';
      params.push(parseInt(minLandSize));
    }
    if (maxLandSize) {
      query += ' AND landsize <= ?';
      params.push(parseInt(maxLandSize));
    }

    // Search by name
    if (search) {
      query += ' AND name LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern);
    }

    const [results] = await promisePool.query(query, params);
    
    // Transform results to match frontend expected format
    const properties = results.map(row => ({
      id: row.id,
      title: row.name,
      propertyType: row.type,
      price: row.price,
      landSize: row.landsize,
      location: { lat: row.lat, lng: row.lon },
      address: row.name,
      polygon: row.polygon_data ? (typeof row.polygon_data === 'string' ? JSON.parse(row.polygon_data) : row.polygon_data) : null
    }));

    res.json(properties);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Database error', error: error.message });
  }
});

app.get('/api/properties/:id', async (req, res) => {
  try {
    const [results] = await promisePool.query(
      'SELECT * FROM properties WHERE id = ?',
      [parseInt(req.params.id)]
    );

    if (results.length > 0) {
      const row = results[0];
      const property = {
        id: row.id,
        title: row.name,
        propertyType: row.type,
        price: row.price,
        landSize: row.landsize,
        location: { lat: row.lat, lng: row.lon },
        address: row.name,
        polygon: row.polygon_data ? (typeof row.polygon_data === 'string' ? JSON.parse(row.polygon_data) : row.polygon_data) : null
      };
      res.json(property);
    } else {
      res.status(404).json({ message: 'Property not found' });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Database error', error: error.message });
  }
});

// Create new property
app.post('/api/properties', async (req, res) => {
  try {
    const { title, propertyType, price, landSize, address, location, polygon } = req.body;
    
    // Validate required fields
    if (!title || !propertyType || !price || !location) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Insert property into database
    const [result] = await promisePool.query(
      'INSERT INTO properties (name, type, price, landsize, lat, lon, polygon_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        propertyType,
        price,
        landSize || 0,
        location.lat,
        location.lng,
        JSON.stringify(polygon) // Store polygon as JSON
      ]
    );

    const newProperty = {
      id: result.insertId,
      title,
      propertyType,
      price,
      landSize,
      location,
      address,
      polygon
    };

    res.status(201).json(newProperty);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Database error', error: error.message });
  }
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
