import * as fs from 'fs';
import * as path from 'path';

class Logger {
  private logDir: string;
  private logFilePath: string;

  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = now.toLocaleString('sv').replace(/ /g, '_').replace(/:/g, '-');
    this.logFilePath = path.join(this.logDir, `${timestamp}.log`);
  }

  private getTimeStamp(): string {
    return new Date().toLocaleString('sv');
  }

  private logToFile(level: string, message: string, ...args: object[]): void {
    const logMessage = `[${this.getTimeStamp()}] [${level.toUpperCase()}] ${message} ${args.map((arg) => JSON.stringify(arg, null, 2)).join(' ')}
`;
    fs.appendFile(this.logFilePath, logMessage, (err) => {
      if (err) {
        console.error('ログファイルへの記入に失敗:', err);
      }
    });
  }

  public log(message: string, ...args: object[]): void {
    console.log(`[${this.getTimeStamp()}] [INFO] ${message}`, ...args);
    this.logToFile('info', message, ...args);
  }

  public info(message: string, ...args: object[]): void {
    console.info(`[${this.getTimeStamp()}] [INFO] ${message}`, ...args);
    this.logToFile('info', message, ...args);
  }

  public warn(message: string, ...args: object[]): void {
    console.warn(`[${this.getTimeStamp()}] [WARN] ${message}`, ...args);
    this.logToFile('warn', message, ...args);
  }

  public error(message: string, ...args: object[]): void {
    console.error(`[${this.getTimeStamp()}] [ERROR] ${message}`, ...args);
    this.logToFile('error', message, ...args);
  }
}

export const logger = new Logger();
