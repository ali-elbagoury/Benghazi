import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';

function App() {
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    propertyType: 'All',
    minPrice: '',
    maxPrice: '',
    minLandSize: '',
    maxLandSize: ''
  });
  const [selectedProperty, setSelectedProperty] = useState(null);

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchProperties = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.propertyType !== 'All') queryParams.append('propertyType', filters.propertyType);
      if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
      if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
      if (filters.minLandSize) queryParams.append('minLandSize', filters.minLandSize);
      if (filters.maxLandSize) queryParams.append('maxLandSize', filters.maxLandSize);

      const response = await fetch(`/api/properties?${queryParams}`);
      const data = await response.json();
      setFilteredProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
  };

  return (
    <div className="App">
      <Sidebar
        filters={filters}
        onFilterChange={handleFilterChange}
        properties={filteredProperties}
        onPropertySelect={handlePropertySelect}
      />
      <MapView
        properties={filteredProperties}
        selectedProperty={selectedProperty}
        onMarkerClick={handlePropertySelect}
      />
    </div>
  );
}

export default App;
