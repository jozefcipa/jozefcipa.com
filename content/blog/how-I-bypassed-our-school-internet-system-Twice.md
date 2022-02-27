---
title: How I bypassed our school internet system. Twice.
description: >-
  How I made a python script to remote turning on ports on switch to enable
  internet at our student’s dormitory after 11pm
date: '2017-12-15T18:04:39.914Z'
tags: [scripting]
# slug: /@jozefcipa/how-i-bypassed-our-school-internet-system-twice-ca6e9e61f016
---

![](/blog/img/1__Fgi4gcPnPS3Xc8cEAnGeLw.jpeg)

I live at student’s dormitory and we have got one rule here. Internet here turns off every day after 11pm. And it sucks 😏. So my roommate and I wanted to do something with that. We knew that internet is controlled via program which is located in computer in office downstairs. The goal was simple – edit configuration file of program. We had some information about how it works in advance.

In this article I’m gonna tell you how we did it.

### Februar 2017 — first try

As I mentioned we knew that they have program that is used to turn on internet (specifically, switch ports) after 11pm every day. So, one day we decided to go to “check it out”. We came downstairs and **logged in computer** was literally staring at us. After a while of hesitation we “hacked” to it and copied entire program directory. After a while of exploration we found magic file called `device_config.cfg`. Simple appending `"special": "true"` to our room has ensured that internet was working also after 11pm.

So we quickly.changed config file and returned it back to the computer. Everything worked fine whole week, until…

### We’ve been reported

**Yeah**, one guy(let’s call him Tom) reported us to headmaster. Fortunately for us, it went well so we ended up with task **to create two websites for school projects** ([juniorakademia.spse-po.sk](http://juniorakademia.spse-po.sk), [zssutaze.spse-po.sk](http://zssutaze.spse-po.sk) — only in Slovak, sorry).

#### Erasmus project and working summer

Finally came June and we went to UK for Erasmus (yeah, despite what we have done). Then I forgot about that and was enjoying summer and still working on updates and improvements for these two websites.

### November 2017 — second try

I started thinking about that same thing again — how to turn internet on after 11pm. It’s not like we needed the internet at night so much it was rather adrenaline that led me to do some “hacking”. And I immediately came up with an great idea…

#### Decompiling software

Since we already had that “stolen” program we were interested what does it look like. But when we launched it we were surprised with password form. There were also some config files but almost everything was encrypted. So we decided to try to decompile entire program. And guess what, we **succeeded**. Online decompilers forever 😂❤️. Then we were browsing individual classes until we found file called `DesEncrypter.java`. Maaaan, that was amazing, exactly what we needed, the rest you certainly know. So that’s how we **gained access credentials** for network switch.

Credentials were ready, origin software decompiled, the only remaining thing was to find out how controlling switch from application worked and make something similar. I decided for **Python** 🐍 and during one day I made entire script.

#### **Script description**

Script is supposed to be launched in 5 minutes intervals using [CRON](https://en.wikipedia.org/wiki/Cron). When it starts it first verifies if it should do some changes by sending one API request. If response is true, then it login to switch. As next it selects all ports from config file that have `alwaysTurnOn` flag and send TURN ON request to the switch. Then it chooses couple of random room groups (defined in `ROOM_GROUPS_COUNT` and do the same thing). All ports that have been turned on are also saved to file. Why? Because at 3am is scheduled another script that looks for these ports and turns them off so employee in charge should not notice anything weird. The last thing needed to finish this project was to load that program to microcomputer e.g. RaspberryPi and place it somewhere in school so the program would has internet connectivity all the time(internet in school is not turning off during nights)

For my disappointment and maybe also luck **it isn’t in use** because I want to finish school successfully. But **it works well**, trust me (of course I tried it out at least) 😉

You can check out code on [Github](https://github.com/jozefcipa/1nternat) as well as first mentioned [program](https://github.com/ptrstovka/spse-network-manager).

**\*** The funny thing is that I found that code on Github later, when we already had that program decompiled 😳

### BONUS — security bug !!!

When we were discovering administration of switch(TP-LINK) we accidentally found out very interesting thing. When you log in to the switch anyone else who is on the same network(obviously) and visits switch’s IP **is suddenly logged in as well**.

Weird, don’t you think?

Thanks for reading, hope you liked it.
