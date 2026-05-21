import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  ACTOR_ID_HEADER,
  CORRELATION_ID_HEADER,
  createRequestContextFromHeaders,
  REQUEST_ID_HEADER,
  TENANT_ID_HEADER,
  WORKSPACE_ID_HEADER,
} from '@mentrily/service-core';

export function registerCorrelationIdHook(instance: FastifyInstance): void {
  instance.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestIdHeader = headerValue(request.headers[REQUEST_ID_HEADER]);
    const correlationIdHeader = headerValue(request.headers[CORRELATION_ID_HEADER]);
    const tenantIdHeader = headerValue(request.headers[TENANT_ID_HEADER]);
    const workspaceIdHeader = headerValue(request.headers[WORKSPACE_ID_HEADER]);
    const actorIdHeader = headerValue(request.headers[ACTOR_ID_HEADER]);

    const context = createRequestContextFromHeaders({
      ...(requestIdHeader ? { requestIdHeader } : {}),
      ...(correlationIdHeader ? { correlationIdHeader } : {}),
      ...(tenantIdHeader ? { tenantIdHeader } : {}),
      ...(workspaceIdHeader ? { workspaceIdHeader } : {}),
      ...(actorIdHeader ? { actorIdHeader } : {}),
    });

    request.requestContext = context;

    reply.header(REQUEST_ID_HEADER, context.requestId);
    reply.header(CORRELATION_ID_HEADER, context.correlationId);
  });
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
