#!/bin/bash

# Aegisum Production Setup Script
# This script sets up the Aegisum Tap2Earn bot for production deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. This is fine for setup."
    else
        print_status "Running as user. Will use sudo when needed."
    fi
}

# Update system packages
update_system() {
    print_header "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
}

# Install required dependencies
install_dependencies() {
    print_header "Installing required dependencies..."
    
    # Install Node.js 18.x
    if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
        print_status "Installing Node.js 18.x..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        print_status "Node.js $(node -v) is already installed"
    fi
    
    # Install PostgreSQL
    if ! command -v psql &> /dev/null; then
        print_status "Installing PostgreSQL..."
        sudo apt install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    else
        print_status "PostgreSQL is already installed"
    fi
    
    # Install Redis
    if ! command -v redis-server &> /dev/null; then
        print_status "Installing Redis..."
        sudo apt install -y redis-server
        sudo systemctl start redis-server
        sudo systemctl enable redis-server
    else
        print_status "Redis is already installed"
    fi
    
    # Install Nginx
    if ! command -v nginx &> /dev/null; then
        print_status "Installing Nginx..."
        sudo apt install -y nginx
        sudo systemctl start nginx
        sudo systemctl enable nginx
    else
        print_status "Nginx is already installed"
    fi
    
    # Install PM2 globally
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2..."
        sudo npm install -g pm2
    else
        print_status "PM2 is already installed"
    fi
    
    # Install other utilities
    sudo apt install -y curl wget git jq certbot python3-certbot-nginx
}

# Setup PostgreSQL database
setup_database() {
    print_header "Setting up PostgreSQL database..."
    
    # Create database and user
    sudo -u postgres psql -c "CREATE DATABASE aegisum;" 2>/dev/null || print_warning "Database 'aegisum' already exists"
    sudo -u postgres psql -c "CREATE USER aegisum_user WITH PASSWORD 'aegisum_password';" 2>/dev/null || print_warning "User 'aegisum_user' already exists"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aegisum TO aegisum_user;" 2>/dev/null || true
    sudo -u postgres psql -c "ALTER USER aegisum_user CREATEDB;" 2>/dev/null || true
    
    print_status "Database setup completed"
}

# Setup environment variables
setup_environment() {
    print_header "Setting up environment variables..."
    
    # Create production .env file
    cat > backend/.env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aegisum
DB_USER=aegisum_user
DB_PASSWORD=aegisum_password
DB_SSL=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://webapp.aegisum.co.za,https://aegisum.co.za,http://localhost:3000

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
TELEGRAM_WEBHOOK_URL=https://webapp.aegisum.co.za/api/telegram/webhook

# TON Configuration
TON_NETWORK=mainnet
TON_API_KEY=your-ton-api-key-here

# Admin Configuration
ADMIN_TELEGRAM_ID=1651155083

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Mining Configuration
MINING_REWARD_BASE=10
MINING_ENERGY_COST=1
MINING_COOLDOWN_MS=1000

# Energy Configuration
ENERGY_MAX_DEFAULT=1000
ENERGY_REGEN_RATE=1
ENERGY_REGEN_INTERVAL=60000
EOF

    print_status "Environment file created at backend/.env.production"
    print_warning "Please update the following in backend/.env.production:"
    print_warning "  - TELEGRAM_BOT_TOKEN"
    print_warning "  - TON_API_KEY"
    print_warning "  - JWT_SECRET (generate a secure random string)"
}

# Install project dependencies
install_project_deps() {
    print_header "Installing project dependencies..."
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd backend && npm install --production
    
    # Frontend dependencies and build
    print_status "Installing frontend dependencies..."
    cd ../frontend && npm install
    
    print_status "Building frontend for production..."
    npm run build
    
    cd ..
}

# Run database migrations
run_migrations() {
    print_header "Running database migrations..."
    cd backend
    
    # Copy production env for migrations
    cp .env.production .env
    
    # Run migrations
    npm run db:migrate
    
    # Seed database
    npm run db:seed
    
    cd ..
    print_status "Database migrations completed"
}

