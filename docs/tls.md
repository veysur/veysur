<!-- cspell:ignore caddy acme letsencrypt -->

# TLS

**Parent:** [README.md](./README.md)

Caddy terminates TLS. The mode is chosen by `VEYSUR_TLS_SNIPPET` in `.env`, which selects the snippet Compose
mounts into Caddy. `config-generate.sh` sets it for you.

| Mode | Snippet | Use when |
|---|---|---|
| Automatic | `caddy/tls-auto.caddy` | A public domain points at the host and ports 80 and 443 are open. Needs `VEYSUR_ACME_EMAIL`. |
| Your certificate | `caddy/tls-custom.caddy` | You have a certificate: put `tls.crt` and `tls.key` in `deploy/certs/` |
| Local certificate | `caddy/tls-internal.caddy` | Local trials; browsers warn until they trust Caddy's local CA |
| None | `caddy/tls-none.caddy` | A load balancer in front already terminates TLS; also set `VEYSUR_SITE_ADDRESS=:80` |

Certificates and ACME state live in the `veysur-caddy-data` volume and survive restarts.

## Notes

- **Automatic mode needs a publicly issuable name.** `localhost` and other private names never qualify, so
  use the local certificate mode for trials.
- **An empty `VEYSUR_ACME_EMAIL` breaks automatic mode**: Caddy cannot parse its snippet. `config-generate.sh`
  defaults it and `deploy.sh` refuses to continue without it.
- **Non-standard ports** appear in the public URL. `config-generate.sh` writes `API_S3_PUBLIC_BASE_URL`
  accordingly when `VEYSUR_HTTPS_PORT` is not 443.
- **Renewal or issuance failures** show only in the logs: `docker compose logs caddy`. `deploy.sh` checks the
  API through nginx and cannot see them.

## Custom domain layouts

To serve on a different address than `API_WEB_DOMAIN`, set `VEYSUR_SITE_ADDRESS`. The frontend's
`PUBLIC_AUTHENTICATION_DOMAIN` stays empty: everything is one origin.
