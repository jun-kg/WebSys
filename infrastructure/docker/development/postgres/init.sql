-- Initial database setup
CREATE SCHEMA IF NOT EXISTS public;

-- Set timezone
SET timezone = 'Asia/Tokyo';

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Initial admin user will be created through the application
-- This file can be extended with initial data or additional setup as needed

-- Grant permissions
GRANT ALL ON SCHEMA public TO admin;

-- Sample initial data (optional)
-- You can add initial data here if needed