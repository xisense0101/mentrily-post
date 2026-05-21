import type { RequestContext } from '@mentrily/service-core';

declare module 'fastify' {
  interface FastifyRequest {
    requestContext?: RequestContext;
  }
}
