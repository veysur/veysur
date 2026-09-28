import { SettingSurvey } from '../../SettingSurvey'
import { SurveyBase } from '../SurveyBase'
import { Constructor } from '../../../type'
import { sortLanguageCodesByName } from '../../../../Iso639v1'

/**
 * GetterMethods
 *
 * Some survey data is dynamic and needs to calculated at runtime.
 * An example of this is that many survey settings can have a null value
 * which indicates that we should use the project wide SurveySettings
 * to determine the final value.
 */
export function GetterMethods<T extends Constructor<SurveyBase>>(Base: T) {
  return class extends Base {
    getLanguage(defaults: SettingSurvey) {
      const options = this.language?.options ?? defaults.language.options
      return {
        default: this.language?.default ?? defaults.language.default,
        options: sortLanguageCodesByName(options),
      }
    }

    getPresentation(defaults: SettingSurvey) {
      return {
        format: this.presentation?.format ?? defaults.presentation.format,
        noAnswer: this.presentation?.noAnswer ?? defaults.presentation.noAnswer,
        title: this.presentation?.title ?? defaults.presentation.title,
        welcomeMessage:
          this.presentation?.welcomeMessage ??
          defaults.presentation.welcomeMessage,
        progressBar:
          this.presentation?.progressBar ?? defaults.presentation.progressBar,
        questionCount:
          this.presentation?.questionCount ??
          defaults.presentation.questionCount,
        groupName:
          this.presentation?.groupName ?? defaults.presentation.groupName,
        groupDesc:
          this.presentation?.groupDesc ?? defaults.presentation.groupDesc,
        questionNum:
          this.presentation?.questionNum ?? defaults.presentation.questionNum,
        questionCode:
          this.presentation?.questionCode ?? defaults.presentation.questionCode,
        questionIndex:
          this.presentation?.questionIndex ??
          defaults.presentation.questionIndex,
        backNav: this.presentation?.backNav ?? defaults.presentation.backNav,
        redirectEnd:
          this.presentation?.redirectEnd ?? defaults.presentation.redirectEnd,
        navDelay: this.presentation?.navDelay ?? defaults.presentation.navDelay,
        print: this.presentation?.print ?? defaults.presentation.print,
        stats: this.presentation?.stats ?? defaults.presentation.stats,
        noBrand: this.presentation?.noBrand ?? defaults.presentation.noBrand,
        thankYouLink:
          this.presentation?.thankYouLink ?? defaults.presentation.thankYouLink,
      }
    }

    getParticipant(defaults: SettingSurvey) {
      return {
        htmlEmail:
          this.participant?.htmlEmail ?? defaults.participant.htmlEmail,
        thankYouEmail:
          this.participant?.thankYouEmail ?? defaults.participant.thankYouEmail,
        tokenLength:
          this.participant?.tokenLength ?? defaults.participant.tokenLength,
      }
    }

    getData(defaults: SettingSurvey) {
      return {
        timestamp: this.data?.timestamp ?? defaults.data.timestamp,
        ip: this.data?.ip ?? defaults.data.ip,
        anonymiseIp: this.data?.anonymiseIp ?? defaults.data.anonymiseIp,
        referrerUrl: this.data?.referrerUrl ?? defaults.data.referrerUrl,
        timings: this.data?.timings ?? defaults.data.timings,
        assessment: this.data?.assessment ?? defaults.data.assessment,
      }
    }

    getAccess(defaults: SettingSurvey) {
      return {
        anonymous: this.access?.anonymous ?? defaults.access.anonymous,
        open: this.access?.open ?? defaults.access.open,
        publicReg: this.access?.publicReg ?? defaults.access.publicReg,
        index: this.access?.index ?? defaults.access.index,
        tokenPersist: this.access?.tokenPersist ?? defaults.access.tokenPersist,
        multiple: this.access?.multiple ?? defaults.access.multiple,
        repeatCookie: this.access?.repeatCookie ?? defaults.access.repeatCookie,
        resumeLink: this.access?.resumeLink ?? defaults.access.resumeLink,
        captcha: this.access?.captcha ?? defaults.access.captcha,
        captchaReg: this.access?.captchaReg ?? defaults.access.captchaReg,
        captchaResume:
          this.access?.captchaResume ?? defaults.access.captchaResume,
      }
    }

    getDataPolicy(defaults: SettingSurvey) {
      return {
        show: this.dataPolicy?.show ?? defaults.dataPolicy.show,
        link: this.dataPolicy?.link ?? defaults.dataPolicy.link,
        text: this.dataPolicy?.text ?? defaults.dataPolicy.text,
        url: this.dataPolicy?.url ?? defaults.dataPolicy.url,
      }
    }

    getLegalNotice(defaults: SettingSurvey) {
      return {
        show: this.legalNotice?.show ?? defaults.legalNotice.show,
        link: this.legalNotice?.link ?? defaults.legalNotice.link,
        text: this.legalNotice?.text ?? defaults.legalNotice.text,
        url: this.legalNotice?.url ?? defaults.legalNotice.url,
      }
    }

    getSchedule(_defaults: SettingSurvey) {
      return {
        start: this.schedule?.start || null,
        end: this.schedule?.end || null,
      }
    }

    getNotify(defaults: SettingSurvey) {
      return {
        basic: this.notify?.basic ?? defaults.notify.basic,
        detailed: this.notify?.detailed ?? defaults.notify.detailed,
      }
    }

    getContentFormat(defaults: SettingSurvey) {
      return {
        htmlAllowed:
          this.contentFormat?.htmlAllowed ?? defaults.contentFormat.htmlAllowed,
        markdownAllowed:
          this.contentFormat?.markdownAllowed ??
          defaults.contentFormat.markdownAllowed,
        scriptTagsAllowed:
          this.contentFormat?.scriptTagsAllowed ??
          defaults.contentFormat.scriptTagsAllowed,
      }
    }
  }
}
