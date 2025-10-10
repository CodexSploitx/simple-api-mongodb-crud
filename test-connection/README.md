# Test Connection Suite

Modular and robust testing system for MongoDB and API endpoints.

## 🚀 Features

- **Modular Architecture**: Code organized in specialized modules
- **Robust Testing**: Advanced error handling and timeouts
- **Advanced Logging**: Log system with colors and levels
- **Typed Configuration**: Complete environment variable validation
- **Parallel Tests**: Optimized execution of independent tests
- **Detailed Reports**: Complete summaries with statistics and recommendations

## 📁 Project Structure

```
test-connection/
├── types.ts              # TypeScript type definitions
├── test-config.ts        # Centralized configuration and validation
├── test-logger.ts        # Advanced logging system
├── utils.ts              # Testing utilities and helpers
├── mongo-tests.ts        # MongoDB-specific tests
├── api-tests.ts          # API endpoint-specific tests
├── test-runner.ts        # Main orchestrator
├── .env.local            # Environment variables for tests
└── README.md             # This documentation
```

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file in the `test-connection` folder with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_TEST_DB=testdb
MONGODB_TEST_COLLECTION=testcollection

# API Configuration
API_BASE_URL=http://localhost:3000
API_TOKEN=your-api-token-here
API_TIMEOUT=10000

# Logging Configuration (optional)
LOG_LEVEL=INFO
```

### Dependencies Installation

```bash
npm install mongodb
# or if you use other specific drivers/libraries
```

## 🏃‍♂️ Usage

### Basic Execution

```bash
# Run all tests
# Executes both MongoDB and API tests in sequence
npm run test   

# Run all tests (explicit)
# Same behavior as 'npm run test', executes all available tests
npm run test:all

# MongoDB tests only
# Executes only MongoDB connection and basic operations tests
npm run test:mongo 

# API tests only
# Executes only REST API endpoint tests
npm run test:api

# Export results to JSON
# Executes all tests and saves results to a JSON file
npm run test:export

# Run with debug logs
# Executes tests with detailed debugging information (LOG_LEVEL=DEBUG)
npm run test:debug

# Run in watch mode (restarts automatically)
# Monitors file changes and re-executes tests automatically
npm run test:watch
```

### Export Results

```bash
# Export results to JSON
npx tsx test-connection/test-runner.ts all --export=results.json
```

### Programmatic Usage

```typescript
import { TestRunner } from './test-connection/test-runner.js';

const runner = new TestRunner();

// Run all tests
const summary = await runner.runAll();

// Run MongoDB only
const mongoSummary = await runner.runMongoOnly();

// Run API only
const apiSummary = await runner.runApiOnly();

// Export results
const jsonResults = runner.exportResults('./test-results.json');
```

## 🧪 Included Tests

### MongoDB Tests

- ✅ **Connection**: MongoDB connectivity verification
- ✅ **Name Validation**: Database and collection name validation
- ✅ **Database Existence**: Verification if database exists
- ✅ **Collection Existence**: Verification if collection exists
- ✅ **Collection Creation**: Collection creation if it doesn't exist
- ✅ **CRUD Operations**: Basic Insert, Find, Update, Delete

### API Tests

- ✅ **POST /api/insertOne**: Document insertion
- ✅ **POST /api/findOne**: Specific document search
- ✅ **POST /api/find**: Search with filters
- ✅ **PUT /api/updateOne**: Document updates
- ✅ **GET /api/[db]/[collection]**: Get all documents
- ✅ **DELETE /api/deleteOne**: Document deletion
- ✅ **Error Tests**: Invalid endpoints, unauthorized access, invalid payloads

## 📊 Reports and Logging

### Log Levels

- `SUCCESS`: Successful operations (green)
- `ERROR`: Errors and failures (red)
- `WARN`: Warnings (yellow)
- `INFO`: General information (blue)
- `DEBUG`: Debug information (gray)

### Output Format

```
=== MONGODB TESTS ===
✓ MongoDB Connection Test (245ms)
✓ Database Name Validation (12ms)
✓ Collection Name Validation (8ms)
...

