---
title: Monitoring your website with Upptime
tags:
  - api
  - frontend
  - today-i-learned
date: '2025-02-02T22:39:27.337Z'
slug: monitoring-your-website-with-upptime
draft: false
---

Recently I’ve encountered an unpleasant situation on one of the websites I manage. I randomly opened it only to find out it wasn’t working. Unfortunately, it was not a very important website, so no harm was done but the problem was that I didn’t know for how long it had been down. This is unacceptable, especially for the important websites that cannot go down.

Therefore, I did research on some tools that would help me with monitoring the website status and notify me when something goes south again in the future.

I came across an **open-source** tool called [Upptime](https://upptime.js.org/), a monitoring solution that you can easily configure to constantly monitor the specified HTTP endpoints. It is **Github-based**, which means you can easily clone the [repository](https://github.com/upptime/upptime) by clicking on the “_Use this template_”. It uses **Github Actions** for constantly checking the configured endpoints and then commits the results back to your Git repository 💯.

By default, it checks the website **every 5 minutes** and commits a daily report once a day, but this is configurable. Whenever your website goes down or is unresponsive, Upptime creates a new **GitHub issue** and sends you a notification. There are several channels that you can configure for receiving those alerts, such as **Slack**, **Telegram**, **email**, or even **SMS**.

It comes with a static **status page** that reads the data from your repository and you can freely customize it as you like. It can look similar to this and can be easily deployed to **Github Pages**, for instance.

![](https://assets.jozefcipa.com/blog/17077955515e801f8184eb8fd6ca7d7c/status-page.png)

Check out their [getting started](https://upptime.js.org/docs/get-started) guide and follow all the steps to set it up. The whole process is super straightforward and doesn’t take more than half an hour to complete.

And after that, you can start sleeping without worries again 😁.
