import dotenv from "dotenv";
import { TestConfig, LogLevel, TestError } from "./types.js";

// Cargar variables de entorno
dotenv.config({ path: ".env.local" });

/**
 * Configuración centralizada para los tests
 */
export class Config {
  private static _instance: Config;
  private _config: TestConfig;

  private constructor() {
    this._config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): Config {
    if (!Config._instance) {
      Config._instance = new Config();
    }
    return Config._instance;
  }

  public get config(): TestConfig {
    return { ...this._config }; // Retorna copia para evitar mutaciones
  }

  private loadConfig(): TestConfig {
    return {
      mongodb: {
        uri: process.env.MONGODB_URI || "mongodb://localhost:27017",
        testDb: process.env.TEST_DB || "test_db",
        testCollection: process.env.TEST_COLLECTION || "test_collection",
        timeout: parseInt(process.env.MONGODB_TIMEOUT || "10000", 10)
      },
      api: {
        baseUrl: process.env.BASE_URL || "http://localhost:3000",
        token: process.env.API_TOKEN || "",
        timeout: parseInt(process.env.API_TIMEOUT || "10000")
      },
      logging: {
        level: this.parseLogLevel(process.env.LOG_LEVEL || "INFO"),
        colors: process.env.NO_COLOR !== "true",
        timestamp: process.env.LOG_TIMESTAMP !== "false"
      }
    };
  }

  private parseLogLevel(level: string): LogLevel {
    const upperLevel = level.toUpperCase();
    switch (upperLevel) {
      case "ERROR": return LogLevel.ERROR;
      case "WARN": return LogLevel.WARN;
      case "INFO": return LogLevel.INFO;
      case "SUCCESS": return LogLevel.SUCCESS;
      case "DEBUG": return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private validateConfig(): void {
    const errors: string[] = [];

    // Validar MongoDB URI
    if (!this._config.mongodb.uri) {
      errors.push("MONGODB_URI is required");
    }

    // Validar nombres de DB y colección
    if (!this.isValidName(this._config.mongodb.testDb)) {
      errors.push("Invalid database name");
    }

    if (!this.isValidName(this._config.mongodb.testCollection)) {
      errors.push("Invalid collection name");
    }

    // Validar URL base de API
    try {
      new URL(this._config.api.baseUrl);
    } catch {
      errors.push("Invalid API base URL");
    }

    // Validar timeout
    if (this._config.api.timeout < 1000 || this._config.api.timeout > 60000) {
      errors.push("API timeout must be between 1000 and 60000 ms");
    }

    if (errors.length > 0) {
      throw new TestError(
        "Configuration validation failed",
        "CONFIG_INVALID",
        { errors }
      );
    }
  }

  private isValidName(name: string): boolean {
    // Validación básica para nombres de MongoDB
    return /^[a-zA-Z0-9_-]+$/.test(name) && name.length > 0 && name.length <= 64;
  }

  /**
   * Actualiza la configuración (útil para tests)
   */
  public updateConfig(updates: Partial<TestConfig>): void {
    this._config = { ...this._config, ...updates };
    this.validateConfig();
  }

  /**
   * Obtiene las variables de entorno requeridas
   */
  public getRequiredEnvVars(): string[] {
    return ["MONGODB_URI", "API_TOKEN"];
  }

  /**
   * Valida que todas las variables de entorno requeridas estén presentes
   */
  public validateEnvironment(): { valid: boolean; missing: string[] } {
    const required = this.getRequiredEnvVars();
    const missing = required.filter(varName => !process.env[varName]);
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Obtiene la URI de MongoDB con credenciales ocultas para logging
   */
  public getSafeMongoUri(): string {
    return this._config.mongodb.uri.replace(/\/\/.*@/, "//***:***@");
  }
}

// Exportar instancia singleton
export const config = Config.getInstance();