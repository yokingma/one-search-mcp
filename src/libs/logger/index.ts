import pino from 'pino';

export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  log(message: string, ...args: any[]): void;
}

export class PinoLogger implements Logger {
  private logger: pino.Logger;

  constructor(name?: string) {
    this.logger = pino({
      name: name || 'one-search-mcp',
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      } : undefined,
    });
  }

  private logWithLevel(level: 'info' | 'error' | 'warn', message: string, ...args: any[]): void {
    if (args.length > 0) {
      this.logger[level]({ data: args }, message);
    } else {
      this.logger[level](message);
    }
  }

  info(message: string, ...args: any[]): void {
    this.logWithLevel('info', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.logWithLevel('error', message, ...args);
  }

  success(message: string, ...args: any[]): void {
    if (args.length > 0) {
      this.logger.info({ level: 'success', data: args }, message);
    } else {
      this.logger.info({ level: 'success' }, message);
    }
  }

  warn(message: string, ...args: any[]): void {
    this.logWithLevel('warn', message, ...args);
  }

  log(message: string, ...args: any[]): void {
    this.logWithLevel('info', message, ...args);
  }
}

export const defaultLogger = new PinoLogger();
