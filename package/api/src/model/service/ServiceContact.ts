import { Service } from '@datacapy/server'
import { ServiceEmail } from './ServiceEmail'

export class ServiceContact extends Service {
  services: {
    email: ServiceEmail
  }

  constructor() {
    super({ name: 'contact' })
  }

  async submit({ name, email, subject, message }) {
    await this.services.email.frequencyLimit({
      to: email,
      type: 'contact',
      rules: [{ multiplier: 1, unit: 'hours', limit: 3 }],
    })

    const sendOptionsFrom = this.config.model.app.mail.sendOptions.from
    const from =
      typeof sendOptionsFrom === 'object'
        ? sendOptionsFrom.email
        : sendOptionsFrom
    const to = this.config.model.app.mail.contactAddress

    await this.services.email.send({
      to,
      from,
      subject: `[Contact] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      type: 'contact',
    })
  }
}

export default ServiceContact
