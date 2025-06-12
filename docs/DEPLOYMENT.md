# Aegisum Deployment Guide

This guide provides step-by-step instructions for deploying the Aegisum Tap2Earn bot on a production server.

## Prerequisites

- Ubuntu 20.04+ server with at least 2GB RAM and 20GB storage
- Domain name pointing to your server (aegisum.co.za)
- SSL certificate for HTTPS
- Docker and Docker Compose installed

## Quick Start

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes to take effect
```

### 2. Clone Repository

```bash
git clone https://github.com/Dikgerook/AEGT.git
cd AEGT
```

### 3. Environment Configuration

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit environment variables
nano backend/.env
```

Required environment variables:
```env
# Database
DB_PASSWORD=your_secure_db_password

# Redis
REDIS_PASSWORD=your_secure_redis_password

# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# TON Configuration
TON_API_KEY=your_ton_api_key
AEGT_JETTON_ADDRESS=your_aegt_jetton_master_address

# API URL for frontend
REACT_APP_API_URL=https://aegisum.co.za/api
```

### 4. SSL Certificate Setup

```bash
# Create SSL directory
mkdir -p deployment/ssl

# Copy your SSL certificates
cp /path/to/your/aegisum.co.za.crt deployment/ssl/
cp /path/to/your/aegisum.co.za.key deployment/ssl/

# Set proper permissions
chmod 600 deployment/ssl/aegisum.co.za.key
chmod 644 deployment/ssl/aegisum.co.za.crt
```

### 5. Deploy Application

```bash
cd deployment

# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 6. Database Migration

```bash
# Run database migrations
docker-compose exec backend npm run db:migrate

# Seed initial data (optional)
docker-compose exec backend npm run db:seed
```

### 7. Verify Deployment

```bash
# Check health endpoints
curl https://aegisum.co.za/health
curl https://aegisum.co.za/api/health

# Check WebApp
curl https://aegisum.co.za/webapp/
```

## Manual Installation (Without Docker)

### 1. Install Dependencies

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server

# Install NGINX
sudo apt install nginx
```

### 2. Database Setup

```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE aegisum;
CREATE USER aegisum_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE aegisum TO aegisum_user;
\q
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
nano .env

# Run migrations
npm run db:migrate

# Start backend (use PM2 for production)
npm install -g pm2
pm2 start src/server.js --name aegisum-backend
pm2 save
pm2 startup
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Build for production
REACT_APP_API_URL=https://aegisum.co.za/api npm run build

# Copy build to web server
sudo cp -r build/* /var/www/html/webapp/
```

### 5. NGINX Configuration

```bash
# Copy NGINX configuration
sudo cp deployment/nginx.conf /etc/nginx/sites-available/aegisum
sudo ln -s /etc/nginx/sites-available/aegisum /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart NGINX
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check all services
docker-compose ps

# Check logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
docker-compose logs redis

# Check resource usage
docker stats
```

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U aegisum_user aegisum > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T postgres psql -U aegisum_user aegisum < backup_file.sql
```

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose build
docker-compose up -d

# Run any new migrations
docker-compose exec backend npm run db:migrate
```

### Performance Optimization

1. **Database Optimization**
   ```sql
   -- Add indexes for better performance
   CREATE INDEX CONCURRENTLY idx_mining_blocks_user_mined ON mining_blocks(user_id, mined_at);
   CREATE INDEX CONCURRENTLY idx_users_last_activity ON users(last_activity) WHERE is_active = true;
   ```

2. **Redis Configuration**
   ```bash
   # Optimize Redis memory usage
   echo "maxmemory 512mb" >> /etc/redis/redis.conf
   echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
   ```

3. **NGINX Optimization**
   ```nginx
   # Add to nginx.conf
   worker_processes auto;
   worker_connections 2048;
   keepalive_timeout 30;
   client_body_timeout 12;
   client_header_timeout 12;
   send_timeout 10;
   ```

## Security Considerations

1. **Firewall Setup**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **SSL Security**
   - Use strong SSL ciphers
   - Enable HSTS headers
   - Regular certificate renewal

3. **Database Security**
   - Use strong passwords
   - Limit database connections
   - Regular security updates

4. **Application Security**
   - Keep dependencies updated
   - Use environment variables for secrets
   - Implement rate limiting
   - Regular security audits

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database status
   docker-compose exec postgres pg_isready -U aegisum_user

   # Check connection from backend
   docker-compose exec backend npm run db:test
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis status
   docker-compose exec redis redis-cli ping

   # Check Redis logs
   docker-compose logs redis
   ```

3. **Frontend Not Loading**
   ```bash
   # Check NGINX status
   docker-compose exec nginx nginx -t

   # Check frontend build
   docker-compose logs frontend
   ```

4. **API Errors**
   ```bash
   # Check backend logs
   docker-compose logs backend

   # Check API health
   curl https://aegisum.co.za/api/health
   ```

### Log Locations

- Backend logs: `backend/logs/`
- NGINX logs: `/var/log/nginx/`
- Docker logs: `docker-compose logs [service]`

## Support

For deployment issues or questions:
- Check the logs first
- Review this documentation
- Contact support at support@aegisum.co.za
- Create an issue on GitHub