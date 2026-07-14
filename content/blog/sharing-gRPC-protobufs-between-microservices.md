---
title: Sharing gRPC protobufs between microservices
description: >-
  If you work with gRPC you need to find a way of sharing proto  files across
  individual microservices. Let’s take a look at one possible way
date: '2020-02-23T21:18:37.768Z'
tags:
  - grpc
  - automation
---

![](/blog/img/1__uHXqoDARP__hXjNXE6uZGRA.jpeg)

If you work with gRPC you need to find a way of sharing `proto` files across individual microservices. I just got into this “gRPC-and-microservices” thing recently and had to research and learn everything so now I want to share how I tackled it.

When I started looking for possible options I found out some people were using **a mono repository** for keeping all microservices code and proto definitions in one place. I was considering this solution as well because sharing of proto files seemed very easy as you don’t have to care about inconsistencies as you would if you shared the same files across several separate projects (okay, I know you wouldn’t do that, let’s just pretend I never said that). But then I realized that the whole repo could easily get pretty big and intricate. I don’t have a lot of experience with monorepos and I was also afraid of how would it work with multiple languages (dependencies management, deployment, …). Besides that, I don’t actually like monorepos 🙅‍♂️.

### So, let’s do it differently

After browsing the internet extensively and talking with my colleague (thank you [Ondrej](https://www.linkedin.com/in/ond%C5%99ej-%C5%BEivn%C5%AFstka-bb9675117)) I think I found a solution I am happy with. The idea is to have **one separate repository** which only holds all protobuf definition files and so it’s a transparent and the only source of truth. Let’s call it `mycoolproject-proto` . Then, there are repositories that will contain generated code stubs for a specific language. If our microservices are written in Go and Node.js we could create repositories `mycoolproject-proto-go` and `mycoolproject-proto-nodejs` respectively. Next, we would add`mycool-proto-{lang}` library as a **git submodule** to our microservice project and voilà, we’re done.

The main tool that does all the magic is called [**Prototool**](https://github.com/uber/prototool). It’s a “_Swiss Army Knife for Protocol Buffers_” as they promote it. Since building our protofiles directly with `protoc` is pain, here comes prototool to rescue. It gives us the possibility not only to generate stubs but also **lint** the code, **format** it so it complies to a specified standard and also **check for breaking changes**, making us sure our API never breaks. With proper plugins, **generating documentation** is also just a breeze.

Now, how it all works together:

1.  You push your proto files into `mycoolproject-proto` repository. This repository has a CI/CD pipeline set up so it starts a build process.
2.  In the build process, we specify what languages we want to generate stubs for and then it just runs a prepared [docker image](https://hub.docker.com/repository/docker/jozefcipa/protoc-nodejs) which [lints and builds](https://github.com/jozefcipa/ca101-proto/blob/master/cli/build.sh#L75) our proto files.
3.  Once the language stubs are generated, it automatically creates a new git tag and [pushes](https://github.com/jozefcipa/ca101-proto/blob/master/cli/build.sh#L75) everything to a predefined repository (e.g.`mycoolproject-proto-nodejs`).

![](/blog/img/1__aN__NJ342vd__EoI49taJo1w.png)

Now we can add this repository as a git submodule in our application and start using generated gRPC library. And since it has tags, we can always specify which version we want.

Source proto repository: [https://github.com/jozefcipa/ca101-proto](https://github.com/jozefcipa/ca101-proto)

Generated stubs repository: [https://github.com/jozefcipa/ca101-proto-nodejs](https://github.com/jozefcipa/ca101-proto-nodejs)
