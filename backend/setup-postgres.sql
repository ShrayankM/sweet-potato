-- Sweet Potato PostgreSQL Database Setup Script
-- Run this script to create the development database and user

-- Create development database
CREATE DATABASE fuel_tracker_dev;

-- Create production database (optional for local setup)
CREATE DATABASE fuel_tracker;

-- Create user
CREATE USER fuel_user WITH PASSWORD 'fuel_password';

-- Grant privileges to development database
GRANT ALL PRIVILEGES ON DATABASE fuel_tracker_dev TO fuel_user;
GRANT ALL PRIVILEGES ON DATABASE fuel_tracker TO fuel_user;

-- Connect to development database to grant schema privileges
\c fuel_tracker_dev;
GRANT ALL ON SCHEMA public TO fuel_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fuel_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fuel_user;

-- Connect to production database to grant schema privileges  
\c fuel_tracker;
GRANT ALL ON SCHEMA public TO fuel_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fuel_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fuel_user;