# Setup Nginx configuration
setup_nginx() {
    print_header "Setting up Nginx configuration..."
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/aegisum << EOF
server {
    listen 80;
    server_name webapp.aegisum.co.za aegisum.co.za;

    # Frontend (React app)
    location / {
        root /home/daimond/AEGT/frontend/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/aegisum /etc/nginx/sites-enabled/
    
    # Remove default site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    print_status "Nginx configuration completed"
}

# Setup PM2 process management
setup_pm2() {
    print_header "Setting up PM2 process management..."
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'aegisum-backend',
    script: './backend/src/server.js',
    cwd: '/home/daimond/AEGT',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },
    env_file: './backend/.env.production',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_file: './logs/backend-combined.log',
    time: true,
    autorestart: true,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

    # Create logs directory
    mkdir -p logs
    
    # Start the application with PM2
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup
    
    print_status "PM2 setup completed"
}

# Setup SSL certificate
setup_ssl() {
    print_header "Setting up SSL certificate..."
    
    print_warning "Setting up SSL certificate for webapp.aegisum.co.za"
    print_warning "Make sure your domain points to this server before proceeding!"
    
    read -p "Do you want to setup SSL certificate now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo certbot --nginx -d webapp.aegisum.co.za -d aegisum.co.za
        print_status "SSL certificate setup completed"
    else
        print_warning "SSL setup skipped. You can run this later:"
        print_warning "sudo certbot --nginx -d webapp.aegisum.co.za -d aegisum.co.za"
    fi
}

# Setup firewall
setup_firewall() {
    print_header "Setting up firewall..."
    
    # Enable UFW
    sudo ufw --force enable
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80
    sudo ufw allow 443
    
    # Allow backend port (only from localhost)
    sudo ufw allow from 127.0.0.1 to any port 3001
    
    print_status "Firewall setup completed"
}

# Final checks
run_checks() {
    print_header "Running final checks..."
    
    # Check if services are running
    if systemctl is-active --quiet postgresql; then
        print_status "✅ PostgreSQL is running"
    else
        print_error "❌ PostgreSQL is not running"
    fi
    
    if systemctl is-active --quiet redis-server; then
        print_status "✅ Redis is running"
    else
        print_error "❌ Redis is not running"
    fi
    
    if systemctl is-active --quiet nginx; then
        print_status "✅ Nginx is running"
    else
        print_error "❌ Nginx is not running"
    fi
    
    # Check PM2 processes
    if pm2 list | grep -q "aegisum-backend"; then
        print_status "✅ Backend is running with PM2"
    else
        print_error "❌ Backend is not running"
    fi
    
    # Check database connection
    if cd backend && node -e "
        require('dotenv').config({ path: '.env.production' });
        const { Pool } = require('pg');
        const pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        pool.query('SELECT NOW()', (err, res) => {
            if (err) {
                console.error('Database connection failed:', err.message);
                process.exit(1);
            } else {
                console.log('Database connection successful');
                process.exit(0);
            }
        });
    " 2>/dev/null; then
        print_status "✅ Database connection successful"
    else
        print_error "❌ Database connection failed"
    fi
    
    cd ..
}

# Main execution
main() {
    print_header "🚀 Aegisum Production Setup"
    print_header "=================================="
    
    check_permissions
    update_system
    install_dependencies
    setup_database
    setup_environment
    install_project_deps
    run_migrations
    setup_nginx
    setup_pm2
    setup_firewall
    setup_ssl
    run_checks
    
    print_header "🎉 Setup completed successfully!"
    print_header "=================================="
    print_status "📱 Your application should now be available at:"
    print_status "   https://webapp.aegisum.co.za (if SSL is configured)"
    print_status "   http://webapp.aegisum.co.za (if SSL is not configured)"
    print_header "=================================="
    print_status "📝 Important next steps:"
    print_status "1. Update backend/.env.production with your actual tokens"
    print_status "2. Restart the backend: pm2 restart aegisum-backend"
    print_status "3. Test your Telegram bot"
    print_status "4. Monitor logs: pm2 logs aegisum-backend"
    print_header "=================================="
    print_status "🛠️ Useful commands:"
    print_status "   pm2 status              - Check application status"
    print_status "   pm2 logs aegisum-backend - View application logs"
    print_status "   pm2 restart aegisum-backend - Restart application"
    print_status "   sudo nginx -t           - Test Nginx configuration"
    print_status "   sudo systemctl reload nginx - Reload Nginx"
    print_header "=================================="
}

# Run the main function
main "$@"