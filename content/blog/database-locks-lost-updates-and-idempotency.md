---
title: 'Database locks, lost updates and idempotency'
tags:
  - api
  - databases
  - nodejs
date: '2023-01-26T23:14:39.327Z'
slug: database-locks-lost-updates-and-idempotency
draft: false
---

Web applications are often complex systems consisting of several parts such as UI (frontend), API (backend), database and often other 3rd party services that the application depends on. Designing the API service properly so it’s robust, secure, and works as expected goes without saying but sometimes there are other factors that should be considered and handled adequately.

One of them is **********************concurrency & duplication**********************. It is important to know about it and be aware of the challenges it entails and how to deal with them. In this article, we will look at three situations in which our API would normally work just fine but would encounter issues once concurrent or duplicate requests would come in.

## Where’s my data?

Imagine a situation where you’re working as a copywriter at a company. As part of your job, you prepare posts for the company blog and also proofread the posts written by employees. One day an employee wrote a new post and asked you to review it. As you started reading it you noticed a typo.

> _The quick brown fox_ _**jmps**_ _over the lazy dog_

Naturally, you’re going to correct it and save the post, so it would look like this.

> _The quick brown fox_ _**jumps**_ _over the lazy dog_

But at the same time as you’re reviewing the article, that employee was reading it as well and realized that they forgot to add something important.

> _The quick brown fox jmps over the lazy dog_ _**Sphinx of black quartz, judge my vow**_

So they went ahead, added it and saved the article. Now, since the employee saved the article later, it would look like this

> _The quick brown fox_ **_jmps_** _over the lazy dog_ _**Sphinx of black quartz, judge my vow**_

As you noticed, the missing sentence was added but the typo that had been fixed by you reappeared again. This is known as the ************************lost update************************ problem (also referred to as “mid-air collisions”).

The reason for that is simple - since both of you had a loaded version of the article, when you updated it, the employee’s version had inherently become outdated. Now, if they then updated the article by adding the missing text, they would only save their changes while the rest would remain the same as it was when the article was first loaded (therefore rewriting all changes published by you in the meantime).

This problem can be avoided by using ********ETag********. ETag is an HTTP [header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag) that identifies a specific version of the content. Its value is not strictly defined and can be anything the user prefers, but usually, it’s a document hash (e.g. `3da5415599`), modification timestamp (e.g. `1672443352`) or a simple revision number (e.g. `1`, `v1`, `v1.1`).

The idea here is that every time a post is created or updated, the API generates an ETag string for it that represents the current revision. This value is then stored and returned as a header to the client whenever it asks for the given post.

Let’s write a simple Node.js API that just returns some mocked data and sets the `ETag` HTTP header so we can see how it works.

```
import Koa from 'koa'
import Router from 'koa-router'
import { koaBody } from 'koa-body'
import { createHash } from 'crypto'

const app = new Koa()
const router = new Router()

function createVersionHash(data) {
    return createHash('md5').update(data).digest('hex')
}

const demoText = 'The quick brown fox jmps over the lazy dog'
const demoPost = {
    id: 1,
    text: demoText,
    etag: createVersionHash(demoText),
}

router.get('/api/posts/:id', ctx => {
    ctx.set('ETag', demoPost.etag)
    ctx.body = demoPost
})

app.use(koaBody())
app.use(router.routes())
app.listen(3000)
```

If we run the script and call the endpoint, we will see that the ETag header is being set and returned in the response.

```
$ curl -i http://localhost:3000/api/posts/1

HTTP/1.1 200 OK
ETag: 961248836f12bcd8fada83b5ac06a7de
Content-Type: application/json; charset=utf-8
Content-Length: 182

{
  "id": 1,
  "text": "The quick brown fox jmps over the lazy dog",
}
```

