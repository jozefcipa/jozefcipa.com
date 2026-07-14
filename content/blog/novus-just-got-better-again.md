---
title: Novus just got better (again)
tags:
  - api
  - novus
  - frontend
  - golang
  - scripting
  - https
date: '2025-01-16T08:36:29.475Z'
slug: novus-just-got-better-again
draft: false
summary: >-
  The latest release of Novus introduces a new command designed to streamline
  administrative tasks by enabling passwordless sudo access with security
  constraints. This update also adds improved operational transparency, helpful
  UI feedback for long-running processes, and support for quick domain
  definitions. These enhancements aim to refine the development workflow for
  those managing local server environments.
cover: >-
  https://assets.jozefcipa.com/blog/novus-just-got-better-again/cover-1784027735447.png
---

After a couple of months since the last release, here I am again, announcing a new updated version of Novus - [v0.0.5](https://github.com/jozefcipa/novus/releases/tag/v0.0.5).

This version includes new features and minor enhancements, but most importantly, it introduces the `**trust**` **command—**something I have wanted to have since the very beginning.

This command creates a `sudoers` file that grants Novus passwordless sudo privileges. This means the annoying password prompt showing up whenever you want to restart or update your Novus configuration will no longer pop up.

![](https://assets.jozefcipa.com/blog/17077955515e808aa489d4c04c2c3078/novus_password.png)

But worry not, while this may sound like a potential vulnerability threat, this feature was built with security in mind. The scope of the passwordless sudo access is limited to the commands and filesystem directories Novus directly uses, so the rest remains still protected by a password.

If you are curious about how this is implemented, read more in this [article](https://jozefcipa.com/blog/how-to-use-sudo-without-a-password-in-your-programs/) or check out the [code](https://github.com/jozefcipa/novus/blob/main/assets/sudo-helper.template.sh).

This feature is completely optional to use, so it’s only up to you to decide if you want to improve your developer experience by not having to type the password every time. Also, whenever you want, you can revoke the _sudoers_ access by running `novus trust --revoke`.  
  
I’m really excited about this one.

<video src="https://assets.jozefcipa.com/blog/17077955515e808aa489d4c04c2c3078/novus_trust.mp4" autoplay muted loop></video>

Moreover, Novus v0.0.5 adds **more transparency** when it asks for _**sudo**_ **password** by printing additional logs whenever such an operation occurs, so the user knows what exactly is going on under the hood.

There has also been a minor UI improvement when it comes to the long-running operations, e.g. when restarting Nginx. Novus now shows a **loading animation** to better communicate the ongoing activity to the user.

Last but not least, this version comes with the support for the so-called “**inline domains**”, that you can quickly define without needing to define them in the _novus.yml_ configuration file. You can now serve your domain directly using `novus serve [domain] [upstream]`.

```javascript
$ novus serve my-domain.test http://localhost:3000
```

This feature is very handy for single domains and improves efficiency even more. Similarly, to remove such a domain, you can use the already existing `novus remove` command.

```javascript
$ novus remove my-domain.test
```

And that's all for now. Go ahead and update [Novus](https://github.com/jozefcipa/novus) to enjoy an even better development experience!

```javascript
$ brew update
$ brew upgrade novus
```
