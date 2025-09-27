# Test Config Files for Individual Analysis

## Dev Config (test-dev.yaml)
```yaml
debug: true
ssl_verify: false
api_key: hardcoded_secret_123
log_level: debug
database_host: localhost
api_timeout: 5000
```

## Prod Config (test-prod.yaml)  
```yaml
debug: false
ssl_verify: true
api_timeout: 30000
database_host: prod.example.com
log_level: error
cache_enabled: true
```

## Expected Individual Analysis Results

### Dev Analysis Should Find:
1. **debug: true** - High Risk (debug mode enabled)
2. **ssl_verify: false** - High Risk (SSL verification disabled)
3. **api_key: hardcoded_secret_123** - High Risk (exposed secret)

### Prod Analysis Should Find:
1. **api_timeout: 30000** - Low Risk (might be too high)
2. Any other production-specific issues

## Expected Combined Results:
- Dev issues will be marked with `problematicEnvironment: 'dev'`
- Prod issues will be marked with `problematicEnvironment: 'prod'`
- Only problematic sides will be highlighted in code diff
- Each side gets its own specific recommendations