/**
 * Simple Logger utility that strips out sensitive data
 */
export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV !== 'test') console.log(`[INFO] ${message}`, stripSensitive(context) || '');
  },
  warn: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV !== 'test') console.warn(`[WARN] ${message}`, stripSensitive(context) || '');
  },
  error: (message: string, error?: any, context?: Record<string, any>) => {
    if (process.env.NODE_ENV !== 'test') console.error(`[ERROR] ${message}`, stripSensitive(context) || '', error || '');
  }
};

function stripSensitive(data: any): any {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  
  const safeData = { ...data };
  const sensitiveKeys = ['pin', 'password', 'token', 'secret', 'nextauth_secret'];
  
  for (const key of Object.keys(safeData)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      safeData[key] = '***REDACTED***';
    } else if (typeof safeData[key] === 'object') {
      safeData[key] = stripSensitive(safeData[key]);
    }
  }
  return safeData;
}
