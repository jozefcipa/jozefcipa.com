---
title: Showing the active Firebase project in the command line
description: >-
  If you are working on a project where Firebase is used, most likely you have a
  separate project created for each environment (dev, staging…
date: '2021-01-09T00:09:06.306Z'
tags: [Firebase, scripting, utilities]
# slug: /@jozefcipa/showing-the-active-firebase-project-in-the-command-line-5ddac9fdf5c6
---

![](/blog/img/1__0mPtptlp6Vi4uzyAB0W5RQ.png)

If you are working on a project where Firebase is used, most likely you have a separate project created for each environment (`dev`, `staging`, `prod`, sometimes maybe even more). During the development, it often happens that you need to configure something using [Firebase CLI.](https://firebase.google.com/docs/cli) Whenever you intend to make a change you want to make sure the right project is set as active. This can be verified easily by running

```
$ firebase use
```

which returns something like this

![](/blog/img/1__4Ddq8BOGar42Sk2ePvgAZg.png)

This is good, but the command itself is a bit slow and also you might easily forget to run the command and verify the active project. Then it can happen that you start **deploying your temporary testing version of a** [**cloud function**](https://firebase.google.com/docs/functions) **to the production environment (!!!)**. After immediately canceling the script and getting over a little panic attack I knew this cannot happen again. At this point, I decided to create a little helper utility that would always show the currently selected project in the command line if you are in the project directory.

When you install [firebase-tools](https://firebase.google.com/docs/functions/get-started#set-up-node.js-and-the-firebase-cli) it creates a configuration file `~/.config/configstore/firebase-tools.json` which apart from other fields contains also a list of directories where som Firebase project is initialized.

```
...
"activeProjects": {  
  "/Users/jozefcipa/STRV/zoe-firebase-funtions": "development",  
  "/Users/jozefcipa/STRV/pumpkin-pie-backend-api": "pumpkinpiedev"  
 },  
...
```

When I found out about this I quickly realized I could use that to check if the current directory is contained in this list and if so, just show the value of it which equals to a currently selected project. I use **zsh shell** with [oh-my-zsh](https://ohmyz.sh/) installed, which provides plenty of customizations and utils, allows updating the default prompt and so in this case we can add a custom function that will show the active Firebase project.

#### Finding the active Firebase project

The idea is to take a current working directory (`pwd`), iterate through the `activeProjects` object and check if any of the directories is equal or a parent of the current directory. I didn’t want to use any programming language for this and just go with what command line utilities provide. I knew there is a library called [**jq**](https://stedolan.github.io/jq/), which is presented as _“a lightweight and flexible command-line JSON processor”._ After scratching my head for a few hours and trying to understand the syntax, I finally came up with a working solution that looks like the following.

{{< gist jozefcipa 34c98651cacb05afa1cc0a7572763981 >}}

To briefly describe what is going on here, first, we select the`activeProjects` field of the JSON file. Next, we convert this object into an array (`to_entries[]`), so we can process it further easier, and go through all the entries and check if the current directory is equal or starts with the path of a project. Once we have this we sort the array according to the length(`sort_by()`) in descending order (`reverse()`), just to make sure that if there are several projects with the same parent directory, we want to take the one that has the longest path (`.[0].value`), which means it is the most exact. For instance, if we have two projects like this

```
1) /Projects/STRV/ProjectA  
2) /Projects/STRV/ProjectA/SubProjectB
```

and we are currently in the `/Projects/STRV/ProjectA/SubProjectB` directory, we want to take a longer path. Even though such a situation is not very probable, it’s better to be ready for it and handle it properly. Also, as we use `startswith`, this will work also when we are deeper in the directory structure, not only for the exact match.

The whole function with the installation instructions can be found on [Github](https://github.com/jozefcipa/zsh-firebase-prompt).
