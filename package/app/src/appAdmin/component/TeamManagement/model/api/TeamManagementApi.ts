import { ProjectAdmin } from 'veysur-common'
import { PropsOf } from '@datacapy/schema'

import { Api, ErrorRest } from 'model'

export type TeamInviteData = {
  nameFirst: string
  nameLast?: string
  email: string
}

export class TeamManagementApi extends Api {
  async getTeamMembers(projectId: string): Promise<PropsOf<ProjectAdmin>[]> {
    try {
      return await this.getClient().get<PropsOf<ProjectAdmin>[]>(
        `/project-admin/${projectId}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async deleteTeamMember(
    projectId: string,
    projectAdminId: string,
  ): Promise<void> {
    try {
      await this.getClient().delete(
        `/project-admin/${projectId}/${projectAdminId}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async sendInvite(
    projectId: string,
    data: TeamInviteData,
  ): Promise<PropsOf<ProjectAdmin>> {
    try {
      return await this.getClient().post<PropsOf<ProjectAdmin>>(
        `/project-admin/${projectId}/invite`,
        data,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async cancelInvite(projectId: string, projectAdminId: string): Promise<void> {
    try {
      await this.getClient().delete(
        `/project-admin/${projectId}/${projectAdminId}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
