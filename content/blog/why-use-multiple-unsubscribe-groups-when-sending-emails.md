---
title: Why use multiple unsubscribe groups when sending emails
tags:
  - today-i-learned
date: '2022-06-27T17:09:56.605Z'
slug: why-use-multiple-unsubscribe-groups-when-sending-emails
summary: >-
  We all know how annoying all those emails that we receive from various
  websites might be, especially when we don’t expect them. So naturally, there
  should be an option to unsubscribe. However there are some things that you
  have to be careful about.
draft: false
---

![unsplash.com/@brett_jordan](https://images.unsplash.com/photo-1596526131083-e8c633c948d2?ixlib=rb-1.2.1&q=80&cs=tinysrgb&fm=jpg&crop=entropy)

We all know how annoying all those emails that we receive from various websites might be, especially when we don’t expect them. So naturally, there should be an option to unsubscribe (it’s even enforced by law in some countries). A few times, it happened that even though I clicked on the unsubscribe button, the emails were still coming. So apparently, either the website doesn’t care about your opinion to opt out or something is not working correctly on their side. A different issue is if it works too well - what does it mean?

## Email types

There are two types of emails that a website usually sends - **transactional** and **marketing** emails. The difference is simple: while marketing emails serve marketing purposes, such as newsletters, discounts or offers and so on, transactional emails tend to have a more important role. If you ever forgot your password and had to reset it, you most probably received an email with the reset link. If you order something cool, there is almost always a confirmation email arriving in your inbox. As you can see some emails are more important than others. Also, marketing emails must be optional, in other words, there must be a way for a receiver to stop receiving them.

## Sending emails

In order to send emails from your website, you must choose a service provider first. There are many you can choose from, such as [Amazon SES,](https://aws.amazon.com/ses/) [Mailgun](https://www.mailgun.com/), **[SendGrid](https://sendgrid.com/)** and others. They provide useful APIs and tools for you to send emails, track receivers and collect analytics, some of them even support creating marketing campaigns and more.

But, no matter which provider you use, they will most probably have a concept of the [**unsubscribe groups**](https://docs.sendgrid.com/api-reference/suppressions-unsubscribe-groups).

## The issue and the solution

_Even though it might all sound very obvious, I wouldn’t be writing this post if there wasn’t an issue in the past caused exactly by that._

The problem we had on one of the projects was that some users were complaining that they didn’t receive the email they were expecting, a password reset email in this case. Debugging this was a bit difficult as the issue was only experienced by a small group of people and it was hard to tell what they have in common. Finally, we found the culprit and guess what it was. The application used one unsubscribe group for all the emails. Therefore, as mentioned at the beginning of this post, if the user unsubscribed from some email in the past, they would no longer get the password reset email or any similar 😬.

This issue originated at the beginning of the project when one cannot know possible scenarios or ways the project will go in the future. Therefore there was only one default unsubscribe group used for all the emails. As the application was evolving and new email notifications were added, it could easily be overlooked to check if this one unsubscribe group is still enough or if more should be added.

The fix for that was easy and straightforward, we just had to create a new unsubscribe group (ASM in SendGrid) and use it for all transactional emails. Also for these types of emails, you don’t have to (shouldn’t) provide an unsubscribe link in the email body. This way your users can still unsubscribe from the marketing emails if they are not interested but they will still receive all important system emails 💯.

![Configure ASM group when sending email](https://assets.jozefcipa.com/blog/430360d33b1c462dba7b276277e80a9d/example.png)
