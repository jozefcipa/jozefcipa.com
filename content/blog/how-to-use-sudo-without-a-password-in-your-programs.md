---
title: How to use sudo without a password in your programs
tags:
  - golang
  - scripting
date: '2025-01-14T19:51:47.208Z'
slug: how-to-use-sudo-without-a-password-in-your-programs
draft: false
summary: >-
  Automating tasks that require elevated privileges often leads to repetitive
  and annoying password prompts. By configuring specific entries in the sudoers
  file, developers can enable password-less execution for targeted scripts or
  binaries. This approach requires careful implementation to prevent security
  vulnerabilities and privilege escalation risks.
cover: >-
  https://assets.jozefcipa.com/blog/how-to-use-sudo-without-a-password-in-your-programs/cover-1784027665731.png
---

When writing software, sometimes it is necessary to run shell commands that require sudo privileges. This can happen, for instance, when building a CLI tool that needs to write into protected filesystem directories or modify certain files. Such commands are usually prepended with the `sudo` keyword which is then followed by a password prompt. This is very important from the security perspective, so the OS can protect sensitive data. However, sometimes it might become annoying when using a tool that constantly asks for a password.

Luckily, there’s a solution for that - a `sudoers` file.

## What is a sudoers file?

The _sudoers_ file is a special configuration file in Linux (and macOS) that controls who can use the `sudo` command and what commands are they allowed to run with superuser (`root`) privileges. This configuration is located in the `/etc/sudoers` file or it can consist of multiple files created in the `/etc/sudoers.d` directory.

Using this file we can allow or deny specific users (or groups) to run certain commands, manage _sudo_ access, grant password-less access, etc.  
In this article, we will explore the last mentioned option - password-less  
_sudo_ access.

## Let’s see it in practice

We can demonstrate the power of _sudoers_ in the following example. Let’s say we want to see whether port 80 is used on our machine. For that, we can use the `lsof` command:

```bash
$ sudo lsof -nP -i4:80
Password:
```

As expected, this results in a _sudo_ password prompt (_Note: you can also use_ _`lsof`_ _without sudo but then you will only see your processes_).

Now, let’s create a test _sudoers_ file. Note, that it is important to always edit the _sudoers_ file with `visudo` as it always verifies the syntax of the file. Otherwise, it can happen that a mistake in _sudoers_ may cause _sudo_ to stop working.

```bash
$ sudo visudo /etc/sudoers.d/test
```

And put the following config inside:

```bash
jozefcipa ALL=(ALL) NOPASSWD: /usr/sbin/lsof
```

This says that the user `jozefcipa` can run `/usr/sbin/lsof` command without the _sudo_ password. If we run the command again, we should get the result without being asked for the password.

```bash
$ sudo lsof -nP -i4:80
COMMAND   PID      USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
nginx   30212 jozefcipa    9u  IPv4 0xf57eb0bdeadfecb1      0t0  TCP *:80 (LISTEN)
```

That was quite easy, but this configuration is also dangerous. In this particular example, it shouldn’t do any harm as it only reads data, but imagine if we allowed the `rm` command instead. Suddenly, everything could be deleted without a password, as we globally allowed it (for that user). Most of the time you will want to allow password-less access only for a specific program.

Let’s write a simple program in Go that reads network port usage:

```go
// lsof-go.go
package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	out, err := exec.Command("sudo", "lsof", "-nP", "-i4:80").Output()
	if err != nil {
		os.Exit(1) // error
	}

	fmt.Println(string(out))
}
```

Next, build and run the code. You should see the same output as before.

```bash
$ go build lsof-go.go
$ ./lsof-go
COMMAND   PID      USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
nginx   30212 jozefcipa    9u  IPv4 0xf57eb0bdeadfecb1      0t0  TCP *:80 (LISTEN)
```

## Adding our binary to sudoers

Now, that we have our Go binary, we will update the _sudoers_ file to allow password-less _sudo_ for the binary only, instead of allowing `lsof` globally. We will do that again by using `visudo`.

```bash
$ sudo visudo /etc/sudoers.d/test
```

And change the file’s content to this:

