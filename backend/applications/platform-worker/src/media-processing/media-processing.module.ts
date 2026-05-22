import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { MediaProcessingWorker } from './media-processing.worker.js';
import { MediaSecurityScanWorker } from './media-security-scan.worker.js';
import { MediaLifecycleWorker } from './media-lifecycle.worker.js';
import { FixtureMediaVirusScanner } from '../../../platform-api/src/modules/media-library/infrastructure/scanning/fixture-media-virus-scanner.adapter.js';

@Module({
  imports: [DataPlatformModule],
  providers: [
    MediaProcessingWorker,
    MediaSecurityScanWorker,
    MediaLifecycleWorker,
    FixtureMediaVirusScanner,
  ],
  exports: [MediaProcessingWorker, MediaSecurityScanWorker, MediaLifecycleWorker],
})
export class MediaProcessingModule {}
