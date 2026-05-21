CREATE UNIQUE INDEX "AssessmentAttempt_active_assessment_learner_key"
ON "AssessmentAttempt" ("assessmentId", "learnerPrincipalId")
WHERE "status" = 'IN_PROGRESS';
