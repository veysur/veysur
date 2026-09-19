import { ProjectAdmin } from 'veysur-common'
import { PropsOf } from 'mzen-schema'
import { Api, ErrorRest } from 'model'
import type { AuthData } from 'hook'

export type AcceptNewAccountResult = AuthData & { projectId: string }

export class ProjectAdminInviteApi extends Api {
  async getInviteDetail(
    code: string,
    email: string,
  ): Promise<PropsOf<ProjectAdmin>> {
    try {
      return await this.getClient().get<PropsOf<ProjectAdmin>>(
        'project-admin/accept-detail',
        {
          params: { code, email },
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async accept(code: string, email: string): Promise<void> {
    try {
      await this.getClient().post<void>('project-admin/accept', { code, email })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async decline(code: string, email: string): Promise<void> {
    try {
      await this.getClient().post<void>('project-admin/decline', {
        code,
        email,
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async acceptNewAccount(
    code: string,
    email: string,
    data: { nameFirst: string; nameLast?: string; password: string },
  ): Promise<AcceptNewAccountResult> {
    try {
      return await this.getClient().post<AcceptNewAccountResult>(
        'project-admin/accept-new-account',
        { code, email, ...data },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
