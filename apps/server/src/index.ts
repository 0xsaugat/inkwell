import { getEnv, getHealth } from '@inkwell/core'
import Fastify from 'fastify'

const env = getEnv()

const app = Fastify({
  logger:
    env.NODE_ENV === 'development'
      ? {
          level: env.LOG_LEVEL,
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
          },
        }
      : { level: env.LOG_LEVEL },
})

app.get('/', async () => ({
  name: 'Inkwell realtime',
  status: 'ok',
}))

app.get('/health', async (_request, reply) => {
  const health = await getHealth()
  return reply.code(health.status === 'ok' ? 200 : 503).send(health)
})

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, 'Shutting down')
  await app.close()
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})
process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

try {
  await app.listen({ port: env.COLLAB_PORT, host: '0.0.0.0' })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
