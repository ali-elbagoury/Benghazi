import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import outputDataRaw from '../output1.json';
import { transformGeoJSON } from '../utils/coordinateTransform';

function MapView({ properties, selectedProperty, onMarkerClick }) {
  const [activeMarker, setActiveMarker] = useState(null);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [savedPolygons, setSavedPolygons] = useState([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showDwgDrawing, setShowDwgDrawing] = useState(true);
  const [newPropertyData, setNewPropertyData] = useState({
    title: '',
    propertyType: 'Land',
    price: '',
    landSize: '',
    address: ''
  });
  const [viewState, setViewState] = useState({
    longitude: 19.988878,
    latitude: 31.999042,
    zoom: 14.64,
    bearing: -45,
    pitch: 0
  });

  // Transform GeoJSON coordinates from UTM to WGS84
  const outputData = useMemo(() => {
    console.log('Raw output data:', outputDataRaw);
    const transformed = transformGeoJSON(outputDataRaw);
    console.log('Transformed output data:', transformed);
    console.log('First feature coords:', transformed?.features?.[0]?.geometry?.coordinates);
    
    // Calculate bounds from the transformed data
    if (transformed?.features?.length > 0) {
      const coords = [];
      transformed.features.forEach(feature => {
        if (feature.geometry.type === 'Point') {
          coords.push(feature.geometry.coordinates);
        } else if (feature.geometry.type === 'LineString') {
          coords.push(...feature.geometry.coordinates);
        }
      });
      
      if (coords.length > 0) {
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const centerLng = (minLng + maxLng) / 2;
        const centerLat = (minLat + maxLat) / 2;
        
        console.log('Layer bounds:', { minLng, maxLng, minLat, maxLat });
        console.log('Layer center:', { centerLng, centerLat });
        
        // Update view to show the layer
        setTimeout(() => {
          setViewState(prev => ({
            ...prev,
            longitude: centerLng,
            latitude: centerLat,
            zoom: 15
          }));
        }, 1000);
      }
    }
    
    return transformed;
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      setActiveMarker(selectedProperty.id);
      setViewState(prev => ({
        ...prev,
        longitude: selectedProperty.location.lng,
        latitude: selectedProperty.location.lat,
        zoom: 16
      }));
    }
  }, [selectedProperty]);

  const handleMarkerClick = (property) => {
    setActiveMarker(property.id);
    onMarkerClick(property);
  };

  const handleMapClick = useCallback((event) => {
    if (drawingMode) {
      const { lngLat } = event;
      setDrawnPoints(prev => [...prev, [lngLat.lng, lngLat.lat]]);
    }
  }, [drawingMode]);

  const toggleDrawingMode = () => {
    setDrawingMode(prev => !prev);
    if (drawingMode) {
      // Exiting drawing mode - don't clear points yet
    } else {
      // Entering drawing mode
      setDrawnPoints([]);
    }
  };

  const calculatePolygonCenter = (coordinates) => {
    let sumLng = 0, sumLat = 0;
    const points = coordinates.slice(0, -1); // Exclude last point (duplicate of first)
    points.forEach(([lng, lat]) => {
      sumLng += lng;
      sumLat += lat;
    });
    return {
      lng: sumLng / points.length,
      lat: sumLat / points.length
    };
  };

  const calculatePolygonArea = (coordinates) => {
    // Calculate area in square meters using spherical excess formula
    const R = 6371000; // Earth radius in meters
    const points = coordinates.slice(0, -1);
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const [lng1, lat1] = points[i];
      const [lng2, lat2] = points[(i + 1) % points.length];
      area += (lng2 - lng1) * (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
    }
    area = Math.abs(area * R * R / 2) * Math.PI / 180;
    return Math.round(area);
  };

  const finishPolygon = () => {
    if (drawnPoints.length >= 3) {
      const closedCoords = [...drawnPoints, drawnPoints[0]];
      const center = calculatePolygonCenter(closedCoords);
      const area = calculatePolygonArea(closedCoords);
      
      const polygon = {
        id: Date.now(),
        coordinates: closedCoords,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        center: center,
        area: area
      };
      
      setSavedPolygons(prev => [...prev, polygon]);
      setDrawnPoints([]);
      setDrawingMode(false);
      
      // Auto-fill property data with polygon info
      setNewPropertyData(prev => ({
        ...prev,
        landSize: area.toString()
      }));
      
      // Open admin panel to fill in property details
      setShowAdminPanel(true);
      
      console.log('Saved polygon:', polygon);
    }
  };

  const clearDrawing = () => {
    setDrawnPoints([]);
  };

  const deletePolygon = (id) => {
    setSavedPolygons(prev => prev.filter(p => p.id !== id));
  };

  const handleCreateProperty = async () => {
    if (!newPropertyData.title || !newPropertyData.price || savedPolygons.length === 0) {
      alert('Please fill in all required fields and draw a polygon');
      return;
    }

    const latestPolygon = savedPolygons[savedPolygons.length - 1];
    
    const newProperty = {
      title: newPropertyData.title,
      propertyType: newPropertyData.propertyType,
      price: parseFloat(newPropertyData.price),
      landSize: latestPolygon.area,
      address: newPropertyData.address,
      location: {
        lat: latestPolygon.center.lat,
        lng: latestPolygon.center.lng
      },
      polygon: latestPolygon
    };

    try {
      // Send to backend API
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProperty)
      });

      if (!response.ok) {
        throw new Error('Failed to create property');
      }

      const createdProperty = await response.json();
      console.log('Property created in database:', createdProperty);
      
      // Close panel and reset form
      setShowAdminPanel(false);
      setNewPropertyData({
        title: '',
        propertyType: 'land',
        price: '',
        landSize: '',
        address: ''
      });
      
      alert(`Property "${createdProperty.title}" created successfully!\nID: ${createdProperty.id}\nLocation: ${latestPolygon.center.lat.toFixed(6)}, ${latestPolygon.center.lng.toFixed(6)}\nArea: ${latestPolygon.area} m²`);
      
      // Optionally reload properties list
      window.location.reload();
    } catch (error) {
      console.error('Error creating property:', error);
      alert('Failed to create property. Please check console for details.');
    }
  };

  const exportPolygons = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: savedPolygons.map(poly => ({
        type: 'Feature',
        properties: {
          id: poly.id,
          color: poly.color
        },
        geometry: {
          type: 'Polygon',
          coordinates: [poly.coordinates]
        }
      }))
    };
    console.log('Exported GeoJSON:', geojson);
    
    // Download as JSON file
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'property-bounds.json';
    a.click();
  };

  return (
    <div className="map-container">
      {/* Admin Panel */}
      {showAdminPanel && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          minWidth: '400px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#2c3e50' }}>
            Create New Property
          </h2>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#34495e' }}>
              Property Title *
            </label>
            <input
              type="text"
              value={newPropertyData.title}
              onChange={(e) => setNewPropertyData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Luxury Villa in Benghazi"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#34495e' }}>
              Property Type *
            </label>
            <select
              value={newPropertyData.propertyType}
              onChange={(e) => setNewPropertyData(prev => ({ ...prev, propertyType: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Industrial">Industrial</option>
              <option value="Public">Public</option>
              <option value="Recreational">Recreational</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Agricultural">Agricultural</option>
              <option value="Financial">Financial</option>
              <option value="Land">Land</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#34495e' }}>
              Price (USD) *
            </label>
            <input
              type="number"
              value={newPropertyData.price}
              onChange={(e) => setNewPropertyData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="e.g., 250000"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#34495e' }}>
              Land Size (m²)
            </label>
            <input
              type="text"
              value={savedPolygons.length > 0 ? savedPolygons[savedPolygons.length - 1].area : ''}
              disabled
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: '#f5f5f5',
                color: '#666',
                boxSizing: 'border-box'
              }}
            />
            <small style={{ color: '#7f8c8d', fontSize: '12px' }}>
              Automatically calculated from polygon
            </small>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#34495e' }}>
              Location (Lat, Lng)
            </label>
            <input
              type="text"
              value={savedPolygons.length > 0 
                ? `${savedPolygons[savedPolygons.length - 1].center.lat.toFixed(6)}, ${savedPolygons[savedPolygons.length - 1].center.lng.toFixed(6)}`
                : ''
              }
              disabled
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: '#f5f5f5',
                color: '#666',
                boxSizing: 'border-box'
              }}
            />
            <small style={{ color: '#7f8c8d', fontSize: '12px' }}>
              Center of the drawn polygon
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#34495e' }}>
              Address
            </label>
            <textarea
              value={newPropertyData.address}
              onChange={(e) => setNewPropertyData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="e.g., Al-Salam Street, Benghazi"
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowAdminPanel(false);
                setNewPropertyData({
                  title: '',
                  propertyType: 'Land',
                  price: '',
                  landSize: '',
                  address: ''
                });
              }}
              style={{
                padding: '10px 20px',
                background: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProperty}
              style={{
                padding: '10px 20px',
                background: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Create Property
            </button>
          </div>
        </div>
      )}

      {/* Backdrop when admin panel is open */}
      {showAdminPanel && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999
        }} onClick={() => setShowAdminPanel(false)} />
      )}

      {/* Drawing Controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '39%',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={toggleDrawingMode}
          style={{
            background: drawingMode ? '#27ae60' : 'rgba(255, 255, 255, 0.9)',
            color: drawingMode ? 'white' : 'black',
            border: '2px solid #2c3e50',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          {drawingMode ? `Drawing (${drawnPoints.length} points)` : 'Add a new property'}
        </button>
        
        {drawingMode && drawnPoints.length >= 3 && (
          <>
            <button
              onClick={finishPolygon}
              style={{
                background: '#3498db',
                color: 'white',
                border: '2px solid #2980b9',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              Finish Polygon
            </button>
            <button
              onClick={clearDrawing}
              style={{
                background: '#e74c3c',
                color: 'white',
                border: '2px solid #c0392b',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              Clear
            </button>
          </>
        )}
        
        {savedPolygons.length > 0 && (
          <button
            onClick={exportPolygons}
            style={{
              background: '#9b59b6',
              color: 'white',
              border: '2px solid #8e44ad',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            Export ({savedPolygons.length})
          </button>
        )}
      </div>

      {/* Saved Polygons List */}
      {savedPolygons.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '60px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '10px',
          borderRadius: '4px',
          zIndex: 1,
          maxHeight: '300px',
          overflowY: 'auto',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Saved Polygons</h4>
          {savedPolygons.map(poly => (
            <div key={poly.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              padding: '4px',
              background: '#f8f9fa',
              borderRadius: '3px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: poly.color,
                border: '1px solid #000',
                borderRadius: '3px'
              }}></div>
              <span style={{ fontSize: '12px', flex: 1 }}>
                {poly.coordinates.length - 1} points
              </span>
              <button
                onClick={() => deletePolygon(poly.id)}
                style={{
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowCoordinates(!showCoordinates)}
        style={{
          position: 'absolute',
          top: '10px',
          left: '31%',
          background: 'rgba(255, 255, 255, 0.9)',
          border: '2px solid #2c3e50',
          padding: '8px 12px',
          borderRadius: '4px',
          zIndex: 1,
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 1)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.9)'}
      >
        View Coordinates
      </button>

      <button
        onClick={() => setShowDwgDrawing(!showDwgDrawing)}
        style={{
          position: 'absolute',
          top: '10px',
          left: '48%',
          background: showDwgDrawing ? 'rgba(39, 174, 96, 0.9)' : 'rgba(231, 76, 60, 0.9)',
          color: 'white',
          border: '2px solid #2c3e50',
          padding: '8px 12px',
          borderRadius: '4px',
          zIndex: 1,
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
        onMouseLeave={(e) => e.target.style.opacity = '1'}
      >
        {showDwgDrawing ? 'Hide DWG' : 'Show DWG'}
      </button>
      
      {showCoordinates && (
        <div style={{
          position: 'absolute',
          top: '50px',
          left: '31%',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '10px 15px',
          borderRadius: '4px',
          zIndex: 1,
          fontFamily: 'monospace',
          fontSize: '14px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          border: '1px solid #ddd'
        }}>
          <div><strong>Lat:</strong> {viewState.latitude.toFixed(6)}</div>
          <div><strong>Lng:</strong> {viewState.longitude.toFixed(6)}</div>
          <div><strong>Zoom:</strong> {viewState.zoom.toFixed(2)}</div>
          <div><strong>Bearing:</strong> {viewState.bearing.toFixed(1)}°</div>
        </div>
      )}
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onLoad={() => setMapLoaded(true)}
        onClick={handleMapClick}
        cursor={drawingMode ? 'crosshair' : 'grab'}
        mapStyle={{
          version: 8,
          sources: {
            'esri-satellite': {
              type: 'raster',
              tiles: [
                'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              attribution: '&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            }
          },
          layers: [
            {
              id: 'esri-satellite-layer',
              type: 'raster',
              source: 'esri-satellite',
              minzoom: 2,
              maxzoom: 20
            }
          ]
        }}
        style={{ width: '100%', height: '100vh' }}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />

        {/* Property Bounds Layer - All properties with polygons */}
        {mapLoaded && properties && (
          <Source
            id="all-properties-boundaries"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: properties
                .filter(prop => prop.polygon && prop.polygon.coordinates)
                .map(prop => ({
                  type: 'Feature',
                  properties: {
                    id: prop.id,
                    isSelected: selectedProperty?.id === prop.id
                  },
                  geometry: {
                    type: 'Polygon',
                    coordinates: [prop.polygon.coordinates]
                  }
                }))
            }}
          >
            <Layer
              id="properties-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'case',
                  ['get', 'isSelected'],
                  '#00FF00', // Green when selected
                  '#0000FF'  // Blue when not selected
                ],
                'fill-opacity': 0.2
              }}
            />
            <Layer
              id="properties-outline"
              type="line"
              paint={{
                'line-color': [
                  'case',
                  ['get', 'isSelected'],
                  '#00FF00', // Green when selected
                  '#0000FF'  // Blue when n ot selected
                ],
                'line-width': [
                  'case',
                  ['get', 'isSelected'],
                  3, // Thicker when selected
                  2  // Normal when not selected
                ]
              }}
            />
          </Source>
        )}

        {/* CAD Drawing Layer - Rendered second (above) */}
        {mapLoaded && outputData && showDwgDrawing && (
          <Source
            id="output-layer"
            type="geojson"
            data={outputData}
          >
            <Layer
              id="output-lines"
              type="line"
              paint={{
                'line-color': '#FF0000',
                'line-width': 3,
                'line-opacity': 1
              }}
              filter={['==', ['geometry-type'], 'LineString']}
            />
            <Layer
              id="output-points"
              type="circle"
              paint={{
                'circle-radius': 6,
                'circle-color': '#00FF00',
                'circle-opacity': 1,
                'circle-stroke-color': '#FFFFFF',
                'circle-stroke-width': 1
              }}
              filter={['==', ['geometry-type'], 'Point']}
            />
          </Source>
        )}

        {/* Drawing Layer - Current points and lines */}
        {drawnPoints.length > 0 && (
          <Source
            id="drawing-layer"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: [
                // Line connecting points
                drawnPoints.length > 1 && {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: drawnPoints
                  }
                },
                // Closing line (preview)
                drawnPoints.length >= 3 && {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: [drawnPoints[drawnPoints.length - 1], drawnPoints[0]]
                  },
                  properties: { closing: true }
                },
                // Points
                ...drawnPoints.map((coord, idx) => ({
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: coord
                  },
                  properties: { index: idx }
                }))
              ].filter(Boolean)
            }}
          >
            <Layer
              id="drawing-line"
              type="line"
              paint={{
                'line-color': '#3498db',
                'line-width': 2
              }}
              filter={['!', ['get', 'closing']]}
            />
            <Layer
              id="drawing-line-closing"
              type="line"
              paint={{
                'line-color': '#3498db',
                'line-width': 2,
                'line-dasharray': [2, 2]
              }}
              filter={['get', 'closing']}
            />
            <Layer
              id="drawing-points"
              type="circle"
              paint={{
                'circle-radius': 5,
                'circle-color': '#3498db',
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 2
              }}
              filter={['==', ['geometry-type'], 'Point']}
            />
          </Source>
        )}

        {/* Saved Polygons Layer */}
        {savedPolygons.length > 0 && (
          <Source
            id="saved-polygons-layer"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: savedPolygons.map(poly => ({
                type: 'Feature',
                properties: {
                  id: poly.id,
                  color: poly.color
                },
                geometry: {
                  type: 'Polygon',
                  coordinates: [poly.coordinates]
                }
              }))
            }}
          >
            <Layer
              id="saved-polygons-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.3
              }}
            />
            <Layer
              id="saved-polygons-outline"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 2
              }}
            />
          </Source>
        )}

        {properties.map((property) => (
          <Marker
            key={property.id}
            longitude={property.location.lng}
            latitude={property.location.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(property);
            }}
          >
            <div style={{
              cursor: 'pointer',
              fontSize: '30px',
              transform: activeMarker === property.id ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.2s'
            }}>
              📍
            </div>
          </Marker>
        ))}

        {activeMarker && (
          <Popup
            longitude={properties.find(p => p.id === activeMarker)?.location.lng}
            latitude={properties.find(p => p.id === activeMarker)?.location.lat}
            anchor="top"
            onClose={() => setActiveMarker(null)}
            closeOnClick={false}
          >
            {(() => {
              const property = properties.find(p => p.id === activeMarker);
              return property ? (
                <div style={{ padding: '10px', maxWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{property.title}</h3>
                  <p style={{ margin: '5px 0', fontWeight: 'bold', color: '#27ae60' }}>
                    ${property.price.toLocaleString()}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    <strong>Type:</strong> {property.propertyType}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    <strong>Size:</strong> {property.landSize} m²
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    {property.address}
                  </p>
                </div>
              ) : null;
            })()}
          </Popup>
        )}
      </Map>
    </div>
  );
}

export default MapView;
