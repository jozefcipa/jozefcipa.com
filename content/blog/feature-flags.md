---
title: "Feature Flags"
date: 2022-01-12T00:41:17+01:00
tags: [today-i-learned]
draft: false
---

#### What are feature flags?
In two words - *"if statements"*.

No, but seriously feature flags are a very simple, yet very powerful tool that can find its place in many projects.
The idea is to be able to control certain critical parts or essentially any relevant logical parts of the code and say if they should be enabled or not.
Simple as that but it brings a lot of advantages.

#### What was the issue?
The initial reason for realizing and writing down this [#TodayILearned](/tags/today-i-learned) tip was when I was working on a project where we had a third-party service for image detection.
The service was implemented and ran with no issues for some time but one day we started noticing lots of errors in the application.
We soon learned there was some issue with billing, so the service stopped working and kept returning errors. As there was no feature flag implemented,
the team had to prepare a hotfix release that would disable the service. If we had a feature flag in place, it would be a matter of changing a config value.

#### Implementing a feature flag
As mentioned in the beginning, implementing a feature flag could be as easy as defining an if statement.
The code below is a perfect example of a simple feature flag implementation. We just surround the logic we want to control with a condition.

![](/blog/img/feature-flags-1.png)

The only question now is where to get the desired value from?
It must be something that doesn't require any action to the code and can be updated comfortably.

Typical case would be using **environment variables** for that. This approach has one drawback and that is that environment variable are usually loaded on the application startup, so changing such a variable could require a restart of the application.

Another option is to use a **database**. This is more suitable for scenarios where the feature is enabled per e.g. specific customer. It can be still updated manually if it's a one time thing (for example depending on their subscription plan) or it could be part of some administrator dashboard. This type of feature flags proved to work very well too. One thing I would recommend here is to **use timestamp** column instead of a simple boolean, i.e. prefer `enabledAt: 2022-01-12` rather than `enabled: true`. It holds additional value which can be sometimes very useful (*again, speaking from personal experience*).

If you need a more sophisticated solution, there are **third-party services** that can help with that, such as [LaunchDarkly](https://launchdarkly.com/) or [Optimizely](https://www.optimizely.com/).
Apart from a nice UI for managing your flags, these services provide a ton of extra features to help you with experiments like A/B testing, canary releases, gradual releases, gathering feedback and many more.

Important part comes when the temporary feature-flagged code proves to work as expected.
At this point, such a feature flag becomes obsolete and for the sake of a code cleanliness,
we should try to remove it. In fact, we should always find time to revise old feature flags and **remove them if no longer needed**.
