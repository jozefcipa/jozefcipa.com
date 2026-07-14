---
title: "Novus v0.0.4 released \U0001F680"
tags:
  - api
  - novus
  - frontend
  - golang
  - scripting
  - https
date: '2024-11-14T15:58:48.503Z'
slug: novus-v0-0-4-released
draft: false
summary: >-
  This release of the local HTTPS proxy tool introduces a web-based dashboard
  and improved service management to simplify development workflows. The update
  resolves configuration validation issues and refines how background services
  are monitored and restarted. Users can now enjoy a more robust interface and
  better error handling when setting up local development domains.
cover: >-
  https://assets.jozefcipa.com/blog/novus-v0-0-4-released/cover-1784027759407.png
---

Ever since [releasing](https://jozefcipa.com/blog/novus-local-https-proxy-for-better-developer-experience/) the first version of the binary, I knew there were more things I wanted to add and improve in _Novus_. There have been a couple of smaller releases since then, but it was only bug fixes I stumbled across while using the binary.

Finally, the time for a bigger release has come and version 0.0.4 adds, apart from the bug fixes and minor improvements, also some new features that I believe will enhance the developer experience even more.

## What’s new?

**Internal dashboard**

First of all, let’s talk about the dashboard. Previously, if you wanted to see what routes were actively configured within _Novus_ you would have to go into the terminal and run `novus status` which would show you a table similar to this:

![](https://assets.jozefcipa.com/blog/13d77955515e8036894cd7eca2739e7e/cli.png)

Now, version v0.0.4 introduces a website [index.novus](https://index.novus/) which presents the same information directly in your browser, so you can always quickly check what’s currently running before having to go to the terminal.

Yay!

![](https://assets.jozefcipa.com/blog/13d77955515e8036894cd7eca2739e7e/web.png)

**Detect existing top-level domains (TLDs)**

Previously, when you configured your routes in the _novus.yml_ file, there were no restrictions on what the URL could look like.

If you were (by any chance) building your own Google, you could configure your _novus.yml_ like this:

```yaml
appName: my-google
routes:
  - domain: google.com
    upstream: http://localhost:3000
```

While _Novus_ could handle this and [google.com](http://google.com/) would point to [localhost:3000](http://localhost:3000/), this would also impact all other `.com` domains publicly available on the internet. That means, your computer would no longer resolve `[instagram.com](http://instagram.com/)` nor `[github.com](http://github.com/)` as _Novus_ configured `.com` TLD to be resolved by the locally running DNSMasq instance. No bueno!

This is now fixed by improving the input config file validation and TLD domains are forbidden, so you can no longer define a route ending with an existing TLD domain.

Instead, you should choose a prefix that is not publicly registered - a good example would be `.test`.

**Updated error pages**

_Novus_ has had custom error pages since the very beginning, so when you navigate to an unknown route it would show a nice 404 page instead of the default Nginx error page. Similarly, if a route exists but the upstream server is not running, Nginx returns a 502 error.

With this release, these pages got a new fresh look. But you will have to see them for yourself 😉. Furthermore, the 502 error page now continuously checks whether the upstream connection has been restored and automatically reloads the page.

**Better Nginx & DNSMasq control**

Before, it could happen that a service (Nginx, DNSMasq) was restarted but the websites wouldn’t work. _Novus_ would say that everything had been restarted properly and was running again. This was because it didn’t check whether the service started properly. This could typically happen when there was a configuration error in Nginx (during development) or when a TCP port was already used by another service. In such cases, the service would error out silently.

This is now fixed by checking the service status and verifying it is running after restarting. Moreover, _Novus_ will always check whether the ports are available before starting a service.

**Using an alternative DNS port**

In addition to the previous point, in some environments, the DNS port 53 might be utilized by a different service. This means that the DNSMasq service fails to start and instead exits silently as described above.

To mitigate this issue _Novus_ now uses an alternative port (5053) for the DNS service.

**Added** `**start**` **command**

The first version of _Novus_ already came with the `stop` command that allows you to quickly shut down Nginx and DNSMasq if needed. However, there was no command to start the services again. You would have to go to a specific directory with the _novus.yml_ file inside and call `novus serve` which would go through the whole process of reading the config, evaluating routes, and starting the services.

Now, there is a better alternative - _Novus v0.0.4_ adds the `start` command that only starts Nginx and DNSMasq services and doesn’t need the config file present, which means you can now start and stop _Novus_ from any directory.

**Improved validation messages**

When working on the first version, I didn’t bother too much to make the validation errors super nice, instead, I relied on the default messages provided by the validation library.

While working on the new version, I could no longer neglect this important part of the developer experience. Therefore, v0.0.4 now brings more developer-friendly error messages when validating the _novus.yml_ config file.

## **How to update**

As this project is still evolving and doesn’t have a stable version at the moment, breaking changes between the releases are to be expected and backward compatibility is not guaranteed!

This version contains some changes in the internal state file, therefore it needs to be recreated by _Novus._

That means you should remove all your apps, remove the old version, install the new version, and add the apps again.

```bash
# Uninstall the old version
$ novus remove [app] # Run for all your apps
$ brew uninstall novus
$ brew untap jozefcipa/novus

# Install the new version
$ brew tap jozefcipa/novus
$ brew install novus
```

Sorry for the inconvenience, I’m sure the future releases will become more stable.

If you’re still curious and want to see the changes in detail, refer to the [release v0.0.4](https://github.com/jozefcipa/novus/releases/tag/v0.0.4) on GitHub, and by the way, there are already several ideas for v0.0.5, so stay tuned!
