import {
  generateFilePath,
  generatePlatformFilePath,
  generateStoredFilename,
  responseFileBucket,
  RESPONSE_FILE_BUCKET_COUNT,
} from './s3Client'

describe('S3 Path Generation', () => {
  const storedFilename = 'test-file_abcd1234567890ab.pdf'

  describe('generateFilePath', () => {
    test('should generate project-level path', () => {
      const path = generateFilePath('33JLwlFkwL', 'logo_abc123.png', {
        surveyId: null,
        responseId: null,
        fileContext: null,
      })
      expect(path).toBe('project-33JLwlFkwL/logo_abc123.png')
    })

    test('should generate survey-level path', () => {
      const path = generateFilePath('33JLwlFkwL', 'reference_abc123.pdf', {
        surveyId: 'survey_456',
        responseId: null,
        fileContext: 'survey',
      })
      expect(path).toBe(
        'project-33JLwlFkwL/survey/survey_456/reference_abc123.pdf',
      )
    })

    test('should generate response-level path', () => {
      const path = generateFilePath('33JLwlFkwL', 'resume_abc123.pdf', {
        surveyId: 'survey_456',
        responseId: 'resp_789',
        fileContext: 'response',
      })
      const bucket = responseFileBucket('resp_789')
      expect(path).toBe(
        `project-33JLwlFkwL/survey/survey_456/response/${bucket}/resp_789/resume_abc123.pdf`,
      )
    })

    test('should default to project level when surveyId missing', () => {
      const path = generateFilePath('33JLwlFkwL', 'file_abc123.pdf', {
        surveyId: null,
        responseId: 'resp_789',
        fileContext: 'response',
      })
      expect(path).toBe('project-33JLwlFkwL/file_abc123.pdf')
    })

    test('should default to project level when fileContext is project', () => {
      const path = generateFilePath('33JLwlFkwL', 'file_abc123.pdf', {
        surveyId: null,
        responseId: null,
        fileContext: 'project',
      })
      expect(path).toBe('project-33JLwlFkwL/file_abc123.pdf')
    })

    test('should ignore responseId when fileContext is survey', () => {
      const path = generateFilePath('33JLwlFkwL', 'file_abc123.pdf', {
        surveyId: 'survey_456',
        responseId: 'resp_789',
        fileContext: 'survey',
      })
      expect(path).toBe('project-33JLwlFkwL/survey/survey_456/file_abc123.pdf')
    })
  })

  describe('generateStoredFilename', () => {
    test('should generate filename with 16-char hash suffix', () => {
      const hash =
        'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2'
      const filename = 'my-test-file.pdf'
      const stored = generateStoredFilename(filename, hash)

      expect(stored).toMatch(/_a1b2c3d4e5f6g7h8\.pdf$/)
      expect(stored).toContain('my-test-file')
    })

    test('should normalize filename', () => {
      const hash =
        'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2'
      const filename = 'My Test File 2024.pdf'
      const stored = generateStoredFilename(filename, hash)

      expect(stored).toBe('my-test-file-2024_a1b2c3d4e5f6g7h8.pdf')
    })

    test('should handle special characters', () => {
      const hash =
        'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2'
      const filename = 'Test@File#123!.pdf'
      const stored = generateStoredFilename(filename, hash)

      expect(stored).toBe('test-file-123_a1b2c3d4e5f6g7h8.pdf')
    })

    test('should use first 16 characters of hash', () => {
      const hash =
        'abcdefgh12345678901234567890123456789012345678901234567890123456'
      const filename = 'test.pdf'
      const stored = generateStoredFilename(filename, hash)

      expect(stored).toBe('test_abcdefgh12345678.pdf')
    })
  })

  describe('Context-based organization examples', () => {
    test('project file example', () => {
      const path = generateFilePath('33JLwlFkwL', 'logo_8abc1234567890ab.png', {
        surveyId: null,
        responseId: null,
        fileContext: 'project',
      })
      expect(path).toBe('project-33JLwlFkwL/logo_8abc1234567890ab.png')
    })

    test('survey attachment example', () => {
      const path = generateFilePath(
        '33JLwlFkwL',
        'reference-doc_8abc1234567890ab.pdf',
        { surveyId: 'survey_abc', responseId: null, fileContext: 'survey' },
      )
      expect(path).toBe(
        'project-33JLwlFkwL/survey/survey_abc/reference-doc_8abc1234567890ab.pdf',
      )
    })

    test('response upload example', () => {
      const path = generateFilePath(
        '33JLwlFkwL',
        'resume_def4567890abcdef.pdf',
        {
          surveyId: 'survey_abc',
          responseId: 'resp_xyz',
          fileContext: 'response',
        },
      )
      const bucket = responseFileBucket('resp_xyz')
      expect(path).toBe(
        `project-33JLwlFkwL/survey/survey_abc/response/${bucket}/resp_xyz/resume_def4567890abcdef.pdf`,
      )
    })

    test('context-specific deduplication - same file in different surveys', () => {
      const filename = 'shared-file_1234567890abcdef.pdf'

      // Same file uploaded to Survey A
      const surveyAPath = generateFilePath('33JLwlFkwL', filename, {
        surveyId: 'survey_a',
        responseId: null,
        fileContext: 'survey',
      })
      expect(surveyAPath).toBe(
        'project-33JLwlFkwL/survey/survey_a/shared-file_1234567890abcdef.pdf',
      )

      // Same file uploaded to Survey B - different path (no cross-context deduplication)
      const surveyBPath = generateFilePath('33JLwlFkwL', filename, {
        surveyId: 'survey_b',
        responseId: null,
        fileContext: 'survey',
      })
      expect(surveyBPath).toBe(
        'project-33JLwlFkwL/survey/survey_b/shared-file_1234567890abcdef.pdf',
      )

      // Paths are different for different contexts
      expect(surveyAPath).not.toBe(surveyBPath)
    })

    test('context hierarchy - files organized by context type', () => {
      const filename = 'test_abc123.pdf'

      const projectPath = generateFilePath('33JLwlFkwL', filename, {
        surveyId: null,
        responseId: null,
        fileContext: 'project',
      })
      const surveyPath = generateFilePath('33JLwlFkwL', filename, {
        surveyId: 'survey_456',
        responseId: null,
        fileContext: 'survey',
      })
      const responsePath = generateFilePath('33JLwlFkwL', filename, {
        surveyId: 'survey_456',
        responseId: 'resp_789',
        fileContext: 'response',
      })

      // Different hierarchical paths
      expect(projectPath).toBe('project-33JLwlFkwL/test_abc123.pdf')
      expect(surveyPath).toBe(
        'project-33JLwlFkwL/survey/survey_456/test_abc123.pdf',
      )
      const bucket = responseFileBucket('resp_789')
      expect(responsePath).toBe(
        `project-33JLwlFkwL/survey/survey_456/response/${bucket}/resp_789/test_abc123.pdf`,
      )
    })
  })

  describe('responseFileBucket', () => {
    test('is deterministic for the same responseId', () => {
      expect(responseFileBucket('resp_789')).toBe(responseFileBucket('resp_789'))
    })

    test('returns a zero-padded 3-digit bucket within range', () => {
      const bucket = responseFileBucket('resp_789')
      expect(bucket).toMatch(/^\d{3}$/)
      expect(Number(bucket)).toBeGreaterThanOrEqual(0)
      expect(Number(bucket)).toBeLessThan(RESPONSE_FILE_BUCKET_COUNT)
    })

    test('spreads different responseIds across multiple buckets', () => {
      const buckets = new Set(
        Array.from({ length: 50 }, (_, i) => responseFileBucket(`resp_${i}`)),
      )
      expect(buckets.size).toBeGreaterThan(1)
    })
  })

  describe('generatePlatformFilePath', () => {
    test('should generate path with current year/month and preserve prefix', () => {
      const now = new Date()
      const year = String(now.getUTCFullYear())
      const month = String(now.getUTCMonth() + 1).padStart(2, '0')

      const path = generatePlatformFilePath(
        'platform/support-ticket/attachment',
        storedFilename,
      )

      expect(path).toBe(
        `platform/support-ticket/attachment/${year}/${month}/${storedFilename}`,
      )
    })

    test('should zero-pad single-digit months', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-15T00:00:00Z'))

      const path = generatePlatformFilePath(
        'platform/support-ticket/attachment',
        storedFilename,
      )

      expect(path).toBe(
        `platform/support-ticket/attachment/2026/01/${storedFilename}`,
      )

      jest.useRealTimers()
    })
  })
})
