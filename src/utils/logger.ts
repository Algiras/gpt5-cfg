import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Configure Winston logger
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cfg-chatgpt' },
  transports: [
    // Write all logs with importance level of 'error' or higher to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Debug logs for API responses
    new winston.transports.File({
      filename: path.join(logsDir, 'debug.log'),
      level: 'debug',
      maxsize: 10485760, // 10MB
      maxFiles: 3
    })
  ],
});

// Create logs directory
import fs from 'fs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Helper function for structured API logging
export const logApiCall = (
  endpoint: string, 
  request: any, 
  response: any, 
  duration?: number
) => {
  logger.debug('API Call', {
    endpoint,
    request: {
      model: request.model,
      inputLength: typeof request.input === 'string' ? request.input.length : 0,
      tools: request.tools?.length || 0
    },
    response: {
      model: response.model,
      usage: response.usage,
      finishReason: response.finish_reason,
      hasToolInput: !!response.tool_input
    },
    duration
  });
};

// Helper function for tree operation logging
export const logTreeOperation = (
  operation: string,
  command: string,
  success: boolean,
  error?: string
) => {
  const logData = {
    operation,
    command,
    success,
    timestamp: new Date().toISOString()
  };

  if (error) {
    logger.error('Tree operation failed', { ...logData, error });
  } else {
    logger.info('Tree operation completed', logData);
  }
};

export default logger;
