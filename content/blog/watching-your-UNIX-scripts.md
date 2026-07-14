---
title: Watching your UNIX scripts
description: >-
  In one project I needed to run Laravel queue:work for sending emails on
  production. The problem was that sometimes it quit silently and…
date: '2018-01-30T10:53:23.378Z'
tags:
  - scripting
summary: >-
  Maintaining long-running background processes can be a challenge in restricted
  hosting environments where traditional supervisor tools are unavailable. A
  lightweight bash script can effectively monitor command execution and ensure
  processes restart automatically upon failure. This approach provides a simple,
  dependency-free method to maintain service reliability without requiring extra
  infrastructure.
cover: >-
  https://assets.jozefcipa.com/blog/watching-your-UNIX-scripts/cover-1784027890518.png
---

In one project I needed to run the Laravel's `queue:work` command for sending emails on production. The problem was that sometimes it quit silently and emails were accumulating in database. To solve it you would probably install program like [**supervisord**](http://supervisord.org/) or similar.

But, the thing is that you **don’t always** have a possibility to install that program for example like when you are on hosting (my case). To solve this we can simply use **bash script**.

{{< gist jozefcipa 78a68bcd0e837baaed71c0ce6b0268f6 >}}

In this short article I wanted to share solution that I’m using so maybe someone will find it useful.
