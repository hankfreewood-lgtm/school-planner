# OmniRoute Setup Guide

## Overview
OmniRoute is the #1 open source AI router that connects you to 352+ AI providers (OpenAI, Anthropic, Google, Groq, etc.) through a single, unified OpenAI-compatible endpoint.

It provides:
- Automatic fallback between providers
- Context compression (15-95% token reduction)
- Free quota pooling across 90+ free tiers
- 19 routing strategies
- Built-in dashboard and observability
- One endpoint for Claude Code, Cursor, Copilot, Gemini CLI, etc.

## Quick Start

### 1. Install OmniRoute
```bash
npm install -g omniroute
```

**Note:** This package is approximately 914MB unpacked with 105 dependencies. Ensure you have sufficient disk space (~2GB recommended).

### 2. Start OmniRoute Gateway
```bash
omniroute
```

This will start:
- Dashboard: `http://localhost:20128/dashboard`
- API: `http://localhost:20128/v1/chat/completions`

### 3. Connect Your Tools
Point your AI clients to `http://localhost:20128/v1` using OpenAI-compatible format.

## Detailed Setup

### Prerequisites
- Node.js 18+
- Minimum 2GB free disk space
- Administrator privileges (may be required for global npm install on Windows)

### Installation Steps

1. **Verify Node.js installation**
```bash
node --version
npm --version
```

2. **Install OmniRoute**
```bash
# On Windows, you may need admin privileges:
# Right-click Command Prompt as Administrator and run:
npm install -g omniroute

# Or if global install fails:
npx omniroute
```

3. **First Run Configuration**
- First time you run `omniroute`, you'll be prompted to configure:
  - Provider connections (API keys, OAuth)
  - Routing strategies
  - Fallback preferences
  - Quota settings

4. **Access Dashboard**
Open `http://localhost:20128/dashboard` in your browser to:
- Connect new providers
- Configure routing strategies
- Monitor usage and costs
- View provider health

### Provider Setup

#### Free Tier Connection (Recommended for testing)
1. In dashboard, click "Connect" or "Add Provider"
2. Select "Free Tier" providers (90+ available)
3. No API key required for most free tiers

#### API Key Connection
1. Select a provider (OpenAI, Anthropic, Google, etc.)
2. Enter your API key
3. Optionally set monthly/quota limits

### Routing Configuration

#### Available Strategies
1. **auto** (default) - Balanced, task-aware routing
2. **auto/coding** - Optimized for code generation
3. **auto/fast** - Latency-optimized
4. **auto/cheap** - Cost-optimized
5. **auto/offline** - Prefers local models
6. **auto/smart** - Intelligent quality scoring

#### Customize Routing
1. In dashboard, go to "Combos"
2. Create or select a routing strategy
3. Configure:
   - Fallback chains
   - Model preferences
   - Context window handling
   - Compression settings

### Verification

#### Test Connection
```bash
curl http://localhost:20128/v1/models \
  -H "Authorization: Bearer $OMNIROUTE_API_KEY" \
  -H "Content-Type: application/json"
```

#### Test Chat Completion
```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Hello"}]}'
```

### Common Issues & Solutions

#### Port Conflicts
If port 20128 is already in use:
- Change port in config file: `~/.omniroute/config.yaml`
- Specify on first run: `omniroute --port 20128`

#### Disk Space Issues
- Uninstall unnecessary packages: `npm uninstall -g <package>`
- Check disk usage: `du -sh ~/.omniroute`

### Production Considerations

#### Environment Variables
```bash
# Enable logging
OMNIROUTE_LOG_LEVEL=debug

# Set listen address
OMNIROUTE_HOST=0.0.0.0

# Custom port
OMNIROUTE_PORT=20128
```

#### Service Management
```bash
# On Windows - create a Windows Service
# Or use PM2 for process management
npm install -g pm2
pm2 start omniroute --name omniroute
pm2 save
pm2 startup
```

### Provider Catalog

#### Supported Categories
- **API Key**: OpenAI, Anthropic, Google, Groq, NVIDIA, Cerebras, Mistral
- **Web Cookie**: ChatGPT Web, Claude Web, Gemini Web
- **Local**: Ollama, LM Studio, vLLM, llama.cpp
- **OAuth**: Claude Code, Cursor, Copilot, GitHub, Kiro
- **Free Forever**: 56 providers with no API key required

### Advanced Configuration

#### Configuration File
Edit `~/.omniroute/config.yaml` to set:
```yaml
port: 20128
host: localhost
providers:
  - name: my-openai
    type: api-key
    api_key: sk-your-key
    models:
      - gpt-_TCP
      - gpt-4o
  
routing:
  default_strategy: auto
  fallback:
    max_attempts: 3
    cooldown: 30
  compression:
    enabled: true
    profile: standard
```

#### Environment File
```bash
# .env
OMNIROUTE_API_KEY=your-key
OMNIROUTE_HOST=localhost
OMNIROUTE_PORT=20128
OMNIROUTE_LOG_LEVEL=info
```

### Integration with Clients

#### Claude Code
```bash
claude mcp add omniroute --type http --url http://localhost:20128/api/mcp/stream
```

#### Cursor
```json
{
  "apiEndpoint": "http://localhost:20128/v1",
  "model": "auto",
  "apiKey": "any-key-or-empty"
}
```

#### Copilot
```bash
# Configure in Copilot settings:
# API Endpoint: http://localhost:20128/v1
# Model: auto (or specific provider)
```

### Monitoring & Maintenance

#### Usage Dashboard
- View real-time metrics at `http://localhost:20128/dashboard`
- Track: requests, latency, costs, provider health
- Set up alerts for quota exhaustion

#### Health Checks
```bash
# Check provider health
curl http://localhost:20128/health/providers

# Check gateway status
curl http://localhost:20128/health/gateway
```

#### Backup Configuration
```bash
# Export configuration
cp -r ~/.omniroute ~/.omniroute.backup.$(date +%Y%m%d)

# Restore configuration
rm -rf ~/.omniroute && cp -r ~/.omniroute.backup ~/.omniroute
```

### Troubleshooting

#### Connection Refused
```bash
# Check if omniroute is running
ps aux | grep omniroute
# Or on Windows
netstat -ano | find "20128"
```

#### Provider Not Working
1. Verify API key is correct
2. Check provider status in dashboard
3. Clear browser cache if using web-based providers
4. Check network connectivity

#### Performance Issues
1. Monitor context compression settings
2. Check rate limits on provider keys
3. Verify local system resources
4. Consider running on dedicated hardware for production

## Files Created by OmniRoute

- `~/.omniroute/` - Configuration, logs, and data
- `~/.omniroute/config.yaml` - Routing and provider configuration
- `~/.omniroute/data/` - Encrypted credentials and usage data
- `~/.omniroute/logs/` - Diagnostic logs
- `~/.omniroute/credentials/` - Encrypted API keys

## Support & Resources

- **Documentation**: https://github.com/cheaper-inference/OmniRoute
- **Dashboard**: http://localhost:20128/dashboard
- **Discord**: https://discord.com/invite/zhqUkpTX
- **Community**: https://www.omniroute.online

## Important Notes

1. **Large Installation**: Expect ~914MB unpacked size
2. **Admin Privileges**: May be required for global npm install
3. **First Run**: Interactive configuration wizard
4. **Firewall**: Port 20128 may need to be opened
5. **Updates**: Run `npm update -g omniroute` to upgrade

## Security Considerations

- All credentials are encrypted locally
- No OmniRoute account required for self-hosting
- Keys never leave your controlled infrastructure
- Regular backups recommended
- Monitor usage for unusual activity