-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lon DECIMAL(11, 8) NOT NULL,
  landsize INT NOT NULL,
  price INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO properties (name, lat, lon, landsize, price, type) VALUES
('Modern Villa', 32.8872, 13.1913, 500, 450000, 'Villa'),
('Cozy Apartment', 32.1167, 20.0686, 120, 120000, 'Apartment'),
('Luxury House', 32.8950, 13.1800, 800, 680000, 'House'),
('Commercial Land', 32.8700, 13.2000, 1000, 250000, 'Land'),
('Family Apartment', 32.8800, 13.1850, 95, 95000, 'Apartment'),
('Beachfront Villa', 32.9000, 13.1700, 650, 890000, 'Villa');
