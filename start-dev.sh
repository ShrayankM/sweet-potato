#!/bin/bash

# Sweet Potato Development Startup Script

echo "🥔 Sweet Potato Development Setup 🥔"
echo "======================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists java; then
    echo "❌ Java is not installed. Please install Java 17+"
    exit 1
fi

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

if ! command_exists npx; then
    echo "❌ npm/npx is not available. Please install Node.js with npm"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Start backend
echo "🚀 Starting Spring Boot backend..."
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "Backend started (PID: $BACKEND_PID)"
echo "Log file: backend.log"
echo ""

# Wait a moment for backend to start
sleep 3

# Start mobile app
echo "📱 Starting React Native app..."
cd mobile-app
npm install
npx expo start > ../mobile.log 2>&1 &
MOBILE_PID=$!
cd ..

echo "Mobile app started (PID: $MOBILE_PID)"
echo "Log file: mobile.log"
echo ""

echo "🎉 Both applications are starting up!"
echo ""
echo "📋 Quick Access:"
echo "   Backend API: http://localhost:8080/api"
echo "   Test endpoint: http://localhost:8080/api/test/public"
echo "   H2 Console: http://localhost:8080/h2-console (if using dev profile)"
echo ""
echo "📱 Mobile App:"
echo "   Expo will open in your browser shortly"
echo "   Use Expo Go app to scan QR code"
echo ""
echo "📝 To stop both applications:"
echo "   kill $BACKEND_PID $MOBILE_PID"
echo ""
echo "📜 View logs:"
echo "   Backend: tail -f backend.log"
echo "   Mobile:  tail -f mobile.log"

# Create stop script
cat > stop-dev.sh << EOF
#!/bin/bash
echo "Stopping Sweet Potato development servers..."
kill $BACKEND_PID $MOBILE_PID 2>/dev/null
echo "Development servers stopped."
EOF

chmod +x stop-dev.sh

echo ""
echo "💡 Run ./stop-dev.sh to stop both applications"
