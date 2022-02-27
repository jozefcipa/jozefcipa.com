---
title: Sending exceptions to mail in Laravel
description: >-
  Update 2019: This article was written at the time when I didn’t have a lot of
  knowledge about error handling, system architecture and…
date: '2017-11-09T16:37:42.614Z'
tags: [Laravel]
---

**Update 2019:** _This article was written at the time when I didn’t have a lot of knowledge about error handling, system architecture and common practices in general. It is definitely_ **_not a recommended solution_** _for tracking application errors. There are many better ways for handling these situations (e.g._ [_Sentry_](https://sentry.io/)_)._

When you are developing a website you always try to fix all bugs and potential errors. In the development environment when you get an exception, you find a cause, fix it and it’s done.

Once when the website is completed, you deploy it and then hope that everything will work fine. But there is always a chance that some hidden bugs will be there. It even has not to be a bug. It may be some other kind of problem you didn’t even think about. What if the database will drop, or some 3rd party API service will be unavailable for a while, or whatever else.

I know, you should think about that state and handle it, but what if…

Anyway, there’s still a chance that something will cause an exception in production and you won’t know about it.

Normally it could last hours or even a couple of days until you would notice that something is broken. For larger projects, there are tools for handling this error reporting such as [Sentry](https://sentry.com) or similar.

But for small websites, this approach would be an overkill.

**Update 2019:** Sentry is definitely not overkilled. Please use it everywhere where you want to keep track of your bugs.

Recently I faced the same problem and I figured it could be cool to notify me about any exception on the website by email.

So now I’m going to show you **how to send exceptions to mail.** So how to do it?

File _app/Exceptions/Handler.php_ contains functions _report()_ and _render()_ which are used if you want to **customize** **default** **exceptions handling**.

So **first we update** _report()_ function to send an email when an exception occurs. **Note** that we only want to send emails in **production** mode!

Then we need to create [mailable class](https://laravel.com/docs/5.5/mail#writing-mailables) _ExceptionOccured._

After that, we create **HTML template** for email. Since we will use default laravel exception html code, our template will be just showing that html.

**Note:** This will be **only** **working for unhandled** exceptions!

If we want to send an email also for exceptions that we handle in _try-catch_ block we can do this:

Demo:

![](/blog/img/1____V__D__jDUr8ijxFpkMqNtGQ.png)
![](/blog/img/1__CpoiYHq5YiVoZyvAmgRnmg.png)

Hope you liked this article and you’ll find this useful in your projects.
