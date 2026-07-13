---
cover: lock
title: Self signed SSL certificates on iOS
tags:
  - devops
  - today-i-learned
  - https
  - apple
date: '2024-01-18T23:51:14.133Z'
slug: self-signed-ssl-certificates-on-ios
draft: false
---

Recently I was working on a project and I needed to add an SSL certificate for the API service. Normally you would use [Let’s Encrypt](https://letsencrypt.org/) or some other certificate authority after deploying the service. In this case, though, my service will always only run on a local network and thus I have to generate a self-signed certificate.

I already [wrote a post](https://jozefcipa.com/blog/running-https-on-localhost/) about generating custom SSL certificates in the past. However, since then I came across a way better and nicer solution called **mkcert** ([Github repo](https://github.com/FiloSottile/mkcert)). If you don’t know this tool, I recommend taking a look if you ever need to generate the SSL certificates locally.

The whole process is very easy and seamless and you soon end up with generated certificates that you can add to your application or a web server such as NGINX or similar.

But, what happens if you open a website with such a certificate on your mobile device (assuming it’s on the same network as the API obviously)?

Let’s say our application is exposed at the IP address 192.168.0.199. Opening that in the browser would give us the following screen.

![](https://assets.jozefcipa.com/blog/416884af7bfa4ceb96695053cb83444a/safari-insecure.png)

Yikes, how’s that possible you ask? We do have the SSL certificate set up after all.

Well, that’s because even though we have indeed added the certificate, it’s not recognized by the browser as it has not been signed by a trusted [certificate authority](https://www.ssl.com/article/what-is-a-certificate-authority-ca) (CA). CA verifies the authenticity of the website and ensures it’s legitimate and secure. Without a trusted CA, browsers may display warnings or block access to websites with self-signed or unverified SSL certificates. And that’s exactly what happened here.

Therefore we need to make sure the iPhone recognizes our custom certificate authority.

> _mkcert automatically creates and installs a local CA in the system root store, and generates locally-trusted certificates_

mkcert comes in handy and we can find the local CA by calling

`$ mkcert -CAROOT`

This will return a path to the root certificate, which might look like this

`/Users/jozefcipa/Library/Application Support/mkcert`

If you open this path you will find a file called `rootCA.pem`

This is the CA certificate that we need to register on our iPhone. We can send the file over to the iPhone using Airdrop.

After we accept the file, let’s open Settings and tap on “Profile Downloaded” and then “Install”.

{{< columns >}}
![](https://assets.jozefcipa.com/blog/416884af7bfa4ceb96695053cb83444a/profile-downloaded.png)

<--->

![](https://assets.jozefcipa.com/blog/416884af7bfa4ceb96695053cb83444a/settings.png)

<--->

![](https://assets.jozefcipa.com/blog/416884af7bfa4ceb96695053cb83444a/profile-install.png)
{{< /columns >}}

Now that we have installed the certificate, we have to enable **Full Trust**.

Let’s go to Settings → General → About → Certificate Trust Settings and switch the toggle on.

![](https://assets.jozefcipa.com/blog/416884af7bfa4ceb96695053cb83444a/cert-trust.png)

Now the iPhone will start accepting our generated self-signed SSL certificates as it knows the root Certificate Authority that signed these certificates.

Refreshing the website again will give us the website and we can also notice the little lock symbol in the search bar 🎉.

![](https://assets.jozefcipa.com/blog/416884af7bfa4ceb96695053cb83444a/safari-working.png)
