# Sweet Potato Setup Instructions

## Prerequisites

- **Node.js 18+**
- **Java 17+** 
- **PostgreSQL** (for production)
- **Expo CLI**: `npm install -g expo-cli`

## Backend Setup

1. **Install and Setup PostgreSQL:**
   
   **macOS (using Homebrew):**
   ```bash
   brew install postgresql
   brew services start postgresql
   ```
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```
   
   **Windows:**
   Download and install PostgreSQL from https://www.postgresql.org/download/

2. **Create Database and User:**
   ```bash
   # Connect to PostgreSQL as superuser
   psql -U postgres
   
   # Or run the setup script directly
   psql -U postgres -f backend/setup-postgres.sql
   ```
   
   **Alternatively, create manually:**
   ```sql
   CREATE DATABASE fuel_tracker_dev;
   CREATE DATABASE fuel_tracker;
   CREATE USER fuel_user WITH PASSWORD 'fuel_password';
   GRANT ALL PRIVILEGES ON DATABASE fuel_tracker_dev TO fuel_user;
   GRANT ALL PRIVILEGES ON DATABASE fuel_tracker TO fuel_user;
   ```

3. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

4. **Set Environment Variables (Optional):**
   ```bash
   export DB_USERNAME=fuel_user
   export DB_PASSWORD=fuel_password
   export JWT_SECRET=mySecretKey1234567890123456789012345678901234567890
   ```

5. **Run the Application:**
   
   **Development mode:**
   ```bash
   mvn spring-boot:run -Dspring-boot.run.profiles=dev
   ```
   
   **Production mode:**
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

6. **Test the backend:**
   - Public endpoint: `GET http://localhost:8081/api/test/public` (dev mode)
   - Register: `POST http://localhost:8081/api/auth/register`
   - Login: `POST http://localhost:8081/api/auth/login`

## Mobile App Setup

1. **Navigate to mobile app directory:**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on device/emulator:**
   - **iOS**: Press `i` in the terminal or scan QR code with Camera app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app

## API Testing with cURL

### Register a new user:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

### Login:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

### Test protected endpoint:
```bash
curl -X GET http://localhost:8080/api/test/protected \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Development Notes

### Backend:
- **Port**: 8081 (dev), 8080 (prod)
- **Context Path**: `/api`
- **Database**: PostgreSQL (both dev and prod)
- **JWT Expiration**: 24 hours
- **Refresh Token Expiration**: 7 days

### Mobile App:
- **Framework**: React Native with Expo
- **State Management**: Redux Toolkit + RTK Query
- **Navigation**: React Navigation v6
- **Storage**: Expo SecureStore

## Next Steps

1. **AWS S3 Configuration**: Configure AWS credentials for receipt image storage
2. **Mistral AI Integration**: Add API key for OCR functionality
3. **Push Notifications**: Set up Firebase for notifications
4. **Production Deployment**: Configure production environment variables

## Common Issues

### Backend won't start:
- **Check Java version:** `java -version` (should be 17+)
- **Check PostgreSQL service:** 
  ```bash
  # macOS
  brew services list | grep postgresql
  
  # Ubuntu/Debian
  sudo systemctl status postgresql
  ```
- **Verify database exists:**
  ```bash
  psql -U fuel_user -d fuel_tracker_dev -c "\l"
  ```
- **Check port availability:**
  ```bash
  lsof -i :8081  # for dev mode
  lsof -i :8080  # for prod mode
  ```

### Mobile app won't start:
- Clear Expo cache: `npx expo start -c`
- Check Node.js version: `node -v` (should be 18+)
- Install Expo CLI globally if missing

### Authentication not working:
- Verify backend is running on port 8080
- Check network connectivity between app and backend
- For physical devices, ensure they're on the same network
