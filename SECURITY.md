# Security policy

LumenList is live at https://lumenlist.app and holds real families' gift lists. If you find a security problem, please tell us privately first.

## Reporting a vulnerability

Email **hello@pateastudio.com** with "Security" in the subject. Please don't open a public issue or discussion for it.

Include what you found, how to reproduce it, and what someone could do with it. A proof of concept helps, but please:

- test only against your own account and your own families
- don't read, change or delete other people's data
- don't run anything that degrades the service for others (load tests, spam, automated scanning at volume)

## What happens next

We will reply within 5 business days, keep you posted while we fix it, and tell you when the fix is live. If you'd like credit, we will name you in the release notes once it ships.

## Scope

In scope: this code and the app at https://lumenlist.app.

Out of scope: third-party services we use (report those to the provider), and the old `*.vercel.app` address, which no longer serves the app.

Of particular interest is anything that lets a person see whether a gift on their own list has been claimed, or by whom. Keeping that secret is the core promise of LumenList.
