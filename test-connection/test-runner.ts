import { config } from "./test-config.js";
import { logger } from "./test-logger.js";
import { MongoTests } from "./mongo-tests.js";
import { ApiTests } from "./api-tests.js";
import { TestUtils } from "./utils.js";
import { TestSuite, TestSummary } from "./types.js";
import * as fs from 'fs';

/**
 * Orquestador principal de tests
 */
export class TestRunner {
  private mongoTests: MongoTests;
  private apiTests: ApiTests;
  private startTime: number = 0;
  private summary: TestSummary = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    duration: 0,
    suites: []
  };

  constructor() {
    this.mongoTests = new MongoTests();
    this.apiTests = new ApiTests();
  }

  /**
   * Ejecuta todos los tests
   */
  public async runAll(): Promise<TestSummary> {
    this.startTime = Date.now();
    
    try {
      // Inicializar configuración
      await this.initialize();

      // Ejecutar suites de tests
      const mongoSuite = await this.runMongoTests();
      const apiSuite = await this.runApiTests();

      // Compilar resumen
      this.summary.suites = [mongoSuite, apiSuite];
      this.calculateSummary();
      
      // Mostrar resumen final
      this.displaySummary();
      
      return this.summary;
    } catch (error) {
      logger.error("Critical error in TestRunner", error as Error);
      this.summary.duration = Date.now() - this.startTime;
      return this.summary;
    }
  }

  /**
   * Ejecuta solo tests de MongoDB
   */
  public async runMongoOnly(): Promise<TestSummary> {
    this.startTime = Date.now();
    
    try {
      await this.initialize();
      const mongoSuite = await this.runMongoTests();
      
      this.summary.suites = [mongoSuite];
      this.calculateSummary();
      this.displaySummary();
      
      return this.summary;
    } catch (error) {
      logger.error("Error executing MongoDB tests", error as Error);
      this.summary.duration = Date.now() - this.startTime;
      return this.summary;
    }
  }

  /**
   * Ejecuta solo tests de API
   */
  public async runApiOnly(): Promise<TestSummary> {
    this.startTime = Date.now();
    
    try {
      await this.initialize();
      const apiSuite = await this.runApiTests();
      
      this.summary.suites = [apiSuite];
      this.calculateSummary();
      this.displaySummary();
      
      return this.summary;
    } catch (error) {
      logger.error("Error executing API tests", error as Error);
      this.summary.duration = Date.now() - this.startTime;
      return this.summary;
    }
  }

  /**
   * Inicializa el entorno de testing
   */
  private async initialize(): Promise<void> {
    logger.header("INITIALIZING TESTS");
    
    try {
      // Validar configuración
      const configValidation = config.validateEnvironment();
      if (!configValidation.valid) {
        throw new Error(`Invalid configuration: ${configValidation.missing.join(", ")}`);
      }

      logger.success("✓ Configuration validated");
      
      // Mostrar información del entorno
      this.displayEnvironmentInfo();
      
    } catch (error) {
      logger.error("Error initializing tests", error as Error);
      throw error;
    }
  }

  /**
   * Ejecuta tests de MongoDB
   */
  private async runMongoTests(): Promise<TestSuite> {
    logger.separator();
    logger.header("EXECUTING MongoDB TESTS");
    
    try {
      const { result: suite, duration } = await TestUtils.measureTime(() => 
        this.mongoTests.runAll()
      );
      
      suite.duration = duration;
      this.logSuiteResults(suite);
      
      return suite;
    } catch (error) {
      logger.error("Error executing MongoDB tests", error as Error);
      return {
        name: "MongoDB Tests",
        tests: [{
          name: "MongoDB Suite Setup",
          status: "failed",
          duration: 0,
          error: error instanceof Error ? error : new Error(String(error))
        }],
        duration: 0
      };
    }
  }

  /**
   * Ejecuta tests de API
   */
  private async runApiTests(): Promise<TestSuite> {
    logger.separator();
    logger.header("EXECUTING API TESTS");
    
    try {
      const { result: suite, duration } = await TestUtils.measureTime(() => 
        this.apiTests.runAll()
      );
      
      suite.duration = duration;
      this.logSuiteResults(suite);
      
      return suite;
    } catch (error) {
      logger.error("Error executing API tests", error as Error);
      return {
        name: "API Tests",
        tests: [{
          name: "API Suite Setup",
          status: "failed",
          duration: 0,
          error: error instanceof Error ? error : new Error(String(error))
        }],
        duration: 0
      };
    }
  }

  /**
   * Calcula el resumen final
   */
  private calculateSummary(): void {
    this.summary.duration = Date.now() - this.startTime;
    this.summary.totalTests = 0;
    this.summary.passed = 0;
    this.summary.failed = 0;

    for (const suite of this.summary.suites) {
      for (const test of suite.tests) {
        this.summary.totalTests++;
        if (test.status === 'passed') {
          this.summary.passed++;
        } else {
          this.summary.failed++;
        }
      }
    }
  }

  /**
   * Muestra información del entorno
   */
  private displayEnvironmentInfo(): void {
    const { mongodb, api } = config.config;
    
    logger.info("Environment Configuration:");
    logger.info(`  MongoDB URI: ${config.getSafeMongoUri()}`);
    logger.info(`  Database: ${mongodb.testDb}`);
    logger.info(`  Collection: ${mongodb.testCollection}`);
    logger.info(`  API URL: ${api.baseUrl}`);
    logger.info(`  Timeout: ${api.timeout}ms`);
    logger.info(`  Token configured: ${api.token ? "Yes" : "No"}`);
  }

  /**
   * Registra los resultados de una suite
   */
  private logSuiteResults(suite: TestSuite): void {
    const passed = suite.tests.filter(t => t.status === 'passed').length;
    const failed = suite.tests.filter(t => t.status === 'failed').length;
    const total = suite.tests.length;
    
    logger.info(`\n${suite.name} - Results:`);
    logger.success(`  ✓ Passed: ${passed}/${total}`);
    
    if (failed > 0) {
      logger.error(`  ✗ Failed: ${failed}/${total}`);
      
      // Mostrar detalles de tests fallidos
      const failedTests = suite.tests.filter(t => t.status === 'failed');
      for (const test of failedTests) {
        logger.error(`    - ${test.name}: ${test.error?.message || 'Unknown error'}`);
      }
    }
    
    logger.info(`  ⏱️  Duration: ${TestUtils.formatDuration(suite.duration || 0)}`);
  }

  /**
   * Muestra el resumen final
   */
  private displaySummary(): void {
    logger.separator();
    logger.header("RESUMEN FINAL");
    
    const successRate = this.summary.totalTests > 0 
      ? ((this.summary.passed / this.summary.totalTests) * 100).toFixed(1)
      : "0";
    
    logger.info(`Total tests executed: ${this.summary.totalTests}`);
    logger.success(`✓ Tests passed: ${this.summary.passed}`);
    
    if (this.summary.failed > 0) {
      logger.error(`✗ Failed tests: ${this.summary.failed}`);
    }
    
    logger.info(`📊 Success rate: ${successRate}%`);
    logger.info(`⏱️  Total duration: ${TestUtils.formatDuration(this.summary.duration)}`);
    
    // Estadísticas por suite
    if (this.summary.suites.length > 1) {
      logger.info("\nTest results by suite:");
      for (const suite of this.summary.suites) {
        const suitePassed = suite.tests.filter(t => t.status === 'passed').length;
        const suiteTotal = suite.tests.length;
        const suiteRate = suiteTotal > 0 ? ((suitePassed / suiteTotal) * 100).toFixed(1) : "0";
        
        logger.info(`  ${suite.name}: ${suitePassed}/${suiteTotal} (${suiteRate}%)`);
      }
    }
    
    // Recomendaciones
    this.displayRecommendations();
    
    logger.separator();
    
    // Resultado final
    if (this.summary.failed === 0) {
      logger.success("🎉 ALL TESTS PASSED!");
    } else {
      logger.error("❌ SOME TESTS FAILED");
      logger.info("Review errors above for more details.");
    }
  }

  /**
   * Muestra recomendaciones basadas en los resultados
   */
  private displayRecommendations(): void {
    const recommendations: string[] = [];
    
    if (this.summary.failed > 0) {
      recommendations.push("• Review specific errors for each failed test");
      recommendations.push("• Verify MongoDB and API connectivity");
      recommendations.push("• Check that environment variables are correctly set");
    }
    
    if (this.summary.duration > 30000) { // > 30 segundos
      recommendations.push("• Tests are running slow, consider optimizing timeouts");
    }
    
    const avgDuration = this.summary.totalTests > 0 
      ? this.summary.duration / this.summary.totalTests 
      : 0;
    
    if (avgDuration > 5000) { // > 5 segundos por test
      recommendations.push("• High average time per test, review operation efficiency");
    }
    
    if (recommendations.length > 0) {
      logger.info("\n💡 Recommendations:");
      recommendations.forEach(rec => logger.info(rec));
    }
  }

  /**
   * Exporta los resultados a JSON
   */
  public exportResults(filePath?: string): string {
    const results = {
      timestamp: new Date().toISOString(),
      environment: {
        mongoUri: config.getSafeMongoUri(),
        apiUrl: config.config.api.baseUrl,
        testDb: config.config.mongodb.testDb,
        testCollection: config.config.mongodb.testCollection
      },
      summary: this.summary,
      details: this.summary.suites.map(suite => ({
        name: suite.name,
        duration: suite.duration,
        tests: suite.tests.map(test => ({
          name: test.name,
          status: test.status,
          duration: test.duration,
          error: test.error ? {
            message: test.error.message,
            type: test.error.constructor.name
          } : null,
          context: test.context
        }))
      }))
    };
    
    const jsonResults = JSON.stringify(results, null, 2);
    
    if (filePath) {
      try {
        fs.writeFileSync(filePath, jsonResults);
        logger.success(`Results exported to: ${filePath}`);
      } catch (error) {
        logger.error("Error exporting results", error as Error);
      }
    }
    
    return jsonResults;
  }
}

/**
 * Función principal para ejecutar desde línea de comandos
 */
export async function main(): Promise<void> {
  const runner = new TestRunner();
  
  // Parsear argumentos de línea de comandos
  const args = process.argv.slice(2);
  const mode = args[0] || 'all';
  
  try {
    let summary: TestSummary;
    
    switch (mode.toLowerCase()) {
      case 'mongo':
        summary = await runner.runMongoOnly();
        break;
      case 'api':
        summary = await runner.runApiOnly();
        break;
      case 'all':
      default:
        summary = await runner.runAll();
        break;
    }
    
    // Exportar resultados si se especifica
    const exportFlag = args.find(arg => arg.startsWith('--export='));
    if (exportFlag) {
      const filePath = exportFlag.split('=')[1];
      runner.exportResults(filePath);
    }
    
    // Código de salida basado en resultados
    process.exit(summary.failed > 0 ? 1 : 0);
    
  } catch (error) {
    logger.error("Critical error in main", error as Error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (process.argv[1]?.endsWith('test-runner.ts') || process.argv[1]?.includes('test-runner')) {
  main().catch(error => {
    logger.error("Unhandled error:", error as Error);
    process.exit(1);
  });
}