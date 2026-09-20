import { Api, ErrorRest } from 'model'

export class UserProfileApi extends Api {
  async updateBasicInfo(data: {
    nameFirst: string
    nameLast: string
  }): Promise<void> {
    try {
      await this.getClient().put('user/profile', {
        data: {
          nameFirst: data.nameFirst,
          nameLast: data.nameLast,
        },
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async validatePasswordCurrent(password: string): Promise<boolean> {
    try {
      const result = await this.getClient().post<boolean | string>(
        'user/validate-password-current',
        {
          value: password,
        },
      )
      return result === true
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async validateEmailNotRegistered(email: string): Promise<boolean> {
    try {
      const result = await this.getClient().post<boolean | string>(
        'user/validate-email-not-registered',
        {
          value: email,
        },
      )
      return result === true
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async updateEmail(email: string): Promise<void> {
    try {
      await this.getClient().put('user/profile', {
        data: {
          email,
        },
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async updatePassword(data: {
    password: string
    passwordCurrent: string
  }): Promise<void> {
    try {
      await this.getClient().put('user/profile', {
        data: {
          password: data.password,
          passwordCurrent: data.passwordCurrent,
        },
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
