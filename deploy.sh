#!/bin/bash

# Aegisum Deployment Script
echo "🚀 Starting Aegisum deployment..."

# Set environment variables
export NODE_ENV=production
export PORT=3001
export HOST=0.0.0.0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if services are running
check_services() {
    print_status "Checking required services..."
    
    # Check PostgreSQL
    if ! systemctl is-active --quiet postgresql; then
        print_warning "Starting PostgreSQL..."
        sudo systemctl start postgresql
    fi
    
    # Check Redis
    if ! systemctl is-active --quiet redis-server; then
        print_warning "Starting Redis..."
        sudo systemctl start redis-server
    fi
    
    print_status "Services are running"
}

# Install dependencies
install_dependencies() {
    print_status "Installing backend dependencies..."
    cd backend && npm install
    
    print_status "Installing frontend dependencies..."
    cd ../frontend && npm install
    cd ..
}

# Run database migrations
setup_database() {
    print_status "Running database migrations..."
    cd backend && npm run db:migrate
    
    print_status "Seeding database..."
    npm run db:seed
    cd ..
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    cd frontend && npm run build
    cd ..
}

# Start backend server
start_backend() {
    print_status "Starting backend server..."
    cd backend
    
    # Kill existing process if running
    pkill -f "node src/server.js" || true
    
    # Start server in background
    npm start > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid
    
    print_status "Backend server started with PID: $BACKEND_PID"
    cd ..
}

# Serve frontend
serve_frontend() {
    print_status "Starting frontend server..."
    cd frontend
    
    # Kill existing process if running
    pkill -f "serve -s build" || true
    
    # Install serve if not present
    if ! command -v serve &> /dev/null; then
        npm install -g serve
    fi
    
    # Start frontend server
    serve -s build -l 12000 > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    
    print_status "Frontend server started with PID: $FRONTEND_PID"
    cd ..
}

# Create logs directory
mkdir -p logs

# Main deployment flow
print_status "🎯 Aegisum Tap2Earn Bot Deployment"
print_status "=================================="

check_services
install_dependencies
setup_database
build_frontend
start_backend

# Wait for backend to start
sleep 5

# Test backend health
if curl -s http://localhost:3001/health > /dev/null; then
    print_status "✅ Backend is healthy"
else
    print_error "❌ Backend health check failed"
    exit 1
fi

serve_frontend

# Wait for frontend to start
sleep 3

# Test frontend
if curl -s http://localhost:12000 > /dev/null; then
    print_status "✅ Frontend is serving"
else
    print_error "❌ Frontend health check failed"
    exit 1
fi

print_status "🎉 Deployment completed successfully!"
print_status "=================================="
print_status "📱 Frontend: http://localhost:12000"
print_status "🔧 Backend API: http://localhost:3001"
print_status "📊 Health Check: http://localhost:3001/health"
print_status "🤖 Telegram Bot: Active with admin ID 1651155083"
print_status "=================================="
print_status "📝 Logs:"
print_status "   Backend: logs/backend.log"
print_status "   Frontend: logs/frontend.log"
print_status "=================================="

# Show running processes
print_status "Running processes:"
ps aux | grep -E "(node src/server.js|serve -s build)" | grep -v grep || print_warning "No processes found"

print_status "🚀 Aegisum is now live!"