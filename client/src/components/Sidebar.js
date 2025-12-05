import React from 'react';

function Sidebar({ filters, onFilterChange, properties, onPropertySelect }) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value });
  };

  return (
    <div className="sidebar">
      <h1>Property Search</h1>

      <div className="search-bar">
        <input
          type="text"
          name="search"
          placeholder="Search by title or address..."
          value={filters.search}
          onChange={handleInputChange}
        />
      </div>

      <div className="filters">
        <h2>Filters</h2>

        <div className="filter-group">
          <label>Property Type</label>
          <select
            name="propertyType"
            value={filters.propertyType}
            onChange={handleInputChange}
          >
            <option value="All">All Types</option>
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

        <div className="filter-group">
          <label>Price Range ($)</label>
          <div className="range-inputs">
            <input
              type="number"
              name="minPrice"
              placeholder="Min"
              value={filters.minPrice}
              onChange={handleInputChange}
            />
            <input
              type="number"
              name="maxPrice"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Land Size (m²)</label>
          <div className="range-inputs">
            <input
              type="number"
              name="minLandSize"
              placeholder="Min"
              value={filters.minLandSize}
              onChange={handleInputChange}
            />
            <input
              type="number"
              name="maxLandSize"
              placeholder="Max"
              value={filters.maxLandSize}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      <div className="property-list">
        <h2>Results ({properties.length})</h2>
        {properties.length === 0 ? (
          <div className="no-results">No properties found</div>
        ) : (
          properties.map((property) => (
            <div
              key={property.id}
              className="property-card"
              onClick={() => onPropertySelect(property)}
            >
              <h3>{property.title}</h3>
              <p className="property-price">${property.price.toLocaleString()}</p>
              <p><strong>Type:</strong> {property.propertyType}</p>
              <p><strong>Land Size:</strong> {property.landSize} m²</p>
              <p><strong>Location:</strong> {property.address}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Sidebar;
