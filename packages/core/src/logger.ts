import pino, { type Logger } from 'pino'
import { getEnv } from './env'

export function createLogger(name: string): Logger {
  const env = getEnv()

  if (env.NODE_ENV === 'development') {
    return pino({
      name,
      level: env.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
    })
  }

  return pino({ name, level: env.LOG_LEVEL })
}