=== FINAL SUMMARY ===
Total tests executed: 15
✓ Tests passed: 14
✗ Tests failed: 1
📊 Success rate: 93.3%
⏱️ Total time: 2.34s
```

## 🔧 Customization

### Adding New Tests

1. **For MongoDB**: Extend the `MongoTests` class
2. **For API**: Extend the `ApiTests` class
3. **For other types**: Create a new class following the pattern

```typescript
// Example: Add custom test
class CustomTests {
  public async runAll(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: "Custom Tests",
      tests: []
    };

    // Add tests...
    suite.tests.push(await this.customTest());
    
    return suite;
  }

  private async customTest(): Promise<TestResult> {
    // Test implementation
    return {
      name: "Custom Test",
      status: "passed",
      duration: 100
    };
  }
}
```

### Custom Configuration

```typescript
import { config } from './test-config.js';

// Update configuration dynamically
config.updateConfig({
  mongodb: {
    uri: "mongodb://custom-host:27017",
    testDb: "custom-db"
  }
});
```

### Custom Logger

```typescript
import { logger } from './test-logger.js';

// Use different levels
logger.success("Successful operation");
logger.error("Critical error", error);
logger.warn("Important warning");
logger.info("General information");
logger.debug("Debug data");

// Headers and separators
logger.header("IMPORTANT SECTION");
logger.separator();
```

## 🛠️ Available Utilities

### TestUtils

```typescript
import { TestUtils } from './utils.js';

// Generate test documents
const testDoc = TestUtils.generateTestDocument({ name: "Test" });

// Measure execution time
const { result, duration } = await TestUtils.measureTime(async () => {
  return await someAsyncOperation();
});

// Retry operations
const result = await TestUtils.retry(
  () => unstableOperation(),
  3, // maximum 3 attempts
  1000 // 1 second between attempts
);

// Timeout for promises
const result = await TestUtils.withTimeout(
  longRunningOperation(),
  5000 // 5 second timeout
);
```

## 🚨 Error Handling

### Custom Error Types

```typescript
import { TestError } from './types.js';

// Error with additional context
throw new TestError(
  "Operation failed",
  "OPERATION_FAILED",
  { additionalInfo: "extra context" }
);
```

### Recovery Strategies

- **Automatic retries** for network operations
- **Configurable timeouts** to avoid blocking
- **Automatic cleanup** in case of failures
- **Rollback** of partial operations

## 📈 Improvements vs. Original File

| Aspect | Original | Improved |
|---------|----------|----------|
| **Structure** | Monolithic (1 file) | Modular (8 files) |
| **Error Handling** | Basic | Robust with custom types |
| **Logging** | Simple console.log | Advanced system with colors |
| **Configuration** | Hardcoded | Typed and validated |
| **Tests** | Sequential | Parallel when possible |
| **Reports** | Basic | Detailed with statistics |
| **Reusability** | Low | High modularity |
| **Maintenance** | Difficult | Easy and scalable |

## 🔍 Troubleshooting

### Common Issues

1. **MongoDB connection error**
   ```
   Check MONGODB_URI in .env.local
   Make sure MongoDB is running
   ```

2. **API tests fail**
   ```
   Check API_BASE_URL and that server is active
   Confirm API_TOKEN is valid
   ```

3. **Frequent timeouts**
   ```
   Increase API_TIMEOUT in .env.local
   Check network latency
   ```

### Debug Mode

```bash
# Run with debug logs
LOG_LEVEL=DEBUG npx tsx test-connection/test-runner.ts
```

## 🤝 Contributing

To add new features:

1. Maintain modular structure
2. Follow existing type patterns
3. Add tests for new features
4. Update documentation

## 📝 License

This project maintains the same license as the main project.

---

**Note**: This system completely replaces the original `mongo-test.ts` file, providing a more robust, maintainable, and scalable solution for MongoDB and API endpoint testing.