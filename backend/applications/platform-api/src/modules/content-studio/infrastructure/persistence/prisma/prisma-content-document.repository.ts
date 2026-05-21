import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { ContentDocumentRepository } from '../../../domain/repositories/index.js';
import { ContentDocument } from '../../../domain/entities/index.js';
import { ContentDocumentPurpose, ContentDocumentStatus } from '../../../domain/value-objects/index.js';
import {
  toDomainDocument,
  toPersistenceBlockCreate,
  toPersistenceDocumentCreate,
  toPersistenceDocumentUpdate,
  toPersistenceVersionCreate,
  toPersistenceVersionUpdate,
} from './content-prisma.mapper.js';

type ContentPrismaClient = Pick<
  PrismaClient,
  'contentDocument' | 'contentVersion' | 'contentBlock' | 'contentPublishedSnapshot'
>;

function resolveContentPrismaClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): ContentPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as ContentPrismaClient;
}

@Injectable()
export class PrismaContentDocumentRepository implements ContentDocumentRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(document: ContentDocument, transaction?: TransactionContext): Promise<ContentDocument> {
    const client = resolveContentPrismaClient(this.prisma, transaction);

    try {
      await client.contentDocument.upsert({
        where: { id: document.id },
        create: toPersistenceDocumentCreate(document),
        update: toPersistenceDocumentUpdate(document),
      });

      if (document.currentDraftVersion) {
        await client.contentVersion.upsert({
          where: {
            documentId_versionNumber: {
              documentId: document.currentDraftVersion.documentId,
              versionNumber: document.currentDraftVersion.versionNumber,
            },
          },
          create: toPersistenceVersionCreate(document.currentDraftVersion),
          update: toPersistenceVersionUpdate(document.currentDraftVersion),
        });

        await client.contentBlock.deleteMany({
          where: { versionId: document.currentDraftVersion.id },
        });

        for (const block of document.currentDraftVersion.blocks) {
          await client.contentBlock.create({
            data: toPersistenceBlockCreate(block, document.currentDraftVersion.id),
          });
        }
      }

      await client.contentDocument.update({
        where: { id: document.id },
        data: {
          status: document.status,
          currentDraftVersionId: document.currentDraftVersion?.id ?? null,
          ...(document.status === ContentDocumentStatus.DRAFT && !document.publishedSnapshot
            ? { publishedSnapshotId: null }
            : {}),
          publishedAt: document.publishedAt ?? null,
          archivedAt: document.archivedAt ?? null,
          updatedAt: document.updatedAt,
        },
      });

      const fresh = await client.contentDocument.findUnique({
        where: { id: document.id },
        include: {
          currentDraftVersion: {
            include: {
              blocks: {
                orderBy: [{ path: 'asc' }, { position: 'asc' }],
              },
            },
          },
          publishedSnapshot: true,
        },
      });

      if (!fresh) {
        throw new Error(`content document ${document.id} was not found after save`);
      }

      return toDomainDocument(fresh);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(id: string, transaction?: TransactionContext): Promise<ContentDocument | null> {
    try {
      const client = resolveContentPrismaClient(this.prisma, transaction);
      const record = await client.contentDocument.findUnique({
        where: { id },
        include: {
          currentDraftVersion: {
            include: {
              blocks: {
                orderBy: [{ path: 'asc' }, { position: 'asc' }],
              },
            },
          },
          publishedSnapshot: true,
        },
      });

      return record ? toDomainDocument(record) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByWorkspace(workspaceId: string, transaction?: TransactionContext): Promise<ContentDocument[]> {
    try {
      const client = resolveContentPrismaClient(this.prisma, transaction);
      const records = await client.contentDocument.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          currentDraftVersion: {
            include: {
              blocks: {
                orderBy: [{ path: 'asc' }, { position: 'asc' }],
              },
            },
          },
          publishedSnapshot: true,
        },
      });

      return records.map(toDomainDocument);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByPurpose(
    workspaceId: string,
    purpose: ContentDocumentPurpose,
    transaction?: TransactionContext,
  ): Promise<ContentDocument[]> {
    try {
      const client = resolveContentPrismaClient(this.prisma, transaction);
      const records = await client.contentDocument.findMany({
        where: { workspaceId, purpose },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          currentDraftVersion: {
            include: {
              blocks: {
                orderBy: [{ path: 'asc' }, { position: 'asc' }],
              },
            },
          },
          publishedSnapshot: true,
        },
      });

      return records.map(toDomainDocument);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
