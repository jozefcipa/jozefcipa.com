---
title: Keeping track of database changes and when it can be useful
tags:
  - aws
  - databases
  - devops
date: '2022-09-21T20:42:50.910Z'
slug: keeping-track-of-database-changes-and-when-it-can-be-useful
draft: false
---

![](https://images.unsplash.com/photo-1591696205602-2f950c417cb9?ixlib=rb-1.2.1&q=80&cs=tinysrgb&fm=jpg&crop=entropy)

> _My task was simple - we had a Postgres database and a data science team that needed to consume changes from the database to update their internal datasets. But how on earth would I do that?_ 🤷🏻‍♂️ _Luckily, my colleagues brought some light into this mysterious database world but I still had to (wanted) read a lot to understand it better and make sure I did it right._

Today almost every application needs some place where to store data. Most of the time this place is a database and often it plays a crucial role in the whole system. There are many different databases available, each designed for a specific purpose. They can be hosted locally on a computer, somewhere in a data center, or in a cloud, so-called **managed database** instances. These are especially useful when we don’t want to take care of maintenance, data durability, and availability.

Moreover, the other big benefit of managed databases is **scalability**. This is very important when an application starts getting users. We, as developers, have to make sure that it will withstand the incoming traffic. There is a bunch of techniques to achieve this as it is a very complex and difficult task. When the database begins to run out of resources, such as lack of free memory (RAM), overutilized CPU, or reaching a storage limit, some action is necessary. The easiest solution is raising the resource limits, i.e. providing more RAM, better CPU, or more disk space. This is known as **vertical scaling**, you just add more resources to a single (database) machine.

However, this is not sustainable in the long term because sooner or later the database might hit its limits again, and further scaling could become very expensive or even not physically possible. That’s where **horizontal scaling** comes into play. Instead of increasing the physical parameters of a single machine, we add multiple smaller machines that can split the load.

In some scenarios, where there is too much data being stored, [**sharding**](https://www.digitalocean.com/community/tutorials/understanding-database-sharding) might come in very handy, where data is partitioned among several databases but this is out of the scope of this article.

Another important thing is the concept of **replication** which is a key to ensuring **data persistence** but it also helps with offloading the main database server by introducing a **read replica** that is used for reading queries.

This is what we will focus on in this article - a really high-level description of **how replication works**, **the types of replication**, and how we can leverage them.

## **What is replication?**

> _“…sharing information so as to ensure consistency between redundant resources, such as software or hardware components, to improve_ **_reliability_**_,_ **_fault-tolerance_**_, or_ **_accessibility_**_…”_ - Wikipedia

As we can see, replication is an essential and commonly used method that is, in short, supposed to help keep your application available to users. It does that by copying data into multiple machines so an application can continue working seamlessly if the main database becomes unavailable.

There are many [ways](https://www.postgresql.org/docs/13/different-replication-solutions.html) to achieve this, from low-level solutions like **sharing a disk** or a network file system across machines, to **shipping WAL logs** (_we'll talk about WAL later_), having an **SQL middleware** that intercepts all queries and sends them to other servers, **logical replication** and more.

{{< callout emoji="ℹ️" >}}
It is important to keep in mind though, that there are plenty of different databases, some of them designed for a very specific use case, therefore not everything we mention can be applied to all of them. In this article, we are using [Postgres](https://www.postgresql.org/) 13, which is a powerful, widely used relational database, that one would probably use most of the time.
{{< /callout >}}

### Logical replication

While disk-based (also called **physical**) methods work on a binary level, where the exact block addresses are directly sent over (byte-by-byte replication), logical replication works with tables rather than raw database data. It replicates data objects and their changes based on their replication identity (usually a primary key).

It has many use cases such as,

-   replicating data between different major versions of PostgreSQL or different platforms (e.g. Linux to Windows)

-   grouping multiple databases into one (e.g. for analytics)

-   sharing a subset of the database with other users or systems

-   distributing database changes to subscribers in real-time

However, it’s important to note that it **only supports** **[DML operations](https://stackoverflow.com/a/44796508/4480179)** (`INSERT`, `UPDATE`, `DELETE`), therefore schema changes will not be replicated and the schema itself must be identified and defined beforehand.

It uses a publisher/subscriber model which can be used as follows,

```
CREATE PUBLICATION pub FOR TABLE users
```

The p**ublication** is defined on a primary database and represents a set of changes generated from a table or multiple tables.

Then, on the secondary (replica) database you would create a **subscription t**hat specifies the connection to the main database and the set of publications to subscribe to.

```
CREATE SUBSCRIPTION sub CONNECTION 'host=192.168.1.1 port=5432 user=foo dbname=bar password=xyz123' PUBLICATION pub
```

This way we can configure logical replication between two databases.

### Logical decoding

Logical decoding is very similar to logical replication but it provides an option to consume the changes to a database’s tables to **external consumers**. This could be a different kind of database, some business application, auditing software, etc.

The data is stored using **replication slots**. A slot represents a stream of changes that can be replayed to a client in the order they were made on the origin server. You can think of it as an ordered list where a database pushes the changes and a consuming application on the other side reads those changes. Usually, there should be a separate replication slot for each consumer as the changes are wiped after reading(!)

The output format is defined by a plugin that you can set. There are several [plugins](https://wiki.postgresql.org/wiki/Logical_Decoding_Plugins) available, that can process the WAL log and print out the results in a format that is desired and processable by a consumer application.

There are two options for consuming the changes

-   using special SQL functions for retrieving data, such as `pg_logical_slot_get_changes()`

-   using a streaming protocol to get real-time events of database changes - this can be achieved by using [`pg_recvlogical`](https://www.postgresql.org/docs/current/app-pgrecvlogical.html) utility

### **Write-ahead log (WAL)**

So what the heck is this WAL anyway?

In the Postgres database, all changes to data files must be recorded in the log file before they are written to the database. Only after this, a transaction is deemed to be committed ([asynchronous commit](https://www.postgresql.org/docs/current/wal-async-commit.html)). This is a standard method for ensuring data integrity and durability as in the event of a database crash, all the changes can be reapplied to the database using the log.

Following this procedure, the database doesn’t need to flush data pages to disk on every transaction commit which also improves the speed of transactions, as explained in the Postgres [docs](https://www.postgresql.org/docs/current/wal-intro.html):

> _Using WAL results in a significantly reduced number of disk writes because only the log file needs to be flushed to disk to guarantee that a transaction is committed, rather than every data file changed by the transaction. The log file is written sequentially, so the cost of syncing the log is much less than the cost of flushing the data pages_

Now, that we talked about what the WAL is, you can get a better idea of how the replication process works. As the database keeps these log files, they can be just sent to another machine and applied there.

## **Configuring the database**

As said in the beginning, we needed to configure a 3rd party service to consume updates from the main database, therefore we had to use logical decoding which allows you to create a replication slot with a given output formatting plugin and consume the changes. We used a popular plugin `wal2json` which takes the WAL records and converts them into a JSON format, making them easily processable by third-party applications.

In order to do this, we first needed to grant replication permissions to the database user. As we were using an RDS instance in AWS, the command looked like this:

```
GRANT rds_replication TO myuser
```

After that, we needed to configure some Postgres parameters so the replication could start. Normally, we’d look for a config file like `postgresql.conf` — but since we were on a managed database, we used the so-called Parameter Group where we could easily configure all the necessary values in the UI.

-   `rds.logical_replication` ⇒ `1` This is the first parameter that has to be set to `1` in order to enable logical replication

-   `wal_level` ⇒ This has to be set to `logical` but it is handled automatically by AWS once you enable `rds.logical_replication`, ([read more](https://postgresqlco.nf/doc/en/param/wal_level/))

-   `max_slot_wal_keep_size` ⇒ `20000` This value specifies how much data can be stored in a replication slot before it starts recycling the memory. It is specified in MB and you should think of your database use case, the amount of data written, and set a proper value. If the number is **too low** and your database **writes a lot** of changes the slot might **get recycled too soon** and if you don’t read all the changes before the databases (or 3rd party system) get **out of sync,** you will need to do a full sync again! This is something that you need to test and see what’s the best value for your needs. Important to mention, that this value is set to `-1` **by default** (!) which means unlimited storage size. If you are not careful your slot might end up **taking up all the available free storage** on the database resulting in **database unavailability** as it runs out of memory ⚠️ ([read more](https://postgresqlco.nf/doc/en/param/max_slot_wal_keep_size/))

Beware, that these changes will require a **database restart**!

That is all that needs to be configured to have logical decoding working in Postgres. Naturally, there are many more parameters that can be set to adjust this behavior but we were okay with their default values for the time being.

Other interesting parameters that I was looking at were `max_replication_slots` and `max_wal_senders` but eventually, we didn’t need to change them and the default values sufficed.

One more thing that is crucial to keep in mind is that **slots keep data until it’s read** by a consumer. Once the data is read, it is automatically deleted from the slot. This means that if you don’t use a replication slot (anymore) it should be dropped, otherwise there will be unnecessary data piling up and filling the storage!

There is even a warning in the [official docs](https://www.postgresql.org/docs/current/logicaldecoding-explanation.html#LOGICALDECODING-REPLICATION-SLOTS)

> _Replication slots persist across crashes and know nothing about the state of their consumer(s). They will prevent removal of required resources even when there is no connection using them. This consumes storage because neither required WAL nor required rows from the system catalogs can be removed by_ _`VACUUM`__as long as they are required by a replication slot. In extreme cases this could cause the database to shut down to prevent transaction ID wraparound (see_ _[**Section 25.1.5**](https://www.postgresql.org/docs/current/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND)__). So if a slot is no longer required it should be dropped._

{{< callout emoji="ℹ️" >}}
If you want to learn more about the specific Postgres configuration parameters, I really recommend [postgresqlco.nf](http://postgresqlco.nf/) or the official [Postgres docs](https://www.postgresql.org/docs/14/index.html) which are very well written and their explanation of the various concepts are easy to read and understand 💯
{{< /callout >}}

### Consuming changes

Now that we got our database configured properly, we can finally start consuming database changes. In order to do so, we need to **create a replication slot** first. We can do that by calling a function `pg_create_logical_replication_slot`.

```
SELECT * FROM pg_create_logical_replication_slot('my_replication_slot', 'wal2json')
```

This will create a replication slot with the name `my_replication_slot` and set `wal2json` as the output formatting plugin.

To verify that the slot got created we can send a simple SQL query.

```
SELECT * FROM pg_catalog.pg_replication_slots
```

{{< callout emoji="ℹ️" >}}
Please note, that in order to use `wal2json` plugin, you might need to [install](https://github.com/eulerto/wal2json#build-and-install) it into your database first. However, if you use AWS RDS (or maybe other cloud providers as well) the plugin is already installed and ready, even though [it’s not showing](https://github.com/eulerto/wal2json/issues/75) in the `pg_extension` table.
{{< /callout >}}

Now that we have the slot created, let’s see how it looks.

Let’s try to do a simple `INSERT` query:

```
INSERT INTO users (id, email, role, name)
VALUES (
	'847be54f-3a82-4591-a293-023ea15b2962',
	'john.wick@example.com',
	'user',
	'John Wick'
)
```

Now, we can take a peek at what has been logged by calling

```
SELECT * FROM pg_logical_slot_peek_changes('my_replication_slot', NULL, NULL, 'include-xids', '0')
```

which will return our inserted data 🎉.

```
{
   "change":[
      {
         "kind":"insert",
         "schema":"public",
         "table":"users",
         "columnnames":[
            "id",
            "email",
            "role",
            "name"
         ],
         "columntypes":[
            "uuid",
            "character varying(255)",
            "character varying(255)",
            "character varying(255)"
         ],
         "columnvalues":[
            "847be54f-3a82-4591-a293-023ea15b2962",
            "john.wick@example.com",
            "user",
            "John Wick"
         ]
      }
   ]
}
```

Peeking is good for testing to see if everything works and the changes are propagating but in a real scenario, we would use a different function

```
SELECT * FROM pg_logical_slot_get_changes('my_replication_slot', NULL, NULL, 'include-xids', '0') 
```

The difference here is that, as we mentioned, changes are deleted from the slot once the consumer reads them so this function is the one you will want to use. Now, if you try to run the same query again, you will notice there are no results so everything worked as expected.

Now you can just connect your consumer application to the database and start processing all changes 🚀

If we don’t need the slot anymore we can just drop it.

```
SELECT * FROM pg_drop_replication_slot('my_replication_slot')
```

## **Conclusion**

In this article, we learned what replication is, that there are many techniques to achieve it and that it can be used not only for keeping data in sync between databases but also even with 3rd party systems.

We dove a little into the internals of how databases store all the changes in a specific log file (WAL) and that this log file can be also used for logical decoding which with a set of various output plugins makes a very powerful tool for data visibility.

Now we know how this decoding works and that it is important to read the docs properly (or get advice from an experienced colleague 😉) and investigate which parameters should be set in order not to get surprised by an unresponsive database due to a lack of memory. Moreover, having monitoring in place and visibility over what’s going on is always more than desired.

* * *

I would like to thank my colleagues [Honza](https://www.linkedin.com/in/janhybl) and [Jozef](https://www.linkedin.com/in/jozefreginac), who helped me understand the details and provided some useful tips and insights.
