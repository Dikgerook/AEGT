# Aegisum Tap2Earn Telegram Bot

A Telegram WebApp bot for the Aegisum Tap2Earn game built on the TON blockchain. Users earn AEGT tokens through passive mining, upgrade their miners with TON payments, and manage energy systems.

## 🎮 Game Features

- **Passive Mining**: Virtual miners run automatically, no tapping required
- **AEGT Token Rewards**: Earn tokens through block mining (3-minute cycles)
- **TON Integration**: Upgrade miners and refill energy using TON payments
- **Energy System**: Manage energy consumption and regeneration
- **Solo/Pool Mining**: Chance-based reward system
- **Clean UI**: Inspired by IEM bot with dark/light theme support

## 🏗️ Architecture

```
├── frontend/          # React Telegram WebApp
├── backend/           # Node.js API server
├── database/          # PostgreSQL schemas & Redis config
├── deployment/        # Docker, NGINX, deployment scripts
├── docs/             # API documentation
└── scripts/          # Utility scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- NGINX (for production)

### Development Setup

1. **Clone and install dependencies**
```bash
git clone https://github.com/Dikgerook/AEGT.git
cd AEGT
npm run install:all
```

2. **Setup environment**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

3. **Setup database**
```bash
npm run db:setup
```

4. **Start development servers**
```bash
npm run dev
```

### Production Deployment

See [deployment guide](./docs/DEPLOYMENT.md) for detailed instructions.

## 📱 WebApp Access

- Development: `http://localhost:3000`
- Production: `https://aegisum.co.za/webapp`

## 🔗 TON Integration

- **AEGT Jetton**: Custom token for rewards
- **TON Connect**: Secure wallet integration
- **Payments**: Miner upgrades and energy refills

## 📊 Game Mechanics

- **Base Hashrate**: 100 H/s (Level 1)
- **Energy Consumption**: ~33 energy/minute
- **Block Time**: 3 minutes
- **Rewards**: 1 AEGT per block (minus treasury fee)
- **Energy Capacity**: 1000 (base), regenerates 250/hour

## 🛠️ Development

### Available Scripts

```bash
npm run dev              # Start all development servers
npm run build           # Build for production
npm run test            # Run tests
npm run lint            # Lint code
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed test data
```

### API Documentation

See [API docs](./docs/API.md) for detailed endpoint documentation.

## 🔒 Security

- GDPR compliant user data handling
- Secure TON wallet integration
- Input validation and sanitization
- Rate limiting and DDoS protection

## 📈 Monitoring

- Real-time user metrics
- Mining statistics
- Error tracking and logging
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 📞 Support

- Website: [aegisum.co.za](https://aegisum.co.za)
- Telegram: [@AegisumSupport](https://t.me/AegisumSupport)
- Email: support@aegisum.co.za