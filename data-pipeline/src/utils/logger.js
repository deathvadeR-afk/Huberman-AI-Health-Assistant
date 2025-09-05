import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        let log = `${timestamp} [${service || 'APP'}] ${level}: ${message}`;
        
        // Add metadata if present
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        if (metaStr) {
            log += `\n${metaStr}`;
        }
        
        return log;
    })
);

export function createLogger(service = 'DataPipeline') {
    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: logFormat,
        defaultMeta: { service },
        transports: [
            // Write all logs to console
            new winston.transports.Console({
                format: consoleFormat
            }),
            
            // Write all logs to file
            new winston.transports.File({
                filename: path.join(logsDir, 'data-pipeline.log'),
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            }),
            
            // Write error logs to separate file
            new winston.transports.File({
                filename: path.join(logsDir, 'error.log'),
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            })
        ]
    });
}

export default createLogger;