Now, if the client wants to update the post, it will send the updated content along with the ETag header (`If-Match: "<etag value>"` _note, that according to the_ _[specification](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Match#directives)_ _the ETag value is placed between double quotes_) to the API.

The server first checks the header and validates it against the value stored in the database. If it matches, the request can proceed, otherwise, the ETag is outdated and some other change has been made meanwhile. Therefore, the request gets rejected, usually, with HTTP error `412 Precondition Failed`. The client needs to resolve this situation by fetching the post again, thus retrieving the latest version.

Let’s add another endpoint that will handle updating of posts.

```
// ...

router.put('/api/posts/:id', ctx => {
    const etagMatch = ctx.request.headers['if-match']?.replace('"', '')
    if (!etagMatch) {
        ctx.status = 400 // Bad Request
        ctx.body = { err: 'ETag is missing' }
        return
    }
    if (etagMatch !== post.etag) {
        ctx.status = 412 // Precondition Failed
        ctx.body = { err: 'ETag mismatch' }
        return
    }

    // received ETag matches the saved one, we can proceed
    // update the post
    demoPost.text = ctx.request.body.text
    demoPost.etag = createVersionHash(demoPost.text)

    ctx.set('ETag', demoPost.etag)
    ctx.body = demoPost
})

// ...
```

If we look at this example, we can see how the first update went through seamlessly, but if we try to update the content again, we get an error.

```
$ curl -i -X PUT http://localhost:3000/api/posts/1 \
  -H 'If-Match: "edd34addba369ecc64c071cfff2fee78"' \
  -H 'Content-Type: application/json' \
  -d '{"text": "The quick brown fox jumps over the lazy dog"}'

HTTP/1.1 200 OK
ETag: 9e107d9d372bb6826bd81d3542a419d6
Content-Type: application/json; charset=utf-8
Content-Length: 182

{
  "id": 1,
  "text": "The quick brown fox jumps over the lazy dog"
}
```

The update went through successfully and returned a new version of the ETag (`9e107d9d372bb6826bd81d3542a419d6`) in the response. Now, the employee is sending their update too. This will fail as the ETag is no longer actual (the employee’s browser doesn’t know about the update, therefore it still uses the outdated `961248836f12bcd8fada83b5ac06a7de` ETag).

```
$ curl -i -X PUT http://localhost:3000/api/posts/1 \
  -H 'If-Match: "961248836f12bcd8fada83b5ac06a7de"' \
  -H 'Content-Type: application/json' \
  -d '{"text": "The quick brown fox jmps over the lazy dog\nSphinx of black quartz, judge my vow"}'

HTTP/1.1 412 Precondition Failed
Content-Type: application/json; charset=utf-8
Content-Length: 23

{
  "err": "ETag mismatch"
}
```

As you can see, by utilizing ETags we can easily prevent lost updates and overwrites between concurrent users.

This approach is called [**********optimistic concurrency control**********](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)**********.********** Instead of relying on locks, each transaction before committing first verifies that no other transaction has modified the data it has read. This is great for applications **where conflicts are rare** but not so good when they happen often as it might have huge performance implications.

**Note:** ETag-s are also used for **caching resources**, where the client (browser) sends the ETag with the request to the server by using `If-None-Match: <etag value>` header and the server only returns the content if the version on the server doesn’t match the one sent in the request.

## Don’t charge me twice!

Imagine a different story _\-_ You’re traveling in a car and while sitting in the back, you decide to pass the time by browsing your favorite e-shop website. Suddenly you spot a great deal so you don’t hesitate and make an order right away. Right about that time when you press the buy button, the car enters a tunnel and your cell connection is abruptly interrupted. After a few seconds, you’re out of the tunnel, the connection gets back and so you press the buy button again (or reload the website) to confirm the order. Next thing you notice, your bank account has been charged twice. How is that possible?

Well, you accidentally created two orders, as the first time, when the connection got interrupted, your website froze on the shopping cart screen and didn’t receive the order confirmation from the server. Therefore, you naturally pressed the button again, even though the first request had reached the server before, there was just no way for it to send the result back to your phone.

This is a well-known edge case situation that must be handled properly, especially when money is involved (!). The solution to this problem is called **idempotency**.

Idempotency is a mechanism that ensures that the critical API endpoints or other parts of the application **won’t perform the same operation multiple times** when it’s called more than once. It is a crucial part of requests that do some changes, cause side-effects or mutate the state of something that shouldn’t be accidentally changed repeatedly.

The above-mentioned story is a good reason for making sure your payment handling logic is designed correctly. We can get inspired by [Stripe](https://stripe.com/docs/api/idempotent_requests) which describes this approach very nicely. However, payment systems are not the only area where idempotency is useful. [Shopify](https://shopify.dev/api/usage/idempotent-requests), for instance, uses it to secure the flow of creating e-shop orders. It can even be used to properly sync data [pipelines](https://www.fivetran.com/blog/idempotence-failure-proofs-data-pipeline) or to [avoid spinning up](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) more AWS EC2 instances than intended.

### How **does it work?**

The key is in marking a request with a unique identifier so the API can keep track of it and decide what to do if the request has been seen before. Generally, this is done by sending a custom HTTP header, typically known as `Idempotency-Key`. The value is arbitrarily defined by the client - it can be something that specifically represents the user session, such as a shopping cart ID or even a random string. [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier)s are often used in this case.

If the API is configured to be idempotent, it always checks whether a request includes the idempotency header. If the header is present and there hasn’t been a request with such a key yet, it tries to proceed with the request as usual and records the idempotency key.

Now, if another request comes in with the same idempotency key, the API looks up the key and returns the same response as in the first request. The API doesn’t perform any business logic that could impact the response. Note, that if the original request resulted in an error, the second request will also return the same error message.

When the API returns a response, some APIs might return an additional header communicating that the request with the provided idempotency key has been already sent and the response is therefore from the first (original) call. Stripe, for instance, returns an `Idempotent-Replayed` header.

It is a good practice to make idempotency keys expire after some time (e.g. 24 hours, 1 day, 30 days) as the requests become stale anyway and you also won’t bloat your database.

Following what we just said, let’s take a look at the example of how it can look in practice. We have a list of user accounts and a new endpoint that processes payments. As it supports idempotency, we first check if a request is sent with the idempotency key. If it is and the provided key has been already sent before, we just return the original response right away. Otherwise, the API processes the payment request and stores the idempotency key, so all the subsequent requests will get the same response without creating another payment.

```
// ...
import { randomBytes } from 'crypto'

function generatePaymentId() {
    return randomBytes(20).toString('hex')
}

const payments = []
const userAccounts = {
    'john.doe@example.org': {
        email: 'john.doe@example.org',
        balance: 200,
    }
}

router.post('/api/payment', (ctx) => {
    const idempotencyKey = ctx.request.headers['idempotency-key']
    const { sender, amount } = ctx.request.body
    const userAccount = userAccounts[sender]

    // Check if the idempotencyKey has been used
    // if so return the existing payment
    const paymentByIdempotencyKey = idempotencyKey &&
      payments.find(payment => payment.idempotencyKey === idempotencyKey)
    if (paymentByIdempotencyKey) {
        ctx.set('Idempotent-Replayed', true)
        ctx.status = paymentByIdempotencyKey.code
        ctx.body = {
            payment: paymentByIdempotencyKey,
            userAccount,
        }
        return
    }

    const payment = {
        id: generatePaymentId(),
        sender,
        amount,
        idempotencyKey,
        status: null,
        code: null
    }

    // check if sender has money
    if (userAccount?.balance >= amount) {
        // subtract amount from user account
        userAccount.balance -= amount
        payment.status = 'OK'
        payment.code = 200
    } else {
        payment.status = 'NO_MONEY'
        payment.code = 400
    }

    // record payment
    payments.push(payment)
    
    ctx.status = payment.code
    ctx.body = {
        payment,
        userAccount,
    }
})

// ...
```

Now that we have the code ready, let’s try to send a payment request and see how it works. Notice, that here we are just sending a normal request and we don’t include the idempotency key.

```
$ curl -i -X POST http://localhost:3000/api/payment \
  -H 'Content-Type: application/json' \
  -d '{"sender": "john.doe@example.org", "amount": 100}'

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 188

{
	"payment": {
		"id":"80f2b3655a23e66573e688ffb01c92a3ca8fba5e",
		"sender":"john.doe@example.org",
		"amount":100,
		"status":"OK",
		"code":200
	},
	"userAccount": {
		"email":"john.doe@example.org",
		"balance":100
	}
}
```

We can see that the request succeeded, the payment was created, and our account was charged. Let’s send another request and see what happens.

```
$ curl -i -X POST http://localhost:3000/api/payment \
  -H 'Content-Type: application/json' \
  -d '{"sender": "john.doe@example.org", "amount": 100}'

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 188

{
  "payment": {
    "id":"2803f03514b292b57b210420fd47d504e860084e",
    "sender":"john.doe@example.org",
    "amount":100,
    "status":"OK",
    "code":200
  },
  "userAccount": {
    "email":"john.doe@example.org",
    "money":0
  }
}
```

You can see that a new payment got created again (different payment ID), resulting in charging the user account again, so the `userAccount.balance` now equals `0` and we’re out of money. We can verify that by sending the third request.

```
$ curl -i -X POST http://localhost:3000/api/payment \
  -H 'Content-Type: application/json' \
  -d '{"sender": "john.doe@example.org", "amount": 100}'

HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8
Content-Length: 194

{
  "payment": {
    "id":"7b3c8c6c892857a5767b014fd7d4a0531ff80711",
    "sender":"john.doe@example.org",
    "amount":100,
    "status":"NO_MONEY",
    "code":400
  },
  "userAccount": {
    "email":"john.doe@example.org",
    "money":0
  }
}
```

That would be okay as long as we intended to send two separate payments one after another. But even though we didn’t plan to pay twice, the API created a new payment each time because it had no way of knowing that it was a duplicate request. This is really bad as we just **charged our customer two times** and I can promise you they won’t be happy about that.

This is exactly what the idempotency key solves. Let’s try to send a new request, but this time with the `Idempotency-Key` header included (_don’t forget to restart the server first, as currently, we’re out of money_).

```
$ curl -i -X POST http://localhost:3000/api/payment \
  -H 'Idempotency-Key: 77e76f80-0466-4e83-95bf-bf754eefa37c' \
  -H 'Content-Type: application/json' \
  -d '{"sender": "john.doe@example.org", "amount": 100}'

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 244

{
  "payment":{
    "id":"91f177563d4a69945d97ddb9f46fa11d4984e948",
    "sender":"john.doe@example.org",
    "amount":100,
    "idempotencyKey":"77e76f80-0466-4e83-95bf-bf754eefa37c",
    "status":"OK",
	  "code":200
  },
  "userAccount":{
    "email":"john.doe@example.org",
    "balance":100
  }
}
```

We see that the payment went through seamlessly, just like in the first example - the payment was created and our account got charged. Let’s try to send the request again to see what happens.

```
$ curl -i -X POST http://localhost:3000/api/payment \
  -H 'Idempotency-Key: 77e76f80-0466-4e83-95bf-bf754eefa37c' \
  -H 'Content-Type: application/json' \
  -d '{"sender": "john.doe@example.org", "amount": 100}'

HTTP/1.1 200 OK
Idempotent-Replayed: true
Content-Type: application/json; charset=utf-8
Content-Length: 244

{
  "payment":{
    "id":"91f177563d4a69945d97ddb9f46fa11d4984e948",
    "sender":"john.doe@example.org",
    "amount":100,
    "idempotencyKey":"77e76f80-0466-4e83-95bf-bf754eefa37c",
    "status":"OK",
    "code":200
  },
  "userAccount":{
    "email":"john.doe@example.org",
    "balance":100
  }
}
```

As you can see, we got the exactly same result. Notice that the user account’s balance remained `100`, the **payment ID hasn’t changed** and we even received the `Idempotent-Replayed` header confirming that the request has been indeed seen before and the API just returned the original payment response instead of creating a new one. This is a very simple yet powerful method that can save you a lot of trouble and debugging in the future.

### Deduplication ID

Not only API endpoints support idempotency. There are other systems that implement this concept too, such as **message queues**. A similar problem might occur there as well when some message gets published multiple times. In this case, a deduplication ID can help. It works very similarly to the idempotency key, in a way that once a message with the specific deduplication ID is published, any messages sent with the same ID won’t be delivered.

This only applies during the deduplication interval which is the same concept as the expiration of idempotency keys, but it’s usually much shorter, 5 minutes in the case of [AWS SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html).

## Database transactions

We talked about two different scenarios where multiple requests may cause issues. To fix them we only needed to send an HTTP header and do some slight changes on the backend. However, some situations require a more sophisticated approach in order to ensure data integrity where using a header is not enough. This is where **SQL** **database transactions** come into play.

Transactions are a mechanism that allows to manipulate with data and secures a transition from one consistent state into another. This is assured by implementing **ACID** principles,

-   **Atomic** - a transaction is treated as one unit, if a single query within the transaction fails, then the whole transaction is rolled back. It’s an “all or nothing” approach. This way it ensures that are no inconsistencies or invalid states.

-   **Consistent** - transactions respect all existing constraints and foreign references on tables, thus avoiding illegal states.

-   **Isolated** - isolation guarantees that concurrently running transactions won’t interfere with each and the changes made in one won’t affect the other. This is done by using **locks**. The exact behavior and lock strictness can be configured by **********************************isolation levels.**********************************

-   **Durable** - once a transaction succeeds, it is written permanently and will remain in the system, even after a system crash or power outage.

### **Isolation levels**

-   **Read uncommitted -** this is the least strict level, which allows **********************dirty reads**********************, i.e. one transaction can see the changes of another even before them being committed. This is **not even implemented** by Postgres**********.**********

-   **Read committed -** This is the default isolation level in Postgres. Transactions will only ever read data that has been committed.

-   **Repeatable read -** A more strict level, which protects against several phenomena.
    
    -   **Non-repeatable reads -** If we have two transactions A and B, transaction A reads a row value and gets 100. At the same time, transaction B does some calculation updates the value to 200 and commits. If transaction A now reads the value again, it sees 200. Thus, if the same query is executed multiple times within a transaction, it could return a different value each time.
    
    -   **Phantom reads -** Similar to non-repeatable but with table rows. Transaction A reads the count of rows and gets 3. Transaction B, in the meantime, deletes one row and commits. Transaction A reads the rows count again and gets 2. Phantom reads are caused due to inserts or deletes of rows.
    
    -   **Lost updates** \- This happens when we start two transactions A and B, the transaction A updates a row value to 10 and commits. Then, transaction B also updates the same row value to 20 and commits. The row value is now 20 and transaction A did a lost update.

-   **Serializable - T**he most strict isolation level, concurrent transactions would have the same effect as if they were applied serially, one after another.

If you want to learn more about transactions and isolation levels check out [this](https://lchsk.com/database-transactions-concurrency-isolation-levels-and-postgresql) article.

### Locking

Transactions and some operations performed within them may block each other in order to keep data safe. The blocking is known as locks, and they can be applied either on an entire table, a subset of rows or on an individual row. In such cases, when a lock is held by one transaction, other transactions cannot access or modify the data (depending on the type of the lock).

For instance, when we perform two concurrent `UPDATE` queries on a row, the second transaction must wait until the first one completes. Then, again, depending on the isolation level and the lock type it can either continue or fail.

While this is enough when updating the data, sometimes it might be necessary to hold the lock longer, for some additional processing. For such cases, `SELECT ... FOR UPDATE` may be used. It acquires the `ROW SHARE` lock which conflicts with the `ROW EXCLUSIVE` lock used by the `UPDATE` statement, therefore it prevents any changes to the row. That said, any other transactions that will attempt to modify the row or use _select for update_ too, will have to wait until the transaction completes and the lock is released.

Sometimes we don’t want to wait for the release of the lock. In this case, we can use `SELECT ... FOR UPDATE NOWAIT` which will try to acquire the lock and if not available, it will error out immediately.

There are a few other similar locks, that are beyond the scope of this article but you can get more familiar with them [here](https://shiroyasha.io/selecting-for-share-and-update-in-postgresql.html).

### Example situation

To give an example of where locks and transactions can be used, let’s think of the following situation.

We have a website that collects users’ emails for further processing and categorization. It uses a 3rd party service that sends [webhooks](https://en.wikipedia.org/wiki/Webhook) anytime a new email is received as well as when there is a problem with the email account. Our app then listens for these webhooks and acts upon them.

If for some reason, some webhooks come twice (and it happens!) our app would process the same event two times. This might not be a problem if it’s just about updating a value where duplicate requests won’t make a difference, e.g. `accountStatus = connected` but when we want to update some counts, send a notification or make some other action, duplicate events become undesired. Imagine you would get two notifications saying that your email account has been connected, not ideal. To fix that, you could use the select for update lock. Here is an example in Sequelize:

```
await sequelize.transaction(async trx => {
	// Only one transaction at a time will be able to fetch the user
	const user = await User.findOne({
		where: { id: webhook.userId }
	  lock: transaction.LOCK.UPDATE // SELECT ... FOR UPDATE
		transaction: trx,
	})

	if (user.accountStatus !== webhook.userStatus) {
		// status has changed
		await user.update({ accountStatus: webhoook.userStatus }, { transaction: trx })

		// send notification ...
	}
})
```

Since we used `SELECT FOR UPDATE` query when two concurrent requests come, only one of them will acquire the lock and the other one will have to wait. Now, the first request sees that the account status has changed, so it updates the user and creates a notification. After that, the database transaction is committed and the second request finally acquires the lock. As it now sees that the status is the same (the previous webhook updated the status already), it will just complete the transaction with no changes.

If we didn’t use this lock mechanism, both transactions would fetch the user, and as they would both see the old status, they would update it and also create a notification. Even though this would result in correct, updated account status, the notification would be duplicated. This is exactly where the select for update command can help us as it holds the lock even after selecting the data from the database so we can execute other commands before committing and releasing the lock.

A similar result could also be achieved by using the `SERIALIZABLE` isolation level, but this blocks the whole table instead of just specific rows which could be inefficient and time-consuming.

## Summary

In this article, I tried to show you a few things that are good to know about as they might come in handy sometimes. It is definitely not something you would implement every day on every project, but certain scenarios may require additional logic to fix the problems we mentioned. It is important to think about your project in advance, analyze it thoroughly and assess the potential challenges.

If you read it all up here you should know that you can utilize ETag to make sure that multiple users won’t accidentally rewrite each other changes. If you’re working with important resources, you can mitigate the risk of making unwanted actions by using idempotency. Database locks and transactions are very important and vast topics on their own. However, by now you should know at least the basics, how they protect data integrity and how you can use them to your benefit.
