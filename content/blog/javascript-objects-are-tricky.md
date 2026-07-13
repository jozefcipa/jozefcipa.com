---
title: Javascript objects are tricky
tags:
  - nodejs
  - today-i-learned
date: '2023-09-08T23:55:34.011Z'
slug: javascript-objects-are-tricky
draft: false
---

I just spent four hours debugging a really weird issue… I’m gonna write it up here as a reminder for my future self, and maybe you’ll find it useful too.

I was writing a [bag of words](https://en.wikipedia.org/wiki/Bag-of-words_model) script that would process documents stored in the database and afterward store processed data in another table. Everything went smoothly and the script processed over half a million document pages before suddenly I got this really weird error:

```
invalid input syntax for type integer: "function Object() { [native code] }function Object() { [native code] }1"]
```

What the …

![](https://assets.jozefcipa.com/blog/c67b2b48-a4f0-4058-b7ab-b20694c9d95a/wtf.gif)

So I started debugging, slowly step by step, I tested the SQL query, added logs, and even checked the input document texts. Until it finally hit me…

If you’ve been working with Javascript for a while, you might know its weird dark secrets. If not, I really recommend this 4-minute [video](https://www.destroyallsoftware.com/talks/wat) to get you acquainted.

The thing is Javascript behaves [oddly](https://dev.to/otamnitram/js-being-odd-some-weird-things-about-javascript-1imj) in some situations and you need to be aware of this. Let’s look at how a bag of words looked in my script.

```
// e.g. John likes to watch movies, Mary likes movies too.

const words = [ ... ]

// Iterate through words and increment their count
words.reduce((bag, word) => {
  bag[word] = bag[word] ? bag[word] + 1 : 1
}, {})

const bagOfWords = {
  John: 1,
  likes: 2,
  to: 1,
  watch: 1,
  movies: 2,
  Mary: 1,
  too: 1,
}
```

This is the main logic, we parse words from documents and then iterate through them and count their occurrences. This worked well until one tricky document came in. This document contained one important word - “constructor”. So as you can see in the script above, we check if the word already exists in the bag and increment its counter, or otherwise we add it and set the count to 1.

Now, when you have a typical JS object, you’d assume the following:

```
const obj = { John: 1, likes: 2 }

obj['John'] // prints 1
obj['likes'] // prints 2
obj['movies'] // prints undefined as the key doesn't exist
```

However, when that “constructor” word appeared, the following happened

```
const obj = {} // we have an empty object at the beginning

obj['constructor'] // [Function: Object]
```

Wait, what? 🧐

The trick is in how objects in Javascript are created. When you create a new plain object as `const obj = {}` in reality this equals to `Object.create(Object.prototype)`. Prototypes are out of the scope of this post but they’re basically a Javascript way of implementing inheritance. Therefore, when you create an empty object, it already has some functions bound to it.

![](https://assets.jozefcipa.com/blog/c67b2b48-a4f0-4058-b7ab-b20694c9d95a/empty-object.png)

And thus, `obj['constructor']` is already defined even in an “empty” object, therefore the database complained because we didn’t set an integer count but actually a `function () {} + 1`.

When I found that I immediately realized how stupid the mistake was, but hey, sometimes things that seem so apparent, aren’t really 🙂.

To fix this I could create an object like this, but that’s a bit ugly and weird.

```
const obj = Object.create(null) // doesn't inherit Object.prototype
```

Luckily, there’s a better way to tackle this. Javascript has `Map` [collection](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) which behaves slightly differently, has other benefits and it’s supposedly even more performant in some cases. And it comes really empty when you initialize it.

So our example could be rewritten like this:

```
const words = new Map()

// Iterate through words and increment their count
words.reduce((bag, word) => {
  bag.set(word, bag.has(word) ? bag.get(word) + 1 : 1)
}, new Map())
```
