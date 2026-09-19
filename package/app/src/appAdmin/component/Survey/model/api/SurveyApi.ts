import { Patch, Survey, SurveyData } from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import { Api, ErrorRest } from 'model'

export class SurveyApi extends Api {
  async getAll(
    page: number = 1,
    perPage: number = 20,
    search?: string,
    startDate?: string,
    endDate?: string,
    dateField?: string,
  ): Promise<{ surveys: PropsOf<Survey>[]; surveyCount: number }> {
    try {
      return await this.getClient().get<{
        surveys: PropsOf<Survey>[]
        surveyCount: number
      }>('/survey', {
        params: {
          page,
          perPage,
          search,
          startDate,
          endDate,
          dateField,
        },
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async getOne(
    surveyId: string,
    params?: { lang?: string; defaultLang?: string },
  ): Promise<PropsOf<Survey>> {
    try {
      return await this.getClient().get<PropsOf<Survey>>(
        `/survey/${surveyId}`,
        { params },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async patch(surveyId: string, patches: Patch[]) {
    try {
      return await this.getClient().patch<PropsOf<Survey>>(
        `/survey/${surveyId}`,
        { patches },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async create(survey: Partial<SurveyData>) {
    try {
      return await this.getClient().post<PropsOf<Survey>>('/survey', {
        survey,
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async delete(surveyId: string) {
    try {
      return await this.getClient().delete<PropsOf<Survey>>(
        `/survey/${surveyId}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
