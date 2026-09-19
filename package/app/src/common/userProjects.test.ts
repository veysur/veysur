import { Project, ProjectAdmin } from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import {
  getAdminProjects,
  getOwnedProjects,
  getUserProjects,
} from './userProjects'

describe('userProjects', () => {
  const owned: PropsOf<Project> = {
    _id: 'p1',
    ownerId: 'user1',
    name: 'Owned',
    timezone: 'UTC',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }
  const admin: PropsOf<Project> = {
    ...owned,
    _id: 'p2',
    name: 'Admin',
  }
  const adminJoinRecord: PropsOf<ProjectAdmin> = {
    _id: 'a1',
    projectId: 'p2',
    createdById: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    project: admin,
  }

  describe('getOwnedProjects', () => {
    it('returns an empty array when projectOwn is undefined', () => {
      expect(getOwnedProjects(undefined)).toEqual([])
    })

    it('returns an empty array when projectOwn is empty', () => {
      expect(getOwnedProjects([])).toEqual([])
    })

    it('returns the owned projects as-is', () => {
      expect(getOwnedProjects([owned])).toEqual([owned])
    })
  })

  describe('getAdminProjects', () => {
    it('returns an empty array when projectAdmin is undefined', () => {
      expect(getAdminProjects(undefined)).toEqual([])
    })

    it('unwraps the nested project from each join record', () => {
      expect(getAdminProjects([adminJoinRecord])).toEqual([admin])
    })

    it('filters out join records with no nested project', () => {
      const joinRecordWithoutProject: PropsOf<ProjectAdmin> = {
        ...adminJoinRecord,
        project: undefined,
      }
      expect(getAdminProjects([joinRecordWithoutProject])).toEqual([])
    })
  })

  describe('getUserProjects', () => {
    it('combines owned and admin projects, owned first', () => {
      expect(getUserProjects([owned], [adminJoinRecord])).toEqual([
        owned,
        admin,
      ])
    })

    it('returns an empty array when both inputs are undefined', () => {
      expect(getUserProjects(undefined, undefined)).toEqual([])
    })
  })
})
