---
title: How to do Raspberry Pi OS backups
tags:
  - homelab
  - raspberry-pi
date: '2025-07-30T13:03:44.254Z'
slug: how-to-do-raspberry-pi-os-backups
draft: false
---

I recently got a Raspberry Pi Zero and started configuring it for a personal project. As I was setting everything up I realized how much time and effort I was investing. That’s when it hit me: microSD cards, which the Pi relies on for storage, aren't exactly known for their durability under heavy I/O. A sudden failure could mean losing everything. To avoid starting from scratch in the future, I decided to create a full backup of the system, including all configurations and data.

I’ve never done this before so I did some research and it turns out it’s not that complicated at all. We will use a command-line utility `dd` that **copies raw data** from one place to another — typically block devices, files, or streams. It doesn’t care about filesystems or file structures — it just **moves bytes**.

In order to do so, first we need to locate our memory card in the system.

```shell
$ diskutil list
```

This command returns a list of volumes where we can find our SD card (in my case it’s `/dev/disk4`).

Next, we need to unmount the disk.

```shell
$ diskutil unmountDisk /dev/rdisk4
```

Cool, now we can go ahead and use the `dd` command to copy the data from the microSD card to an `.img` file that will be our OS image. Notice I’m using the `**r**disk4` which provides access to the raw data and thus the copying will be much faster.

```shell
sudo dd if=/dev/rdisk4 of=/tmp/raspi-backup.img bs=4m status=progress
```

It will take some time to finish but once it’s done, you can check the size of the generated backup file.

```shell
 $ du -h raspi-backup.img
 15G	raspi-backup.img
```

Considering that you use a 16GB microSD card, the image size will now **match the size of the SD card** even if the most of it is just empty blocks.

This is obviously not ideal, but luckily there are ways to optimize it. That’s why we will use the tool called [PiShrink](https://github.com/Drewsif/PiShrink/) to reduce the size of the image. (_If you’re on Mac Silicon like me, follow the steps described_ _[here](https://github.com/Drewsif/PiShrink/issues/326)__, otherwise, the official docs should work_).

First we need to build an image (follow the steps in the project’s README) and then run

```shell
docker run --rm --platform linux/arm64 \
    --privileged -v "$PWD":/workdir \
    pishrink -zv raspi-backup.img raspi.shrink.img
```

PiShrink removes empty space from the image file and then it GZIP compresses the output file to reduce the size even more. Once it finishes, you should see something like this at the bottom of the logs.

```shell
...
pishrink: Shrunk raspi.shrink.img.gz from 15G to 1.1G
```

This is great! Now you can save your backup file somewhere and have it handy if needed in the future.

However, as you could see this approach works well but the output image has the same size as the microSD card, so this solution might not be ideal for larger cards (64GB+) as it will be very memory inefficient.

In that case you could try one of the following alternatives that sound promising, but I haven’t tried them personally.

-   Use `partclone` or `fsarchiver` utilities to only copy the used filesystem blocks.

-   Use `rsync` to only copy files and data. This might be very error-prone method as you will have to manually copy everything that you deem important. Also, it will only copy the files, not the entire OS, so it entails a lot of manual work, depending on the size of data that you have.

-   Use `gparted` or `resize2fs` utility to shrink the root partition first. Then you can use `dd` as showed in this article. This could be the potential solution for the larger cards, as it allows you to only back up the actual data.
