# Contributing to VeySur

Thanks for your interest in contributing. This repository is the canonical,
source-available home of the VeySur survey product.

## Before your first pull request

**All contributions require signing the [Contributor License Agreement](./CLA.md).**
Print, sign, and scan (or otherwise export to PDF) the CLA, then email it to
[admin@veysur.com](mailto:admin@veysur.com) before opening your first pull request; you only
need to do this once.

### Why a CLA, and what it actually means for you

The CLA has two parts, and the first part is the one that matters most for
you as a contributor:

1. **Your contribution is licensed to everyone under this project's own
   licence** ([Elastic License 2.0](./LICENSE)), the same terms anyone else
   pulling this repository gets. Nothing about signing the CLA changes what
   rights the public has to your contribution; it's the same "inbound =
   outbound" guarantee most open-source projects give you by default, just
   made explicit.
2. **You additionally grant VeySur Limited the right to use your
   contribution beyond those terms.** Specifically, that means including it
   in our private commercial platform code, and relicensing the project in
   the future (including to an OSI-approved open-source licence, which is
   on our roadmap once the business is in a position to do that, see
   [FAQ.md](./FAQ.md)).

You keep copyright in your own contribution. You're not signing away
ownership, just granting the licences above.

## Making a change

1. Open an issue first for anything non-trivial, so the design can be
   discussed before you invest time in an implementation.
2. Fork the repository and branch from `master`.
3. Keep pull requests focused: one logical change per PR.
4. Add or update tests for the behaviour you're changing.
5. Make sure the linter, type-checker, and test suite pass locally before
   opening the PR. The package-level `AGENTS.md` files have the exact
   commands.

## Reporting bugs

Open an issue with: what you expected, what happened instead, and the
smallest reproduction you can manage (a survey export, a screenshot, a
stack trace). For anything security-sensitive, see [SECURITY.md](./SECURITY.md)
instead of filing a public issue.

## Code of conduct

Be respectful and assume good faith. Maintainers may close issues or PRs,
or restrict participation, for conduct that doesn't meet that bar.

## Trademark note

Your contribution is licensed under the terms above; it does not grant you
any trademark rights. See [TRADEMARKS.md](./TRADEMARKS.md).
