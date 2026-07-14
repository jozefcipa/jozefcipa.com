---
title: Introducing Novus - a local HTTPS proxy for better developer experience
tags:
  - api
  - novus
  - frontend
  - golang
  - scripting
  - https
date: '2024-06-12T22:07:23.030Z'
slug: novus-local-https-proxy-for-better-developer-experience
draft: false
---

![](https://assets.jozefcipa.com/blog/8a6ba01624e84ce481b998116ab9823d/banner.png)

Novus is a tiny command-line utility designed to enhance local web development. It consists of several tools to provide production-like web URLs on your local machine in a matter of seconds. You don’t have to bother by figuring out how to configure HTTP server, DNS resolutions or manage SSL certificates. Everything is handled by Novus so you can focus on your work.

Novus automatically configures everything for you, you just need to define the desired URLs and the respective [localhost](http://localhost/) addresses. Essentialy, Novus acts as a proxy that transforms your [localhost:3000](http://localhost:3000/) to a beautiful [https://your-domain.test](https://your-domain.test/) address.

This comes very handy when you have multiple services running locally, each operating on a port. Who’s supposed to remember which app has which port, after all 🤯. Also, if you switch between multiple projects using the same port it can be convenient to keep the browser history (and path suggestions) separated per project. Sometimes, using an HTTPS domain may be even required to make things work locally.

For all of these (and other) use-cases Novus is a great addition to your workflow, so if you want to try it out, you can install it by running the following commands

```shell
$ brew tap jozefcipa/novus
$ brew install novus
$ novus init
```

which will create a configuration file that looks similar to this

```yaml
appName: my-app
routes:
  - domain: my-frontend.test
    upstream: http://localhost:3000
  - domain: my-api.test
    upstream: http://localhost:4000
```

Once you have defined your URL configuration, you can start the proxy by running

```shell
$ novus serve
```

For more detailed instructions please refer to the project’s [GitHub](https://github.com/jozefcipa/novus) page.
