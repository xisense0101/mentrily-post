import { Controller, Post, Patch, Body, Req, Param, Get, Inject } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppError, RequestContext } from '@mentrily/service-core';
import { CreateLearningCourseUseCase } from '../../application/use-cases/create-learning-course.use-case.js';
import { GetLearningCourseUseCase } from '../../application/use-cases/get-learning-course.use-case.js';
import { ListWorkspaceLearningCoursesUseCase } from '../../application/use-cases/list-workspace-learning-courses.use-case.js';
import { UpdateLearningCourseUseCase } from '../../application/use-cases/update-learning-course.use-case.js';
import { AddLearningSectionUseCase } from '../../application/use-cases/add-learning-section.use-case.js';
import { AddLearningLessonUseCase } from '../../application/use-cases/add-learning-lesson.use-case.js';
import { ReorderLearningSectionsUseCase } from '../../application/use-cases/reorder-learning-sections.use-case.js';
import { ReorderLearningLessonsUseCase } from '../../application/use-cases/reorder-learning-lessons.use-case.js';
import { PublishLearningCourseUseCase } from '../../application/use-cases/publish-learning-course.use-case.js';
import { ArchiveLearningCourseUseCase } from '../../application/use-cases/archive-learning-course.use-case.js';
import { CreateLearningCourseInput } from '../../application/dto/create-learning-course.dto.js';
import { UpdateLearningCourseInput } from '../../application/dto/update-learning-course.dto.js';
import { AddLearningSectionInput } from '../../application/dto/add-learning-section.dto.js';
import { AddLearningLessonInput } from '../../application/dto/add-learning-lesson.dto.js';
import { ReorderLearningSectionsInput } from '../../application/dto/reorder-learning-sections.dto.js';
import { ReorderLearningLessonsInput } from '../../application/dto/reorder-learning-lessons.dto.js';
import { PublishLearningCourseInput } from '../../application/dto/publish-learning-course.dto.js';
import { MediaAssetRepository } from '../../../media-library/domain/repositories/index.js';
import { mapCourseToResponse } from '../../application/mappers/learning-course-response.mapper.js';

@Controller('/workspace/learning/courses')
export class CreatorLearningController {
  constructor(
    @Inject(CreateLearningCourseUseCase)
    private readonly createCourse: CreateLearningCourseUseCase,
    @Inject(GetLearningCourseUseCase)
    private readonly getCourse: GetLearningCourseUseCase,
    @Inject(ListWorkspaceLearningCoursesUseCase)
    private readonly listCourses: ListWorkspaceLearningCoursesUseCase,
    @Inject(UpdateLearningCourseUseCase)
    private readonly updateCourse: UpdateLearningCourseUseCase,
    @Inject(AddLearningSectionUseCase)
    private readonly addSection: AddLearningSectionUseCase,
    @Inject(AddLearningLessonUseCase)
    private readonly addLesson: AddLearningLessonUseCase,
    @Inject(ReorderLearningSectionsUseCase)
    private readonly reorderSections: ReorderLearningSectionsUseCase,
    @Inject(ReorderLearningLessonsUseCase)
    private readonly reorderLessons: ReorderLearningLessonsUseCase,
    @Inject(PublishLearningCourseUseCase)
    private readonly publishCourse: PublishLearningCourseUseCase,
    @Inject(ArchiveLearningCourseUseCase)
    private readonly archiveCourse: ArchiveLearningCourseUseCase,
    @Inject(MediaAssetRepository)
    private readonly mediaAssetRepo: MediaAssetRepository,
  ) {}

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }

    return context;
  }

  @Post()
  async create(@Req() request: FastifyRequest, @Body() body: CreateLearningCourseInput) {
    const course = await this.createCourse.execute(this.requestContext(request), body);
    return await mapCourseToResponse(course, this.mediaAssetRepo);
  }

  @Get()
  async list(@Req() request: FastifyRequest) {
    const courses = await this.listCourses.execute(this.requestContext(request));
    const results = [];
    for (const course of courses) {
      results.push(await mapCourseToResponse(course, this.mediaAssetRepo));
    }
    return results;
  }

  @Get('/:courseId')
  async getOne(@Req() request: FastifyRequest, @Param('courseId') courseId: string) {
    const course = await this.getCourse.execute(this.requestContext(request), courseId);
    return await mapCourseToResponse(course, this.mediaAssetRepo);
  }

  @Patch('/:courseId')
  async update(
    @Req() request: FastifyRequest,
    @Param('courseId') courseId: string,
    @Body() body: UpdateLearningCourseInput,
  ) {
    const course = await this.updateCourse.execute(this.requestContext(request), courseId, body);
    return await mapCourseToResponse(course, this.mediaAssetRepo);
  }

  @Post('/:courseId/sections')
  async addCourseSection(
    @Req() request: FastifyRequest,
    @Param('courseId') courseId: string,
    @Body() body: AddLearningSectionInput,
  ) {
    const course = await this.addSection.execute(this.requestContext(request), courseId, body);
    return await mapCourseToResponse(course, this.mediaAssetRepo);
  }

  @Post('/:courseId/sections/:sectionId/lessons')
  async addCourseLesson(
    @Req() request: FastifyRequest,
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: AddLearningLessonInput,
  ) {
    const course = await this.addLesson.execute(
      this.requestContext(request),
      courseId,
      sectionId,
      body,
    );
    return await mapCourseToResponse(course, this.mediaAssetRepo);
  }

  @Patch('/:courseId/sections/reorder')
  async reorderCourseSections(
    @Req() request: FastifyRequest,
    @Param('courseId') courseId: string,
    @Body() body: ReorderLearningSectionsInput,
  ) {
    const course = await this.reorderSections.execute(this.requestContext(request), courseId, body);
    return await mapCourseToResponse(course, this.mediaAssetRepo);
  }

  @Patch('/:courseId/sections/:sectionId/lessons/reorder')
  async reorderCourseLessons(
    @Req() request: FastifyRequest,
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: ReorderLearningLessonsInput,
  ) {
    const course = await this.reorderLessons.execute(
      this.requestContext(request),
      courseId,
      sectionId,
      body,
    );
    return await mapCourseToResponse(course, this.mediaAssetRepo);
  }

  @Post('/:courseId/publish')
  async publish(
    @Req() request: FastifyRequest,
    @Param('courseId') courseId: string,
    @Body() body: PublishLearningCourseInput,
  ) {
    const course = await this.publishCourse.execute(this.requestContext(request), courseId, body);
    return await mapCourseToResponse(course, this.mediaAssetRepo);
  }

  @Post('/:courseId/archive')
  async archive(@Req() request: FastifyRequest, @Param('courseId') courseId: string) {
    const course = await this.archiveCourse.execute(this.requestContext(request), courseId);
    return await mapCourseToResponse(course, this.mediaAssetRepo);
  }
}
