---
title: Extending your application with Lua scripts
tags:
  - golang
  - scripting
  - lua
date: '2025-06-01T22:49:31.376Z'
slug: extending-your-application-with-lua-scripts
draft: false
---

I was always intrigued when I heard about people creating custom mods in games with the help of the mysterious Lua scripting language. I didn’t care much about the games themselves, but more about the idea of extending and customizing something to my imagination. I’m not a gamer, but I love automation and modifying things, so this naturally sparked my interest.

For this reason, I wanted to learn more about Lua and explore its potential when it comes to embedding it into existing software. In this article, we will implement a Lua interpreter in a simple Go program and learn how they interact with each other.

## What is Lua?

Lua is a lightweight scripting language that’s super easy to embed into your own programs. It’s fast, small (~200KB core), and designed to let you add customization without complicating your core code. And it doesn’t require a runtime like JVM or Python.

It can be found anywhere from game modding, through various applications (e.g., Redis or Nginx) to embedded systems where memory is scarce. It is really great for gluing different code together and adding new logic.

## Embedding Lua in Go

Most of the time, you can find Lua integrated into a C/C++ program, but there are tools for integrating it also with other languages, in our case, Go. In particular, we are going to use [gopher-lua](https://github.com/yuin/gopher-lua) package. GopherLua is a VM and compiler written in Go. It provides Go APIs that allow you to easily embed a scripting language into Go programs.

### How it works

When we add GopherLua to our Go program, it will run a Lua interpreter written in Go and create a virtual memory stack that is also used for communication between Go and Lua.

The interpreter executes Lua code and pushes or pulls data from the stack. On the other side is Go, which can also push or pull data back from Lua via the stack. This way, both sides can call functions and exchange data with each other. The example below illustrates this flow.

### Integrate Lua into the code

In the `main` function, we first initialize the Lua interpreter. After that, we register a function `add` so that it’s available in the Lua environment. This function just adds two numbers and returns a result. As you can see, to get the numbers, we use the special function `L.CheckNumber()` to grab the value from the stack. Similarly, to put the data back onto the stack, we can use `L.Push()`. At the end, we return `1`, denoting that the function returns one value.

Once we have defined the Go function, we can go ahead and run the actual Lua code. You can either execute a `.lua` file via `L.DoFile()` or run an inline script by using `L.DoString()`.

Lua just calls our function to add two numbers and stores the result in a variable `result`. After the script execution completes, Go can reach out to the Lua stack via `L.GetGlobal()` and get the variable value.

```go
package main

import (
	"fmt"
	"os"

	lua "github.com/yuin/gopher-lua"
)

// A sample Go function to expose to Lua
func addNumbers(L *lua.LState) int {
	// Get arguments from the Lua's stack
	num1 := L.CheckNumber(1)
	num2 := L.CheckNumber(2)

	// Push the result back to the stack
	L.Push(lua.LNumber(num1 + num2))
	return 1 // Number of return values
}

func main() {
	// Init Lua interpreter
	L := lua.NewState()
	defer L.Close()

	// Register the Go "add" function in Lua
	L.SetGlobal("add", L.NewFunction(addNumbers))

	// Execute Lua script and call the exposed Go function
	if err := L.DoString(`
		result = add(10, 20)
	`); err != nil {
		fmt.Fprintln(os.Stderr, "Error running Lua script:", err)
		return
	}

	// Get the result value from Lua
	fmt.Printf("10 + 20 = %s", L.GetGlobal("result"))
}
```

### Sandbox your Lua environment

In the next example, we will take a look at how we can control what libraries are available in the Lua environment. This might be important in some cases if one wants to limit the possibilities of the custom scripts and ensure that they won’t execute unprivileged code.

Lua comes with a couple of standard libraries, like `os` and `io` that provide access to the operating system calls and the file system. In some cases, this might be undesired, and therefore, it’s a good idea to create a sandbox environment where these libraries are not available to the user. This can be easily achieved by setting those globals to `nil`.

In the following example, we create a simple application that performs some business logic and provides a way for users to define custom Lua scripts to act on it. First, we check whether the `hooks.lua` file exists, and if so, we look for the `on_create` function. If the user defined this function, we will call it after performing the custom logic.

To call a function defined in Lua, we first need to address it through `L.GetGlobal()`. After that, we push the function on the stack alongside its parameters via `L.Push()`. Once the function and its arguments are ready on the stack, we can execute the function by calling `L.PCall()`.

```go
package main

import (
	"fmt"

	lua "github.com/yuin/gopher-lua"
)

func main() {
	L := lua.NewState()
	defer L.Close()

	// Sandbox - remove unsafe standard libraries
	L.SetGlobal("os", lua.LNil)
	L.SetGlobal("io", lua.LNil)

	// Load Lua script if available
	var luaHook lua.LValue = nil
	if err := L.DoFile("hooks.lua"); err == nil {
		if fn := L.GetGlobal("on_create"); fn.Type() == lua.LTFunction {
			luaHook = fn
		}
	}

	// Some business logic here
	// ...

	// Afterwards, we call hooks if defined
	if luaHook != nil {
		// Load the on_create function onto the stack
		L.Push(luaHook)
		// Put the function argument onto the stack
		L.Push(lua.LString("New entity created"))

		// Call the Lua function
		// 1 argument, 0 return values
		if err := L.PCall(1, 0, nil); err != nil {
			fmt.Printf("Failed to execute Lua hook: %v\n", err)
		}
	}

}
```

Now we can define our `hooks.lua` file that will contain the definition of the `on_create` hook. This hook gets called every time the main Go program completes the fictional business logic and creates a new entity.

```lua
-- hooks.lua
function on_create(message)
  print("[lua log]: " .. message)
end
```

After running `go run main.go` we should see the following result:

```bash
$ go run main.go
[lua log]: New entity created
```

This means that the script ran properly, and it found the `hooks.lua` file, registered the `on_create` function, and executed it with the correct arguments.

However, if we update the Lua script to include some forbidden (sandboxed) commands like the following:

```lua
-- hooks.lua
function on_create(message)
  os.execute("echo 'Should not run!'")  -- This will error out
  print("[lua log]: " .. message)
end
```

We would get the following error, as Lua doesn’t have access to the `os` library.

```bash
$ go run main.go
Failed to execute Lua hook: hooks.lua:2: attempt to index a non-table object(nil) with key 'execute'
stack traceback:
	hooks.lua:2: in main chunk
	[G]: ?
```

This way, you can easily extend your programs to perform custom logic while ensuring that the scripts will run in a safe and controlled environment.

## Bonus - Hammerspoon

During my research for this article, I came across a very interesting tool called [Hammerspoon](https://www.hammerspoon.org/). Hammerspoon is an automation tool designed for macOS that exposes various system-level APIs in Lua.

That means you can write custom Lua scripts to control and automate your system with ease.

It offers many system APIs, such as window movement, menubar management, listening to application and system events, key bindings, and so on.

It has a huge collection of community-developed scripts, so-called _spoons_, and many useful automations have already been made. It is definitely worth a look.
