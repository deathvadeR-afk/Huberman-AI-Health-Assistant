# Security Guidelines - Huberman Health AI Assistant

## 🔒 Security Measures Implemented

### **Container Security**

#### **1. Base Image Security**
- ✅ **Updated Base Images**: Using `node:20-alpine3.19` and `postgres:16-alpine` with latest security patches
- ✅ **Vulnerability Scanning**: Regular updates to address CVEs
- ✅ **Minimal Attack Surface**: Alpine Linux with minimal packages

#### **2. Non-Root User Execution**
- ✅ **Frontend**: Runs as `nginx-user` (UID 1001)
- ✅ **Backend**: Runs as `nodejs` (UID 1001)
- ✅ **Database**: Uses PostgreSQL's built-in security model
- ✅ **No Privilege Escalation**: `no-new-privileges:true` flag

#### **3. Read-Only Filesystems**
- ✅ **Immutable Containers**: Read-only root filesystem
- ✅ **Temporary Directories**: Using tmpfs for writable areas
- ✅ **Volume Permissions**: Proper ownership and permissions

#### **4. Resource Limits**
- ✅ **Memory Limits**: Prevents DoS attacks
- ✅ **CPU Limits**: Resource allocation control
- ✅ **Network Isolation**: Custom bridge network

### **Application Security**

#### **1. Authentication & Authorization**
- ✅ **JWT Tokens**: Secure session management
- ✅ **Strong Secrets**: Minimum 32-character random secrets
- ✅ **Token Expiration**: Configurable token lifetime

#### **2. Input Validation**
- ✅ **Query Sanitization**: Prevents injection attacks
- ✅ **Rate Limiting**: Prevents abuse and DoS
- ✅ **CORS Configuration**: Controlled cross-origin requests

#### **3. Data Protection**
- ✅ **Database Encryption**: SCRAM-SHA-256 authentication
- ✅ **Redis Password**: Protected cache access
- ✅ **Environment Variables**: Sensitive data in env vars

#### **4. Network Security**
- ✅ **HTTPS Ready**: SSL/TLS configuration support
- ✅ **Security Headers**: Helmet.js integration
- ✅ **Port Binding**: Localhost-only for internal services

### **Monitoring & Logging**

#### **1. Security Monitoring**
- ✅ **Prometheus Metrics**: Security event tracking
- ✅ **Error Logging**: Comprehensive error tracking
- ✅ **Access Logs**: Request monitoring and analysis

#### **2. Health Checks**
- ✅ **Service Health**: Regular health monitoring
- ✅ **Database Health**: Connection and query monitoring
- ✅ **Cache Health**: Redis availability monitoring

## 🚨 Security Checklist for Production

### **Before Deployment**

- [ ] **Change Default Passwords**: Update all default credentials
- [ ] **Generate Strong Secrets**: Use cryptographically secure random values
- [ ] **Configure HTTPS**: Set up SSL/TLS certificates
- [ ] **Update Environment Variables**: Use production-specific values
- [ ] **Enable Monitoring**: Configure Prometheus and alerting
- [ ] **Backup Strategy**: Implement regular database backups
- [ ] **Security Scanning**: Run container vulnerability scans
- [ ] **Penetration Testing**: Conduct security assessment

### **Production Environment**

```bash
# 1. Copy and configure production environment
cp .env.production .env.prod

# 2. Generate secure passwords
openssl rand -base64 32  # For database password
openssl rand -base64 32  # For Redis password
openssl rand -base64 64  # For JWT secret

# 3. Deploy with production configuration
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 4. Verify security settings
docker exec huberman-backend-prod whoami  # Should return 'nodejs'
docker exec huberman-frontend-prod whoami  # Should return 'nginx-user'
```

### **Security Headers**

The application implements the following security headers:

```javascript
// Implemented in backend
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://openrouter.ai"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.youtube.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### **Database Security**

```sql
-- Implemented security measures
-- 1. SCRAM-SHA-256 authentication
-- 2. Limited user permissions
-- 3. Connection encryption
-- 4. Regular security updates

-- Create limited user (already implemented)
CREATE USER huberman_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE huberman_health_ai TO huberman_user;
GRANT USAGE ON SCHEMA public TO huberman_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO huberman_user;
```

## 🔍 Security Monitoring

### **Metrics to Monitor**

1. **Failed Authentication Attempts**
2. **Rate Limit Violations**
3. **Unusual Query Patterns**
4. **Resource Usage Spikes**
5. **Error Rate Increases**
6. **Database Connection Failures**

### **Alerting Rules**

```yaml
# Prometheus alerting rules (example)
groups:
  - name: security
    rules:
      - alert: HighErrorRate
        expr: rate(huberman_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          
      - alert: RateLimitViolations
        expr: rate(huberman_rate_limit_violations_total[5m]) > 0.05
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Rate limit violations detected"
```

## 📞 Security Incident Response

### **In Case of Security Incident**

1. **Immediate Actions**
   - Stop affected services
   - Isolate compromised containers
   - Preserve logs for analysis

2. **Investigation**
   - Analyze logs and metrics
   - Identify attack vectors
   - Assess data exposure

3. **Recovery**
   - Apply security patches
   - Update credentials
   - Restore from clean backups

4. **Post-Incident**
   - Update security measures
   - Improve monitoring
   - Document lessons learned

## 🔄 Regular Security Maintenance

### **Weekly Tasks**
- [ ] Review security logs
- [ ] Check for container updates
- [ ] Monitor security metrics

### **Monthly Tasks**
- [ ] Update base images
- [ ] Rotate credentials
- [ ] Security scan containers
- [ ] Review access logs

### **Quarterly Tasks**
- [ ] Security audit
- [ ] Penetration testing
- [ ] Update security documentation
- [ ] Review and update security policies
