# Sweet Potato - Fuel Receipt OCR App

A React Native mobile application with Spring Boot backend for processing fuel receipts using OCR.

## Project Structure

```
sweet-potato/
├── mobile-app/          # React Native Expo application
├── backend/             # Spring Boot application
└── README.md           # This file
```

## Tech Stack

### Frontend (React Native)
- React Native with TypeScript
- Expo
- React Navigation v6
- Redux Toolkit + RTK Query
- Expo SecureStore for token storage
- Expo Image Picker

### Backend (Spring Boot)
- Spring Boot 3.x with Java 17+
- Spring Security with JWT
- Spring Data JPA
- PostgreSQL
- Maven
- Amazon S3

## Getting Started

### Prerequisites
- Node.js 18+
- Java 17+
- PostgreSQL
- Expo CLI

### Setup Instructions

1. **Backend Setup:**
   ```bash
   cd backend
   mvn clean install
   mvn spring-boot:run
   ```

2. **Mobile App Setup:**
   ```bash
   cd mobile-app
   npm install
   npx expo start
   ```

## Features
- User Authentication (Register/Login/Logout)
- Fuel Receipt OCR using Mistral AI
- Secure token storage
- Automatic login persistence

## API Endpoints

### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- POST `/api/auth/refresh` - Token refresh
- POST `/api/auth/logout` - User logout

### Fuel Records
- GET `/api/fuel-records` - Get user's fuel records
- POST `/api/fuel-records` - Create new fuel record
- GET `/api/fuel-records/{id}` - Get specific fuel record
