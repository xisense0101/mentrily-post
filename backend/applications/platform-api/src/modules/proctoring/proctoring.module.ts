import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { FoundationModule } from '../../foundation/foundation.module.js';
import {
  ProctoringEventRepository,
  ProctoringSessionRepository,
} from './application/proctoring.repository.js';
import { ProctoringPolicyService } from './application/proctoring-policy.service.js';
import { ProctoringReadService } from './application/proctoring-read.service.js';
import {
  EndProctoringSessionUseCase,
  GetActiveAttemptMonitoringUseCase,
  GetAttemptMonitoringTimelineUseCase,
  GetLearnerAttemptProctoringUseCase,
  GetProctoringSessionUseCase,
  RecordProctoringEventUseCase,
  RecordProctoringHeartbeatUseCase,
  StartProctoringSessionUseCase,
  SyncAttemptTerminalProctoringUseCase,
} from './application/use-cases/proctoring.use-cases.js';
import {
  GetProctoringIncidentUseCase,
  ListProctoringIncidentsUseCase,
  GetProctoringIncidentSummaryUseCase,
  UpdateProctoringIncidentStatusUseCase,
  AddProctoringIncidentNoteUseCase,
  CreateManualProctoringIncidentUseCase,
} from './application/use-cases/proctoring-incident.use-cases.js';
import {
  PrismaProctoringEventRepository,
  PrismaProctoringSessionRepository,
} from './infrastructure/persistence/prisma/prisma-proctoring.repository.js';
import { ProctoringController } from './presentation/http/proctoring.controller.js';

@Module({
  imports: [FoundationModule, DataPlatformModule],
  controllers: [ProctoringController],
  providers: [
    ProctoringPolicyService,
    ProctoringReadService,
    {
      provide: ProctoringSessionRepository,
      useClass: PrismaProctoringSessionRepository,
    },
    {
      provide: ProctoringEventRepository,
      useClass: PrismaProctoringEventRepository,
    },
    StartProctoringSessionUseCase,
    RecordProctoringHeartbeatUseCase,
    RecordProctoringEventUseCase,
    EndProctoringSessionUseCase,
    GetAttemptMonitoringTimelineUseCase,
    GetActiveAttemptMonitoringUseCase,
    GetProctoringSessionUseCase,
    GetLearnerAttemptProctoringUseCase,
    SyncAttemptTerminalProctoringUseCase,
    GetProctoringIncidentUseCase,
    ListProctoringIncidentsUseCase,
    GetProctoringIncidentSummaryUseCase,
    UpdateProctoringIncidentStatusUseCase,
    AddProctoringIncidentNoteUseCase,
    CreateManualProctoringIncidentUseCase,
  ],
  exports: [
    ProctoringPolicyService,
    ProctoringReadService,
    GetLearnerAttemptProctoringUseCase,
    SyncAttemptTerminalProctoringUseCase,
  ],
})
export class ProctoringModule {}
