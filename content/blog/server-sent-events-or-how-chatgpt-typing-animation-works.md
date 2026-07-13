---
title: Server-sent events or how ChatGPT typing animation works
tags:
  - api
  - nodejs
  - frontend
date: '2023-05-23T00:31:35.486Z'
slug: server-sent-events-or-how-chatgpt-typing-animation-works
draft: false
---

I’m sure you’ve heard of ChatGPT, the [fastest-growing](https://www.reuters.com/technology/chatgpt-sets-record-fastest-growing-user-base-analyst-note-2023-02-01/) user application in the history of the internet. Most probably you also played with it or even used it for work. This chatting model provides impressive and often mind-blowing responses to a wide range of questions. But have you ever wondered how it works?

Well, certainly it’s super complicated and you can find many articles and videos about it on the internet, but, have you ever wondered how the typing animation works, in particular?

In this article, we will take a look at how frontend integration is implemented, what technology is behind it, and how you can leverage it in your applications as well.

<video src="https://assets.jozefcipa.com/blog/43cc3447bff04a72b67f5f9ba65e29d7/chatgpt.mp4" autoplay muted loop></video>

# Real-time communication methods

At the beginning of the internet, when websites were simple, a classic request/response approach was sufficient for securing client-server communication. As the internet grew, and the websites were becoming more complex, this method was no longer enough. The problem is that the browser is the one that always initiates the connection with a server and asks for data. But what if we were building a chat application and wanted to check if there is a new message? With the classic request/response style, we would have to repeatedly send a request to the server asking whether there are new messages. This technique is called ****************polling.****************

**************Polling**************

The browser keeps sending requests in short intervals asking for data from the server. This is rather a naive and very unsophisticated approach how to get closer to “real-time” communication, but it comes with many drawbacks. As the client frequently requests updates from the server, it can result in a **high volume of requests** and an **increased server load.** Moreover, if there are no new data, such requests unnecessarily lead to wasted bandwidth. Finally, polling is not well-suited for real-time applications as it can result in a **significant delay** between when new data is available on the server and when the client receives it (depending on how often the client sends the requests).

**********************Web sockets**********************

Another solution one can choose to achieve real-time communication is to use [web sockets](https://en.wikipedia.org/wiki/WebSocket). Web sockets allow bidirectional communication between the server and the client. This means, that once the connection is established, both the client and the server can send data to each other at any time. This sounds great as it doesn’t suffer from the issues that polling has, but on the other hand, it requires **more overhead** and is much **more complex**. Additionally, maintaining open connections can be a **scaling issue for the server**.

**********************Server-sent events (SSE)**********************

SSE is similar to web sockets but simpler. In fact, it only works in one way, allowing data to be **sent multiple times** from the server to the client. Unlike traditional polling, where the client repeatedly requests updates from the server, SSE allows the **server to push data** to the client as soon as it becomes available. The client just needs to initialize a connection by simply sending a classic HTTP request and the server will keep the connection open and send messages (events) as they become ready. This method could be again used in a chat application but it’s also great for streaming content in smaller chunks as they become ready.

This is exactly what the ChatGPT application does and what we will do in this article - instead of waiting for the whole answer to become ready, we can listen for messages and continuously display them as they arrive. This naturally produces a nice “typing text” animation and of course, a better UX for the users.

However, as this is a **long-running operation**, that can go on for a few seconds, you need to keep in mind the consequences it entails. When working on a client application, the user might trigger an action that starts the streaming but then after a while, they may decide to leave the page (considering the app is a single-page application), so you should make sure to **cancel the stream** in such case ([AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)). Sometimes it can happen, that the stream returns an error, or there is a network issue. In situations like that, it might be necessary (depending on the nature of the application) to implement ****************retrying**************** mechanisms.

# SSE format

The structure of messages is very simple and consists of a `key:value` pairs where the key is one of the following `event`, `data`, `retry`, `id` and the value can be any string that you want to send, be it a simple text message or for instance a JSON payload. Every message is separated by a pair of newline characters (`\n\n`).

Imagine an online stream with a chat where people can comment, a simple SSE stream format could look something like this.

```
event: system-message
data: Hello everyone, welcome to the stream chat!

event: user-message
data: {"userId": 1, "message": "Hey people! I'm really enjoying the stream"}
```

The `event` field is not required, so one can send only `data` events. The remaining two keys - `retry` and `id` are used for the retrying logic in case of a connection error. In such situations, we can define a retry time that a browser should wait before trying to reconnect.

The `id` field is used to denote an ID of a message, so it can be used by a browser to initialize a new stream of messages starting from that ID on, in case of stream failure.

In order to indicate that we’re about to send an SSE stream, we have to set the following HTTP response headers on the server.

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

# Demo time - Custom ChatGPT client

Now that we described the technology let’s see how it can be used in practice. We are going to create a simple ChatGPT client clone where a user will be able to type their prompt and after hitting the Enter they will get the streamed response back from OpenAI. For our demo application, we will use a simple API written in Node.js and React.js on the frontend.

## API part

We will use [Koa](https://koajs.com/) as the base for our project. Next, we create a simple API endpoint that will accept our message and send it to OpenAI API using the [openai](https://www.npmjs.com/package/openai) npm package. After that, we will process the result and stream it back to the frontend using Server-Sent events.

_Note that for the sake of simplicity, we only discuss the important parts of the code and omit concepts like input validation, error handling, stream buffering, etc., so this code is not production ready. If you want to follow along and try it out for yourself, you can find the complete code on_ [_GitHub_](https://github.com/jozefcipa/chatgpt-client-ui)_._

In the code below we can see how simple it actually is. First, we need to get an OpenAI [API key](https://platform.openai.com/account/api-keys) so we can use their SDK to communicate with the GPT model. Then we define an endpoint `/api/chat` that will be used by the frontend. Inside it, we use `openai.createChatCompletion` to connect to the GPT model and send our prompt. If you have no experience with the OpenAI chat API, take a look at their official [docs](https://platform.openai.com/docs/guides/chat) where they explain everything.

Notice, that we’re not sending only the current message submitted by the user, but all the messages, this is important, for the chatbot to grasp the context of our conversation. This will be more apparent in the frontend code.

_**May 2023 -**_ _At the time of writing this article, the SDK doesn’t really support the streams well, so specifying_ _`stream: true`_ _is not enough, and you need to provide another parameter_ _`{ responseType: 'stream' }`_ _so the underlying Axios library properly returns a stream (See_ [_Issue #18_](https://github.com/openai/openai-node/issues/18) _on GitHub)._

The `completion` variable now holds a stream, so we can attach an `.on('data' () => ...)` listener to it and log what we’re getting from OpenAI.

Now, as we said in the beginning, we need to set proper headers so the browser knows it’s an SSE stream and not a usual request/response.

Since the OpenAI API already returns an SSE stream format (with `stream: true`), and Axios returns a native Node.js `Stream` instance, we can just easily pipe it to the response Koa stream (`ctx.body`).

```
// initialize OpenAI
const openai = new OpenAIApi(new Configuration({
  apiKey: 'YOUR-API-KEY'
}))

router.post('/api/chat', async ctx => {
  console.log('Incoming request', ctx.request.body)

  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: ctx.request.body.messages,
    stream: true,
    n: 1,
    max_tokens: 2000,
    temperature: 0.5,
  }, { responseType: 'stream'})

  // OpenAI npm package has incorrect typings,
  // so we have to fix it ¯\_(ツ)_/¯
  ;(completion.data as any as IncomingMessage).on('data', data => {
    console.log('Arriving chunk', data.toString())
  })

  // Set the headers to initialize the SSE stream
  ctx.set('Cache-Control', 'no-cache')
  ctx.set('Content-Type', 'text/event-stream')
  ctx.set('Connection', 'keep-alive')

  // As OpenAI API already returns SSE chunks, we can just simply pipe
  // the OpenAI stream to the Koa response stream
  ctx.body = completion.data
})
```

## Implementing frontend

Since the API is now done and ready, we can implement the frontend part. In order to consume SSE streams browsers natively support the [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) interface. However, the options here are somewhat limited as it **only supports GET** requests and no support **custom headers** can be specified.

Therefore there are several 3rd party libraries and solutions that provide more robust solutions while fixing the basic limitations of EventSource. One of the libraries is [@microsoft/fetch-event-source](https://www.npmjs.com/package/@microsoft/fetch-event-source) which we will also use in our project.

First, we start by creating a simple UI that shows the conversation between the user and ChatGPT. Here is a simple component that shows the text of a message.

```
interface Message {
  // conforms to the OpenAI API
  role: 'assistant' | 'user'
  content: string
}

function Message({ message, isTyping = false }: { message: Message, isTyping?: boolean }) {
  return (
    <div className={`message ${message.role}`}>
      <div className="author">
        <img src={message.role === 'assistant' ? chatLogo : logo} className="avatar" />
      </div>
      <div className={`text ${isTyping && 'typing-cursor'}`}>
        {message.content}
      </div>
    </div>
  )
}
```

Next, we need to know what the stream event from the OpenAI API looks like. As you can see, it’s a simple JSON object that contains a single [GPT token](https://platform.openai.com/tokenizer). We will process these events and append the tokens as they come in.

```
{
   "id": "chatcmpl-7HvwOWhktbechZQxZe4GnovwwFn44",
   "object": "chat.completion.chunk",
   "created": 1684508656,
   "model": "gpt-3.5-turbo-0301",
   "choices": [
      {
         "delta": {
            "content": " breaking"
         },
         "index": 0,
         "finish_reason": null
      }
   ]
}
```

Now, that we know how our data looks, we can finally write the chat logic. In the code below we create a simple App component that shows one `<input>` where we will submit our prompts and also the chat messages list. Once we type something and press Enter, the `fetchEventSource` function will call our API which will initialize an SSE stream. In the `onmessage` callback handler, we simply parse the incoming payload and append the string to the message. Once we receive the `[DONE]` string, we can consider the message to be fully streamed (This is not a part of the SSE standard, it’s a special string that OpenAI sends).

```
function App() {
  const [messages, setMessages] = useState<Array<Message>>([])
  const [input, setInput] = useState<string>('')
  const [isLoading, setLoading] = useState<boolean>(false)
  const [loadingMessage, setLoadingMessage] = useState<string>('')

  useEffect(() => {
    // when the loading stops and the loadingMessage is not empty
    // that means the chatbot has written something,
    // so let's add it to the messages array
    if (!isLoading && loadingMessage) {
      setMessages(messages => [...messages, { role: 'assistant', content: loadingMessage}])
      setLoadingMessage('')
    }
  }, [isLoading])

  useEffect(() => {
    if (isLoading) {
      fetchEventSource(`http://localhost:3333/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ messages }),
        onmessage: (evt) => {
          const message = evt.data
					
          // OpenAI sends [DONE] when the stream ends
          if (message === '[DONE]') {
            setLoading(false)
            return
          }

          const data = JSON.parse(message)
          console.log('Incoming payload', data)
          
          if (data.choices[0]?.delta.content) {
            setLoadingMessage(loadingMessage => loadingMessage + data.choices[0].delta.content)
          }
        },
        onerror: err => {
          console.error('Streaming failed', err)
          setLoading(false)

          // throw err, otherwise it will automatically retry
          throw err
        },
      })
    }
    
  }, [messages, isLoading])

  return (
    <main>
      <div className="messages-box">
        {/* Print all messages history */}
        { messages.map((message, i) => <Message message={message} key={i} />) }

        {/* Print current message that is being written by the chatbot */}
        {isLoading && <Message message={{ role: 'assistant', content: loadingMessage }} isTyping/> }
      </div>

      <input
        type="text"
        className="prompt"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            // append new message to the list
            setMessages(messages => [...messages, { role: 'user', content: input}])

            // reset input and start loading so the request is sent to the API
            setInput('')
            setLoading(true)
          }
        }}
        disabled={isLoading}
        placeholder="Send a message."
      />
   </main>
  )
}
```

Now, when the frontend code is ready, we can try to send some prompts and play around with our custom simple ChatGPT client :).

The typing animation nicely visualizes how the individual events from the stream are arriving in real-time from the server.

<video src="https://assets.jozefcipa.com/blog/43cc3447bff04a72b67f5f9ba65e29d7/chatgpt-custom.mp4" autoplay muted loop></video>

If you liked this article and want to see the complete example, you can find the code on [GitHub](https://github.com/jozefcipa/chatgpt-client-ui).
