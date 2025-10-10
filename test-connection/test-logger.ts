import { LogLevel, LoggerOptions } from "./types.js";

/**
 * Sistema de logging avanzado para tests
 */
export class TestLogger {
  private static _instance: TestLogger;
  private options: LoggerOptions;
  
  // Códigos de color ANSI
  private readonly colors = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m"
  };

  // Iconos para diferentes tipos de log
  private readonly icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    debug: "🔍",
    header: "🔷",
    separator: "─"
  };

  private constructor(options: LoggerOptions) {
    this.options = options;
  }

  public static getInstance(options?: LoggerOptions): TestLogger {
    if (!TestLogger._instance) {
      TestLogger._instance = new TestLogger(options || {
        level: LogLevel.INFO,
        colors: true,
        timestamp: true
      });
    }
    return TestLogger._instance;
  }

  /**
   * Actualiza las opciones del logger
   */
  public updateOptions(options: Partial<LoggerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Log de éxito
   */
  public success(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.SUCCESS)) {
      this.log(LogLevel.SUCCESS, message, data, this.colors.green, this.icons.success);
    }
  }

  /**
   * Log de error
   */
  public error(message: string, error?: Error | Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      let errorData: Record<string, unknown> | undefined;
      
      if (error instanceof Error) {
        errorData = {
          name: error.name,
          message: error.message,
          stack: error.stack
        };
      } else if (error && typeof error === 'object') {
        errorData = error;
      }
      
      this.log(LogLevel.ERROR, message, errorData, this.colors.red, this.icons.error);
    }
  }

  /**
   * Log de advertencia
   */
  public warning(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log(LogLevel.WARN, message, data, this.colors.yellow, this.icons.warning);
    }
  }

  /**
   * Log de información
   */
  public info(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log(LogLevel.INFO, message, data, this.colors.blue, this.icons.info);
    }
  }

  /**
   * Log de debug
   */
  public debug(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log(LogLevel.DEBUG, message, data, this.colors.gray, this.icons.debug);
    }
  }

  /**
   * Encabezado de sección
   */
  public header(message: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const separator = this.icons.separator.repeat(50);
      
      console.log(); // Línea en blanco
      
      if (this.options.colors) {
        console.log(`${this.colors.bold}${this.colors.blue}${this.icons.header} ${message}${this.colors.reset}`);
        console.log(`${this.colors.blue}${separator}${this.colors.reset}`);
      } else {
        console.log(`${this.icons.header} ${message}`);
        console.log(separator);
      }
    }
  }

  /**
   * Separador visual
   */
  public separator(): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const line = this.icons.separator.repeat(60);
      if (this.options.colors) {
        console.log(`${this.colors.gray}${line}${this.colors.reset}`);
      } else {
        console.log(line);
      }
    }
  }

  /**
   * Resumen de tests
   */
  public summary(title: string, stats: { total: number; passed: number; failed: number; duration: number }): void {
    this.header(title);
    
    this.info(`Executed tests: ${stats.total}`);
    this.success(`Passed tests: ${stats.passed}`);
    
    if (stats.failed > 0) {
      this.error(`Failed tests: ${stats.failed}`);
    }
    
    this.info(`Total duration: ${stats.duration}ms`);
    
    const successRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : "0";
    this.info(`Success rate: ${successRate}%`);

    if (stats.failed === 0) {
      this.success("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    } else {
      this.error("💥 SOME TESTS FAILED");
    }
  }

  /**
   * Progreso de test individual
   */
  public testProgress(testName: string, status: 'running' | 'passed' | 'failed', duration?: number): void {
    switch (status) {
      case 'running':
        this.info(`Running: ${testName}...`);
        break;
      case 'passed':
        this.success(`${testName} ${duration ? `(${duration}ms)` : ''}`);
        break;
      case 'failed':
        this.error(`${testName} ${duration ? `(${duration}ms)` : ''}`);
        break;
    }
  }

  /**
   * Log genérico con formato
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, color?: string, icon?: string): void {
    let output = "";

    // Timestamp
    if (this.options.timestamp) {
      const timestamp = new Date().toISOString();
      output += this.options.colors ? `${this.colors.gray}[${timestamp}]${this.colors.reset} ` : `[${timestamp}] `;
    }

    // Icono y mensaje
    if (this.options.colors && color && icon) {
      output += `${color}${icon} ${message}${this.colors.reset}`;
    } else if (icon) {
      output += `${icon} ${message}`;
    } else {
      output += message;
    }

    console.log(output);

    // Contexto adicional
    if (context && this.shouldLog(LogLevel.DEBUG)) {
      const contextStr = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
      const indentedContext = contextStr.split('\n').map(line => `  ${line}`).join('\n');
      
      if (this.options.colors) {
        console.log(`${this.colors.dim}${indentedContext}${this.colors.reset}`);
      } else {
        console.log(indentedContext);
      }
    }
  }

  /**
   * Verifica si debe loggear según el nivel configurado
   */
  private shouldLog(level: LogLevel): boolean {
    return level <= this.options.level;
  }

  /**
   * Limpia la consola
   */
  public clear(): void {
    console.clear();
  }

  /**
   * Crea un grupo de logs colapsable (para entornos que lo soporten)
   */
  public group(title: string): void {
    if (console.group) {
      console.group(title);
    } else {
      this.header(title);
    }
  }

  /**
   * Termina un grupo de logs
   */
  public groupEnd(): void {
    if (console.groupEnd) {
      console.groupEnd();
    }
  }
}

// Instancia por defecto
export const logger = TestLogger.getInstance();