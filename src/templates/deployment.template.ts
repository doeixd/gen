/**
 * Deployment Configuration Templates
 * Generates Docker, CI/CD, and environment configurations
 */

import type { Entity } from '../entity'
import { getFieldNames } from '../utils'
import { yaml, dockerfile, shell, json } from '../tags'

export interface DeploymentTemplateOptions {
  entity: Entity<any>
  platform: 'docker' | 'kubernetes' | 'vercel' | 'railway' | 'render'
  database: 'postgres' | 'mysql' | 'sqlite' | 'mongodb'
  includeCI?: boolean
  includeCD?: boolean
  environment: 'development' | 'staging' | 'production'
}

export function generateDockerCompose(options: DeploymentTemplateOptions): string {
  const { database } = options

  const services: any = {
    app: {
      build: '.',
      ports: ['3000:3000'],
      environment: [
        'NODE_ENV=development',
        'DATABASE_URL=postgresql://user:password@db:5432/app'
      ],
      depends_on: ['db'],
      volumes: ['./:/app', '/app/node_modules']
    }
  }

  // Add database service
  switch (database) {
    case 'postgres':
      services.db = {
        image: 'postgres:15',
        environment: [
          'POSTGRES_USER=user',
          'POSTGRES_PASSWORD=password',
          'POSTGRES_DB=app'
        ],
        ports: ['5432:5432'],
        volumes: ['postgres_data:/var/lib/postgresql/data']
      }
      break

    case 'mysql':
      services.db = {
        image: 'mysql:8',
        environment: [
          'MYSQL_ROOT_PASSWORD=root',
          'MYSQL_DATABASE=app',
          'MYSQL_USER=user',
          'MYSQL_PASSWORD=password'
        ],
        ports: ['3306:3306'],
        volumes: ['mysql_data:/var/lib/mysql']
      }
      break

    case 'mongodb':
      services.db = {
        image: 'mongo:7',
        environment: [
          'MONGO_INITDB_ROOT_USERNAME=user',
          'MONGO_INITDB_ROOT_PASSWORD=password',
          'MONGO_INITDB_DATABASE=app'
        ],
        ports: ['27017:27017'],
        volumes: ['mongo_data:/data/db']
      }
      break
  }

  return yaml`
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=${database === 'postgres' ? 'postgresql://user:password@db:5432/app' :
                     database === 'mysql' ? 'mysql://user:password@db:3306/app' :
                     database === 'mongodb' ? 'mongodb://user:password@db:27017/app' : ''}
    depends_on:
${database !== 'sqlite' ? `      - db` : ''}
    volumes:
      - ./:/app
      - /app/node_modules
${database !== 'sqlite' ? `
  db:
${database === 'postgres' ? `    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data` :
database === 'mysql' ? `    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=root
      - MYSQL_DATABASE=app
      - MYSQL_USER=user
      - MYSQL_PASSWORD=password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql` :
database === 'mongodb' ? `    image: mongo:7
    environment:
      - MONGO_INITDB_ROOT_USERNAME=user
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=app
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db` : ''}` : ''}

volumes:
${database === 'postgres' ? '  postgres_data:' :
database === 'mysql' ? '  mysql_data:' :
database === 'mongodb' ? '  mongo_data:' : ''}
`
}

export function generateDockerfile(options: DeploymentTemplateOptions): string {
  const { platform } = options

  return dockerfile`
# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Change ownership
RUN chown -R appuser:nodejs /app
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
`
}

export function generateGitHubActions(options: DeploymentTemplateOptions): string {
  const { platform, environment, includeCI = true, includeCD = false } = options

  if (!includeCI) return ''

  return yaml`
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run type-check

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Run linting
        run: npm run lint

${includeCD ? `
  deploy:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Deploy to ${platform}
        run: |
          echo "Deploying to ${platform}..."
          # Add deployment commands here
` : ''}
`
}

export function generateEnvironmentConfig(options: DeploymentTemplateOptions): string {
  const { environment, database, platform } = options

  const configs = {
    development: {
      NODE_ENV: 'development',
      PORT: '3000',
      LOG_LEVEL: 'debug',
      CORS_ORIGIN: 'http://localhost:3000',
    },
    staging: {
      NODE_ENV: 'staging',
      PORT: '3000',
      LOG_LEVEL: 'info',
      CORS_ORIGIN: 'https://staging.yourapp.com',
    },
    production: {
      NODE_ENV: 'production',
      PORT: '3000',
      LOG_LEVEL: 'warn',
      CORS_ORIGIN: 'https://yourapp.com',
    }
  }

  const baseConfig = configs[environment]

  // Database configuration
  switch (database) {
    case 'postgres':
      baseConfig.DATABASE_URL = environment === 'production'
        ? '${DATABASE_URL}'
        : 'postgresql://user:password@localhost:5432/app'
      break
    case 'mysql':
      baseConfig.DATABASE_URL = environment === 'production'
        ? '${DATABASE_URL}'
        : 'mysql://user:password@localhost:3306/app'
      break
    case 'mongodb':
      baseConfig.DATABASE_URL = environment === 'production'
        ? '${MONGODB_URI}'
        : 'mongodb://user:password@localhost:27017/app'
      break
    case 'sqlite':
      baseConfig.DATABASE_URL = environment === 'production'
        ? '${DATABASE_URL}'
        : 'file:./dev.db'
      break
  }

  // Platform-specific configuration
  switch (platform) {
    case 'vercel':
      baseConfig.VERCEL = 'true'
      break
    case 'railway':
      baseConfig.RAILWAY_STATIC_URL = '${RAILWAY_STATIC_URL}'
      break
    case 'render':
      baseConfig.RENDER = 'true'
      break
  }

  // Security configuration
  baseConfig.JWT_SECRET = environment === 'production' ? '${JWT_SECRET}' : 'development-secret-key'
  baseConfig.BCRYPT_ROUNDS = environment === 'production' ? '12' : '8'

  // External services
  baseConfig.REDIS_URL = environment === 'production' ? '${REDIS_URL}' : 'redis://localhost:6379'
  baseConfig.SMTP_HOST = environment === 'production' ? '${SMTP_HOST}' : 'localhost'
  baseConfig.SMTP_PORT = environment === 'production' ? '${SMTP_PORT}' : '587'

  return Object.entries(baseConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

export function generateNginxConfig(options: DeploymentTemplateOptions): string {
  const { environment } = options

  return `
# Nginx configuration for ${environment}

upstream app_backend {
    server app:3000;
}

server {
    listen 80;
    server_name ${environment === 'production' ? 'yourapp.com' : 'localhost'};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Static files
    location /_next/static {
        proxy_pass http://app_backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API routes
    location /api {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Main application
    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }

    # Error pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
`
}

export function generateKubernetesManifests(options: DeploymentTemplateOptions): string {
  const { entity, environment, database } = options

  return yaml`
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: ${environment}
data:
  NODE_ENV: "${environment}"
  PORT: "3000"
  DATABASE_URL: "${database === 'postgres' ? 'postgresql://user:password@postgres:5432/app' : ''}"

---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: ${environment}
type: Opaque
data:
  JWT_SECRET: "$(echo -n 'your-jwt-secret' | base64)"
  DATABASE_PASSWORD: "$(echo -n 'your-db-password' | base64)"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: ${environment}
spec:
  replicas: ${environment === 'production' ? 3 : 1}
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
      - name: app
        image: your-registry/app:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: app-service
  namespace: ${environment}
spec:
  selector:
    app: app
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: ${environment}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: ${environment === 'production' ? 'yourapp.com' : 'app.local'}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 3000
`
}
