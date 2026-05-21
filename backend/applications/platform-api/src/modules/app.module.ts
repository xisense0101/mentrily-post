import { Module } from '@nestjs/common';
import { FoundationModule } from '../foundation/foundation.module.js';
import { IdentityAccessModule } from './identity-access/identity-access.module.js';
import { WorkspaceGovernanceModule } from './workspace-governance/workspace-governance.module.js';
import { CommercialOperationsModule } from './commercial-operations/commercial-operations.module.js';
import { LearningDeliveryModule } from './learning-delivery/learning-delivery.module.js';
import { ContentStudioModule } from './content-studio/content-studio.module.js';
import { AssessmentDeliveryModule } from './assessment-delivery/assessment-delivery.module.js';
import { MediaLibraryModule } from './media-library/media-library.module.js';
import { CommunicationCenterModule } from './communication-center/communication-center.module.js';

@Module({
  imports: [
    FoundationModule,
    IdentityAccessModule,
    WorkspaceGovernanceModule,
    CommercialOperationsModule,
    LearningDeliveryModule,
    ContentStudioModule,
    AssessmentDeliveryModule,
    MediaLibraryModule,
    CommunicationCenterModule,
  ],
})
export class AppModule {}