```bash
jozefcipa ALL=(ALL) NOPASSWD: /path/to/your/lsof-go
```

We registered our `lsof-go` binary in the _sudoers_ file, so when we call `sudo ./lsof-go` it will give us the same result, but calling `sudo lsof` will require a password. This is because now the `lsof` command is no longer registered in the _sudoers_ file, but `lsof-go` binary has password-less _sudo_ access.

```bash
$ sudo ./lsof-go
COMMAND   PID      USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
nginx   30212 jozefcipa    9u  IPv4 0xf57eb0bdeadfecb1      0t0  TCP *:80 (LISTEN)

$ sudo lsof -nP -i4:80
Password:
```

Note that we have to run our binary with `sudo`. This is, naturally, needed as otherwise _sudoers_ wouldn’t be used.

However, this solution also has its downside. We successfully limited the scope of password-less access only to our `lsof-go` binary, but now we’re running the whole binary as `root`. This may be a problem when working on a larger application as all the commands will be run with the `root` privileges which is not only undesired but also dangerous (yeah, here we go again).

Instead, we should only use _sudo_ when necessary and still prefer a regular command version for the rest.

## Creating a helper script

We can extract the `lsof` command from our code into a new shell script. Then, we update the _sudoers_ file again, and this time replace the `lsof-go` binary with the helper script. This script will now have password-less _sudo_ privileges.

This allows us to keep running the `lsof-go` binary without `sudo` and whenever the code needs `root` privileges, it will call the `lsof-helper.sh` script (_Note_: don’t forget to _first run_ _`chmod +x lsof-helper.sh`_ _to make the script executable_).

```bash
#!/bin/bash

sudo lsof -nP -i4:80
```

Now, in our Go code, we can update the command execution line as follows:

```go
out, err := exec.Command("sudo", "./lsof-helper.sh").Output()
```

However, there is one serious security vulnerability with this approach. Can you tell what is wrong?

## Securing the helper script

If we open the helper script in a text editor, nothing stops us from modifying the file as we like. This is very dangerous as it poses a security vulnerability in our system, so a potential attacker could rewrite the file and add custom commands. That would result in gaining sudo privileges, as the `~/sudo-helper` file is registered in the _sudoers_ file, so it has _root_ access and so do all the commands it calls internally (!). Therefore, we must protect the file by forbidding any modifications by users. This can be easily done by setting the file owner to `root`:

```bash
$ sudo chown root ~/sudo-helper
```

Now, if anyone wants to modify the file, they will have to enter a _sudo_ password first. That means that our helper file is protected from abuse and will only have _sudo_ access to the command that we have defined.

> _**Note**__: Laravel Valet is a tool for PHP developers that creates real URLs instead of using_ _[localhost](http://localhost/)_ _in the local environment. It uses a similar technique that we describe in this article, but with one significant difference - it_ _**does not protect**_ _the shell script. This means, as we could just see, everyone that installs Valet and uses the_ _`trust`_ _command becomes vulnerable to the_ _**privileges escalation**_ _threat!  
> I reported this on their Github but so far I haven’t received any answer._  
>   
> _Thus, this may be the best time to try out a new kid on the block -_ _**Novus**_ _- a local HTTPS proxy for a delightful developer experience that is language agnostic (no PHP ties), secure and fun to use. Go check it out on_ _[Github](https://github.com/jozefcipa/novus)__._

## Revoking access

As granting sudo permissions, even though only in a limited scope, still weakens the overall security, it is always a good idea to provide a way for the users to opt_\-_out, e.g. by defining a revoke command that will remove the sudoers configuration file, so the _sudo_ password prompt will reappear.

## That’s a wrap

In this article, we learned about the _sudoers_ file and explored ways to allow password-less _sudo_ access in our programs. We also discussed what vulnerabilities it exposes if not handled carefully and how to resolve them to not compromise the operating system security.

I also implemented this in my open-source tool [Novus](https://github.com/jozefcipa/novus), so if you are curious about the internal details, make sure to check out how I implemented it there in the `trust` [command](https://github.com/jozefcipa/novus/blob/main/cmd/trust.go).
