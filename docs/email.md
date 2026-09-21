<!-- cspell:ignore starttls smtp imap dkim dmarc spf postmark mailgun sendmail relay's -->

# E-mail

**Parent:** [README.md](./README.md)

VeySur sends account e-mail (password resets, address verification) and survey invitations through an SMTP
relay that you provide. The stack does not include a mail server. Use your organisation's relay or a
transactional service.

## Configure the relay

`config-generate.sh` asks for the host, port, username, password and sender address, and warns if it cannot
connect. To change them later, edit `.env` and run `./scripts/deploy.sh`.

| Key | Default | Purpose |
|---|---|---|
| `API_MAIL_HOST` | empty | Relay host name |
| `API_MAIL_PORT` | `587` | Relay port |
| `API_MAIL_SECURE` | `false` | `true` for implicit TLS (port 465); see below |
| `API_MAIL_AUTH_USER`, `API_MAIL_AUTH_PASS` | empty | Relay credentials |
| `API_MAIL_ADDRESS_FROM` | `no-reply@<API_WEB_DOMAIN>` | Sender address |
| `API_MAIL_FROM_NAME` | `API_BRAND_NAME` | Sender display name |
| `API_MAIL_ADDRESS_CONTACT` | the sender address | Recipient of contact-form messages, if you use that form |
| `API_COMPANY_NAME` | `MyCompany` | Name used in e-mails when the project has no name of its own |

The relay must accept mail from the sender address. Most services require you to verify the address or its
domain first.

### Ports and TLS

| Port | `API_MAIL_SECURE` | Behaviour |
|---|---|---|
| 587 | `false` | Connects in plain text and upgrades with STARTTLS when the relay offers it |
| 465 | `true` | TLS from the first byte |
| 25 | `false` | As 587, but many hosts block outbound port 25 |

`config-generate.sh` sets `API_MAIL_SECURE` from the port. Connection and socket timeouts are fixed at 10
seconds.

STARTTLS is opportunistic: if a relay on port 587 does not offer it, the message is sent unencrypted. There is
no setting to require it, and no way to trust a custom certificate authority for SMTP. Use port 465 with
`API_MAIL_SECURE=true` when the connection must always be encrypted.

### Authentication

A relay that advertises authentication needs `API_MAIL_AUTH_USER` and `API_MAIL_AUTH_PASS`. A relay that does
not advertise it, such as a local relay that trusts your network, works with both left empty.

### Common services

Confirm the details in the provider's own documentation.

| Service | Host | Port | Username and password |
|---|---|---|---|
| Amazon SES | `email-smtp.<region>.amazonaws.com` | 587 or 465 | SMTP credentials created in SES, not your AWS keys; sender must be a verified identity |
| Postmark | `smtp.postmarkapp.com` | 587 | Server API token as both |
| Mailgun | `smtp.mailgun.org` | 587 | SMTP credentials for the sending domain |
| Google Workspace or Gmail | `smtp.gmail.com` | 587 | Account address and an app password; daily sending limits apply |

## Test it

```bash
./scripts/veysur.sh mail-test you@example.com
```

The command sends one message through the settings the API itself uses, and reports the relay's error if it
fails. It bypasses the invitation queue, so a pass means the relay accepts your credentials and sender, not
that the message reaches an inbox. Check the inbox and the spam folder.

## Deliverability

Publish SPF and DKIM records for the sender domain as your relay provider instructs, and add a DMARC record.
Without them, receiving servers often move survey invitations to spam. VeySur cannot set these for you.

## When mail is not configured

The stack still starts, and the first administrator can be created because that account needs no e-mail.
Sending fails at send time, so:

- Password reset and address verification return an error to the user.
- Survey invitations and reminders cannot be delivered. They go through a paced queue, so failures show up over time rather than at once.

## Bounces and complaints (optional)

To process bounces and spam complaints, point VeySur at a mailbox over IMAP. Leave these empty to skip it.

| Key | Purpose |
|---|---|
| `API_MAIL_BOUNCE_DOMAIN` | Domain for bounce addresses |
| `API_MAIL_IMAP_HOST`, `API_MAIL_IMAP_PORT` | Mailbox server (port defaults to 993) |
| `API_MAIL_IMAP_BOUNCE_USER`, `API_MAIL_IMAP_BOUNCE_PASS` | Mailbox that receives bounces |
| `API_MAIL_IMAP_ABUSE_USER`, `API_MAIL_IMAP_ABUSE_PASS` | Mailbox that receives complaints |
| `API_MAIL_IMAP_CA_CERT` | Certificate authority to trust for a self-signed IMAP server |

## Not supported

`API_MAIL_TRANSPORT_TYPE=sendmail` does not work in this release: the API never enables the sendmail
transport, so mail is not sent that way. Leave it at `smtp`.
