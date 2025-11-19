import { writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env')
if (existsSync(envPath)) {
  console.log('.env ya existe; se omite la generación')
  process.exit(0)
}

const content = `# MongoDB Connection URI
MONGODB_URI=mongodb://mongo:password@localhost:27017
# Specifies the MongoDB port only if it differs from the default 27017
PORT_MONGODB=27017

MONGODB_TEST_DB=testdb
MONGODB_TEST_COLLECTION=testcollection

# API Configuration
API_BASE_URL=http://localhost:3000
API_TOKEN=example_api_token_1234567890
API_TIMEOUT=10000
NEXT_PUBLIC_API_TOKEN=example_api_token_1234567890

#SUPER ADMIN ACCESS CREDENTIALS
ADMIN_USER=admin@example.com
ADMIN_PASSWORD=changeme
ADMIN_ROLE=admin

# SAVE USERS IN MONGODB
AUTH_DB_USERS=authusersdb
AUTH_DB_COLLECTION=users

# Canonical names (compatibilidad):
USERS_DB=authusersdb
USERS_COLLECTION=users

# Rate Limiting Configuration
RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW_MS=300000
LOCKOUT_MS=1800000
RATE_LIMIT_JITTER_BASE_MS=120
RATE_LIMIT_JITTER_VARIATION_MS=100

#JWT Configuration
JWT_SECRET=example_jwt_secret_please_change
JWT_EXPIRATION=1h
`

writeFileSync(envPath, content, { encoding: 'utf8' })
console.log('Archivo .env generado con valores de ejemplo')