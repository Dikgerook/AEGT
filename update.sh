#!/bin/bash

# Aegisum Update Script
# This script pulls the latest changes and updates the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[UPDATE]${NC} $1"
}

# Backup current environment file
backup_env() {
    if [ -f "backend/.env.production" ]; then
        print_status "Backing up current environment file..."
        cp backend/.env.production backend/.env.production.backup
    fi
}

# Pull latest changes
pull_changes() {
    print_header "Pulling latest changes from GitHub..."
    
    # Stash any local changes
    git stash push -m "Auto-stash before update $(date)"
    
    # Pull latest changes
    git pull origin main
    
    print_status "Latest changes pulled successfully"
}

# Update dependencies
update_dependencies() {
    print_header "Updating dependencies..."
    
    # Backend dependencies
    print_status "Updating backend dependencies..."
    cd backend && npm install --production
    
    # Frontend dependencies and build
    print_status "Updating frontend dependencies..."
    cd ../frontend && npm install
    
    print_status "Building frontend for production..."
    npm run build
    
    cd ..
}

# Restore environment file
restore_env() {
    if [ -f "backend/.env.production.backup" ]; then
        print_status "Restoring environment file..."
        cp backend/.env.production.backup backend/.env.production
    fi
}

# Run database migrations
run_migrations() {
    print_header "Running database migrations..."
    cd backend
    
    # Ensure we're using production env
    cp .env.production .env
    
    # Run migrations
    npm run db:migrate
    
    cd ..
    print_status "Database migrations completed"
}

# Restart application
restart_app() {
    print_header "Restarting application..."
    
    # Restart with PM2
    pm2 restart aegisum-backend
    
    # Wait a moment for restart
    sleep 3
    
    # Check if it's running
    if pm2 list | grep -q "aegisum-backend.*online"; then
        print_status "✅ Application restarted successfully"
    else
        print_error "❌ Application failed to restart"
        pm2 logs aegisum-backend --lines 20
        exit 1
    fi
}

# Test application
test_app() {
    print_header "Testing application..."
    
    # Test backend health
    if curl -s http://localhost:3001/health > /dev/null; then
        print_status "✅ Backend is healthy"
    else
        print_error "❌ Backend health check failed"
        exit 1
    fi
    
    # Test frontend (if nginx is configured)
    if curl -s http://localhost > /dev/null; then
        print_status "✅ Frontend is accessible"
    else
        print_warning "⚠️ Frontend test skipped (nginx might not be configured)"
    fi
}

# Main execution
main() {
    print_header "🔄 Aegisum Update Process"
    print_header "=========================="
    
    backup_env
    pull_changes
    update_dependencies
    restore_env
    run_migrations
    restart_app
    test_app
    
    print_header "🎉 Update completed successfully!"
    print_header "=========================="
    print_status "📱 Application Status:"
    pm2 status
    print_header "=========================="
    print_status "📝 View logs with: pm2 logs aegisum-backend"
}

# Run the main function
main "$@"