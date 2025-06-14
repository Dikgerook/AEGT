# 🚀 Aegisum Server Setup Guide

This guide will help you set up the Aegisum Tap2Earn bot on your production server.

## 📋 Prerequisites

- Ubuntu/Debian server with sudo access
- Domain name pointing to your server (webapp.aegisum.co.za)
- Telegram Bot Token
- TON API Key (optional)

## 🔧 Step-by-Step Setup

### 1. Pull Latest Changes

```bash
cd ~/AEGT
git pull origin main
```

### 2. Run Production Setup Script

```bash
# Make sure you're in the AEGT directory
cd ~/AEGT

# Run the production setup script
sudo ./production-setup.sh
```

This script will:
- ✅ Update system packages
- ✅ Install Node.js, PostgreSQL, Redis, Nginx, PM2
- ✅ Create database and user
- ✅ Install project dependencies
- ✅ Build frontend for production
- ✅ Configure Nginx for your domain
- ✅ Set up PM2 process management
- ✅ Configure firewall
- ✅ Optionally set up SSL certificate

### 3. Configure Environment Variables

After the setup script completes, you need to update the environment file:

```bash
nano backend/.env.production
```

**Important: Update these values:**

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-actual-telegram-bot-token-here

# TON Configuration (optional)
TON_API_KEY=your-ton-api-key-here

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-here

# Your admin Telegram ID is already set to: 1651155083
```

### 4. Restart the Application

After updating the environment file:

```bash
pm2 restart aegisum-backend
```

### 5. Verify Everything is Working

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs aegisum-backend

# Test backend health
curl http://localhost:3001/health

# Test frontend (should show HTML)
curl http://localhost
```

## 🌐 Domain Configuration

### DNS Setup
Make sure your domain points to your server:
```
webapp.aegisum.co.za → Your Server IP
aegisum.co.za → Your Server IP
```

### SSL Certificate
If you skipped SSL during setup, run:
```bash
sudo certbot --nginx -d webapp.aegisum.co.za -d aegisum.co.za
```

## 🤖 Telegram Bot Setup

1. **Get your bot token** from @BotFather on Telegram
2. **Update the environment file** with your token
3. **Set webhook** (optional, for production):
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url":"https://webapp.aegisum.co.za/api/telegram/webhook"}'
   ```

## 📱 Testing Your Setup

### 1. Test Backend API
```bash
curl https://webapp.aegisum.co.za/health
```

### 2. Test Frontend
Visit: `https://webapp.aegisum.co.za`

### 3. Test Telegram Bot
Send `/start` to your bot on Telegram

### 4. Test Admin Commands
As admin (Telegram ID: 1651155083), send `/admin` to your bot

## 🔄 Future Updates

When you need to update the application:

```bash
cd ~/AEGT
./update.sh
```

This will:
- Pull latest changes
- Update dependencies
- Run database migrations
- Restart the application
- Test everything is working

## 📊 Monitoring

### View Application Status
```bash
pm2 status
```

### View Logs
```bash
# All logs
pm2 logs aegisum-backend

# Error logs only
pm2 logs aegisum-backend --err

# Live logs
pm2 logs aegisum-backend --lines 0
```

### Restart Application
```bash
pm2 restart aegisum-backend
```

### Stop Application
```bash
pm2 stop aegisum-backend
```

## 🛠️ Troubleshooting

### Backend Not Starting
```bash
# Check logs
pm2 logs aegisum-backend

# Check environment file
cat backend/.env.production

# Restart
pm2 restart aegisum-backend
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
sudo -u postgres psql -c "SELECT version();"

# Check database exists
sudo -u postgres psql -l | grep aegisum
```

### Nginx Issues
```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

## 🔐 Security Notes

- ✅ Admin Telegram ID (1651155083) is already configured
- ✅ Firewall is configured to allow only necessary ports
- ✅ Database is secured with user authentication
- ✅ JWT tokens are used for API authentication
- ✅ CORS is configured for your domain

## 📞 Support

If you encounter any issues:

1. Check the logs: `pm2 logs aegisum-backend`
2. Verify services are running: `pm2 status`
3. Test individual components as shown above
4. Check the troubleshooting section

## 🎉 Success!

Once everything is set up, you should have:

- ✅ Frontend accessible at `https://webapp.aegisum.co.za`
- ✅ Backend API running on port 3001
- ✅ Telegram bot responding to commands
- ✅ Admin access with your Telegram ID (1651155083)
- ✅ Database with migrations and seed data
- ✅ SSL certificate for secure connections
- ✅ Process management with PM2
- ✅ Automatic restarts and monitoring

Your Aegisum Tap2Earn bot is now live! 🚀