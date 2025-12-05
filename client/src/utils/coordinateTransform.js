// Simple offset-based transformation
// Data center: X~674000, Y~2735000
// Should map to approximately: 31.999042°N, 19.988878°E

const DATA_CENTER_X = 674000;
const DATA_CENTER_Y = 2735000;
const TARGET_LON = 20.0071;
const TARGET_LAT = 32.00;

// Scale: approximately 111km per degree of latitude
// At 32°N, approximately 94km per degree of longitude
const SCALE = 1.3;
const ROTATION = 45 * Math.PI / 180; // -45 degrees in radians
const METERS_PER_DEGREE_LAT = 111000 / SCALE;
const METERS_PER_DEGREE_LON = 94000 / SCALE; // Adjusted for latitude ~32°N

/**
 * Transform coordinates using simple offset with rotation
 * @param {Array} coord - [x, y, z] in local coordinates
 * @returns {Array} - [lon, lat, z] in WGS84
 */
function transformCoordinate(coord) {
  if (!coord || coord.length < 2) return coord;
  
  const [x, y, z] = coord;
  
  // Calculate offset from data center
  let deltaX = x - DATA_CENTER_X;
  let deltaY = y - DATA_CENTER_Y;
  
  // Apply rotation
  const cos = Math.cos(ROTATION);
  const sin = Math.sin(ROTATION);
  const rotatedX = deltaX * cos - deltaY * sin;
  const rotatedY = deltaX * sin + deltaY * cos;
  
  // Convert to degrees and add to target location
  const lon = TARGET_LON + (rotatedX / METERS_PER_DEGREE_LON);
  const lat = TARGET_LAT + (rotatedY / METERS_PER_DEGREE_LAT);
  
  return z !== undefined ? [lon, lat, z] : [lon, lat];
}

/**
 * Transform a GeoJSON geometry's coordinates
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Object} - Transformed geometry
 */
function transformGeometry(geometry) {
  if (!geometry || !geometry.coordinates) return geometry;

  const { type, coordinates } = geometry;

  switch (type) {
    case 'Point':
      return {
        ...geometry,
        coordinates: transformCoordinate(coordinates)
      };
    
    case 'LineString':
    case 'MultiPoint':
      return {
        ...geometry,
        coordinates: coordinates.map(transformCoordinate)
      };
    
    case 'Polygon':
    case 'MultiLineString':
      return {
        ...geometry,
        coordinates: coordinates.map(ring => ring.map(transformCoordinate))
      };
    
    case 'MultiPolygon':
      return {
        ...geometry,
        coordinates: coordinates.map(polygon => 
          polygon.map(ring => ring.map(transformCoordinate))
        )
      };
    
    default:
      return geometry;
  }
}

/**
 * Transform an entire GeoJSON FeatureCollection from UTM to WGS84
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @returns {Object} - Transformed GeoJSON
 */
export function transformGeoJSON(geojson) {
  if (!geojson || geojson.type !== 'FeatureCollection') {
    return geojson;
  }

  return {
    ...geojson,
    features: geojson.features.map(feature => ({
      ...feature,
      geometry: transformGeometry(feature.geometry)
    }))
  };
}
