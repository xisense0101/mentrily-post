import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Webhook } from 'svix';
import { HandleIdentityProviderEvent } from '../../application/use-cases/handle-identity-provider-event.use-case.js';
import { IdentityProviderEventDTO } from '@mentrily/contract-catalog';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  constructor(private readonly handleEvent: HandleIdentityProviderEvent) {}

  @Post()
  async handle(@Headers() headers: any, @Req() req: RawBodyRequest<Request>) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
    }

    const svix_id = headers['svix-id'];
    const svix_timestamp = headers['svix-timestamp'];
    const svix_signature = headers['svix-signature'];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      throw new BadRequestException('Error occurred -- no svix headers');
    }

    const payload = req.rawBody?.toString() ?? '';
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;

    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id as string,
        'svix-timestamp': svix_timestamp as string,
        'svix-signature': svix_signature as string,
      });
    } catch (err) {
      console.error('Error verifying webhook:', err);
      throw new BadRequestException('Error occurred -- verification failed');
    }

    const normalizedEvent = this.normalizeEvent(evt);
    if (normalizedEvent) {
      await this.handleEvent.execute(normalizedEvent);
    }

    return { success: true };
  }

  private normalizeEvent(clerkEvent: any): IdentityProviderEventDTO | null {
    const { type, data } = clerkEvent;

    switch (type) {
      case 'user.created':
      case 'user.updated':
        return {
          type: type as any,
          externalId: data.id,
          data: {
            email: data.email_addresses[0]?.email_address,
            displayName: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || undefined,
            metadata: data.public_metadata,
          },
          timestamp: new Date(),
        };

      case 'user.deleted':
        return {
          type: 'user.deleted',
          externalId: data.id,
          data: {},
          timestamp: new Date(),
        };

      default:
        return null;
    }
  }
}
