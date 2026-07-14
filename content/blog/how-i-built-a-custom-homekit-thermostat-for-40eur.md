---
title: How I built a custom Homekit thermostat for 40€
tags:
  - c
  - homekit
  - iot
  - esp32
  - lvgl
  - apple
  - diy
date: '2025-03-09T18:22:16.399Z'
slug: how-i-built-a-custom-homekit-thermostat-for-40eur
draft: false
summary: >-
  This project explores the development of a custom, budget-friendly smart
  thermostat that integrates directly with HomeKit. The device features a
  touchscreen interface for local control and provides real-time temperature
  monitoring while managing boiler heating cycles. It demonstrates the technical
  challenges and practical implementation of embedding networking, UI libraries,
  and hardware control on a microprocessor.
cover: >-
  https://assets.jozefcipa.com/blog/how-i-built-a-custom-homekit-thermostat-for-40eur/cover-1784027956126.png
---

<video src="https://assets.jozefcipa.com/blog/12677955515e8037be53e7832bb10412/thermostat.mp4" autoplay muted controls></video>

I wanted a smart HomeKit thermostat for a long time. The only problem is that it is quite expensive so I never bought one. Last year, [Espressif](https://www.espressif.com/) organized an introductory workshop to familiarize people with ESP32. I’ve heard about this board before but didn’t know what exactly it was and never really played with it. So I signed up for the workshop to get hands-on experience with the chip. If you don’t know what ESP32 is, you can think of it as something between Arduino and Raspberry Pi - a microprocessor that you can program in C with GPIO pins, WiFi and Bluetooth connectivity.

Some time after the workshop, I got an idea to try to make my own thermostat using the ESP32 chip I got from the event. I saw this as a great opportunity to deepen my knowledge about this board and at the same time build something useful.

## The idea

The main thing was to define a goal - what exactly do I want my thermostat to be capable of and how should it work. Obviously, it has to be **HomeKit compatible**, so I can control it with my iPhone. Also, once I mount it on the wall, it would be nice to have **instant visual feedback** to see the current room temperature and heating state. Also, anyone should be able to **control the temperature directly** via the thermostat. That means the thermostat needs to have an **LCD screen.** Moreover, since I want to be able to interact with it to change the temperature, it has to provide some user interface. I decided to use a **touch screen** as I wanted to avoid adding a bunch of physical buttons. And it also feels more natural nowadays. Besides, why not bring on another challenge for myself 😅. Obviously, I can’t forget a **temperature sensor** and a **[relay](https://en.wikipedia.org/wiki/Relay)** to control a boiler.

## HomeKit

HomeKit is the heart of the whole thermostat, without it the project wouldn’t be possible. That means I had to find a library that would implement the protocol.

There is one library called [Homespan](https://github.com/HomeSpan/HomeSpan/), but this is intended for programming ESP32 in the Arduino environment. This is much easier and beginner friendly, but I wanted something more advanced and challenging :). As I said in the beginning, I wanted to get more familiar with the ESP32 environment and the [arduino-esp32](https://github.com/espressif/arduino-esp32) project offers a lot of abstractions. That’s why I opted for the [ESP-IDF framework](https://idf.espressif.com/) instead.

Luckily, there is a great [HomeKit library](https://github.com/AchimPieters/esp32-homekit) built by [Achim Pieters](https://www.studiopieters.nl/). It comes with a ton of examples, probably for every possible HomeKit appliance, so implementing not only a thermostat but also anything else becomes much easier.

After installing and setting up the library, it will start a HomeKit server on the ESP32 and wait for connections from your iOS Home app. Then you will need to generate a QR code as you might know from other smart devices and scan it to add it to your Home app. The QR code generator is a part of the library, so it is very simple to make one.

Unfortunately, since this is a custom, [MFi uncertified](https://mfi.apple.com/) product, Apple doesn't support configuring WiFi network in the same step as adding the device to the Home app. Therefore, you will need to scan two QR codes, first, one to set the WiFi network, and then another one for registering the device with the Home app. We’ll talk more about the WiFi QR code later.

## Measuring temperature

Measuring temperature is an important part of every thermostat. In this project, I chose the [SHT-40](https://www.laskakit.cz/en/laskakit-sht40-senzor-teploty-a-vlhkosti-vzduchu/) sensor that is cheap but still fairly accurate. Apart from temperature, it can also measure humidity, so this comes in handy too. The sensor communicates with the board via [I2C](https://en.wikipedia.org/wiki/I²C) interface. In this project, the temperature is measured in 10 minute intervals.

## **Controlling a boiler**

If the thermostat evaluates the current room temperature as too low compared to the set target temperature, it will turn on a boiler. To do so, we need a relay that will be switching the boiler on and off. In our case, this will be a [5V relay](https://www.laskakit.cz/en/1-kanal-5v-rele-modul-s-optickym-oddelenim--high-low-level--250vac-10a/) with the max load of 250VAC/10A.

## **LCD**

I picked the [240x320” TFT display](https://www.laskakit.cz/en/2-4--palcovy-barevny-dotykovy-tft-lcd-displej-240x320-ili9341-spi/) with the touch support. It communicates with the board via [SPI](https://en.wikipedia.org/wiki/Serial_Peripheral_Interface) interface and both display and the touch screen share the same connection. This was quite a challenge to make it work and it took me some time and a lot of head-scratching but eventually I figured it out.

## **Building the UI**

The display is connected but the real fun just begins now. I needed to figure out how to create and show GUI elements on the display, and put it all in a nice layout. Not to mention, I had to find a way to connect those UI elements with the touch screen.

Luckily, there is this awesome graphics library for the embedded devices called [LVGL](https://lvgl.io/). It is very intuitive and easy to use. Moreover, it is inspired by CSS, so it was surprisingly easy to use. But the initial setup and connecting the UI with the LCD screen was quite a challenge.

Here you can see the diagram of the thermostat GUI. Eventually I ended up creating three different screens for handling various states of the thermostat.

![](https://assets.jozefcipa.com/blog/12677955515e8037be53e7832bb10412/gui-flow.png)

## Showing current time

Since we already have the display that shows the room temperature and will be mounted on a wall, I thought it would be cool to also display the current time and date.

For that, I used the [NTP](https://en.wikipedia.org/wiki/Network_Time_Protocol) protocol that fetches the current time from the internet servers and sets the local clock based on the configured timezone. Then I just created a task that updates the screen with the new time every minute.

## **WiFi provisioning**

I’m a perfectionist and even though hardcoding the WiFi credentials was the easiest way, I was thinking of the future and the last thing I want to do is having to reprogram the device once the WiFi network or password changes 😅. That is why I made extra effort to set up automatic WiFi provisioning.

The way it works is that the ESP32 first creates a Bluetooth connection with the iOS [Provisioning app](https://apps.apple.com/us/app/esp-ble-provisioning/id1473590141). Then, you scan the WiFi QR code displayed on the screen that contains the connection details. Next, the app will connect to the device and configure WiFi credentials that are then stored in the device flash memory.

Now, whenever the configured WiFi network is not available or the thermostat just can’t establish a connection for any reason, it will show the setup screen so you can restart the provisioning process and configure a new WiFi network.

![](https://assets.jozefcipa.com/blog/12677955515e8037be53e7832bb10412/wifi_setup_screen.png)

## **Electrical circuit**

The electronic is pretty straightforward, and you can find the circuit below. The LCD, the temperature sensor, and the relay are all connected directly to the ESP32 board and that’s pretty much it 😀.

![](https://assets.jozefcipa.com/blog/12677955515e8037be53e7832bb10412/diagram.png)

![](https://assets.jozefcipa.com/blog/12677955515e8037be53e7832bb10412/enclosure.jpg)

## Conclusion

In total, the whole project cost less than 20€ (_ESP32 is usually extra 20€, but I got mine for free from the workshop_) and many mental breakdowns while trying to make things work :).

But, I learned **a lot** of new cool stuff. In fact, almost the entire project was something completely new to me. I learned more about ESP32 and ESP-IDF, how WiFi provisioning works, how to connect an LCD and make the touch screen work, what is a LVGL library and how to build UI interfaces in embedded systems.

On top of that, I learned a lot of things about programming in C, how horrible and cool it is at the same time. And that all those memory crashes are a pain in the ass to debug. But it truly forces you to really understand what’s going on in the program.

So it was definitely a fun project to work on. If you are interested in the code, you can find everything on [Github](https://github.com/jozefcipa/homekit-thermostat).
