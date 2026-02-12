
What is SpacetimeDB?
SpacetimeDB is a database that is also a server.

SpacetimeDB is a full-featured relational database system that lets you run your application logic inside the database. You no longer need to deploy a separate web or game server. Several programming languages are supported, including C# and Rust. You can still write authorization logic, just like you would in a traditional server.

This means that you can write your entire application in a single language and deploy it as a single binary. No more microservices, no more containers, no more Kubernetes, no more Docker, no more VMs, no more DevOps, no more infrastructure, no more ops, no more servers.

SpacetimeDB Architecture
SpacetimeDB application architecture
(elements in white are provided by SpacetimeDB)

In fact, it's so fast that we've been able to write the entire backend of our MMORPG BitCraft Online as a single SpacetimeDB database. Everything in the game -- chat messages, items, resources, terrain, and player locations -- is stored and processed by the database. SpacetimeDB automatically mirrors relevant state to connected players in real-time.

SpacetimeDB is optimized for maximum speed and minimum latency, rather than batch processing or analytical workloads. It is designed for real-time applications like games, chat, and collaboration tools.

Speed and latency is achieved by holding all of your application state in memory, while persisting data to a commit log which is used to recover data after restarts and system crashes.

Application Workflow Preview
SpacetimeDB Application Workflow Preview
SpacetimeDB Application Workflow Preview
The above illustrates the workflow when using SpacetimeDB.

All client-side reads happen with the data view that is cached locally.

Client-side subscriptions tell the server what data client cares about and wants to be synced within its data view. Changes to data will be pushed by the server to the client cache.

RLS filters restrict the data view server-side before subscriptions are evaluated. These filters can be used for access control or client scoping.

Reducers are effectively async RPC's. The request is sent off and if the results of that reducer makes changes to data, it will be written to the database directly. As a result of that, if those changes make it through the two layers above, then the client will see the result when it queries its local cache.

State Mirroring
SpacetimeDB can generate client code in a variety of languages. This creates a client library custom-designed to talk to your database. It provides easy-to-use interfaces for connecting to the database and submitting requests. It can also automatically mirror state from your database to client applications.

You write SQL queries specifying what information a client is interested in -- for instance, the terrain and items near a player's avatar. SpacetimeDB will generate types in your client language for the relevant tables, and feed clients a stream of live updates whenever the database state changes. Note that this is a read-only mirror -- the only way to change the database is to submit requests, which are validated on the server.

The Zen of SpacetimeDB
SpacetimeDB is built on 5 core principles. As you embrace these simple principles, you will find your troubles simply melt away. These principles guide both how we develop SpacetimeDB and how you should think about building applications with it.

Everything is a Table
Your entire application state lives in tables. Users, messages, game entities, sessions—all tables. There's no separate cache layer, no Redis, no in-memory state that needs to be synchronized with a database. The database is your state. All of your state.

This simplifies your mental model dramatically and it makes the impossible possible. SpacetimeDB can hot-swap server code without disconnecting clients!

When you need to store something, you define a table. When you need to query something, you query a table. When you need to update something, you update a table. When you want to restrict who can read data, you create a table.

Traditional stack:        SpacetimeDB:
┌─────────────────┐       ┌─────────────────┐
│   Application   │       │                 │
├─────────────────┤       │                 │
│      Cache      │  →    │     Tables      │
├─────────────────┤       │                 │
│    Database     │       │                 │
└─────────────────┘       └─────────────────┘

Everything is Persistent
SpacetimeDB persists everything by default, including the full history of any rows that have ever changed.

You will ask, does everything need to be persistent? Won't that be a lot of data? Well, you would be surprised! For example, updating 1 million player transforms 10 times per second for a year uses roughly 10 petabytes of data, uncompressed. SpacetimeDB can compress that sort of data by about 5-10x, meaning that keeping every position for every player for a game with a million concurrent players uses only about 1-2 petabytes per year. Storing that much data in Amazon S3 would only cost you between $2,300 and $5,600 per month. A fraction of the cost of a single engineer or data scientist!

You can of course choose to delete the historical data, but it should be your choice to delete data, not the database's. SpacetimeDB gives you that choice.

Won't it be slow to persist everything? No. SpacetimeDB is designed so that persistence guarantees only ever increase latency and never decrease throughput! Modern SSDs can write upwards of 15 GB/s of data to disk. DRAM can only do about 4x more. Let's actually use that Samsung-given bandwidth.

SpacetimeDB holds all your data in memory for blazing-fast access, but automatically persists everything to disk. You get the speed of in-memory computing with the durability of a traditional database.

You will be tempted to ask for "ephemeral state". This is a mistake. Persistent everything allows your app to recover to the exact state it was in. In principle, you could even debug your production app in the state it was in in the past with a time-traveling debugger.

Write your code as if memory were infinite and permanent. Insert rows freely. Query without fear. SpacetimeDB handles the persistence, you handle the logic.

Everything is Real-Time
Think of your client as a replica of your server. When you subscribe to data, SpacetimeDB mirrors that data to your client and keeps it synchronized automatically. You don't poll. You don't fetch. You subscribe, and the data flows.

"The data must flow." - Tyler

// Subscribe once
const [messages] = useTable(tables.message);

// messages updates automatically when the server state changes
// No polling. No refetching. Just reactive data.
This changes how you think about client-server communication. Stop thinking in terms of requests and responses. Think in terms of synchronized state updating in real-time.

Your users should never click a refresh button.

Everything is Transactional
Every reducer runs in a transaction. They are atomic. They either fully complete or don't run at all. If something goes wrong, just throw an error (or return Err). All your changes roll back automatically. No partial updates. No corrupted state. No cleanup code.

#[spacetimedb::reducer]
fn transfer_funds(ctx: &ReducerContext, from: u64, to: u64, amount: u64) -> Result<(), String> {
    let sender = ctx.db.account().id().find(from).ok_or("Sender not found")?;
    if sender.balance < amount {
        return Err("Insufficient funds".to_string()); // Everything rolls back
    }
    // ... rest of transfer
    Ok(())
}
This means you can write your business logic boldly. Try things. If they fail, the database remains consistent.

Perfect consistency, always.

Everything is Programmable
SpacetimeDB doesn't limit you to declarative rules or configuration files. Your module is real code (Rust, C#, or TypeScript) running inside the database. You have the full power of a procedural, normal programming language at your disposal.

Need custom authorization logic? Write a function. Need to validate complex business rules? Write a function. Need to transform data before storing it? Write a function.

Even access control is programmable. While SpacetimeDB provides sensible defaults (public vs. private tables), you can implement any access pattern you can express in code.

Including the meta permissions to manage and control the application's deployment itself.

"Enterprise clients require increasingly granular permissions, fractal-like in nature." - Tyler

All programmable means all powerful.

Never settle for less than Turing complete.

The Result
When you embrace these principles, building real-time applications becomes remarkably simple:

No backend servers to deploy - your logic runs in the database
No caching layer to manage - the database is already in memory
No sync code to write - subscriptions handle it automatically
No rollback logic to maintain - transactions handle it automatically
No limitations on your logic - it's just code
This is the Zen of SpacetimeDB: a simpler way to build and live.


Key Architecture
Host
A SpacetimeDB host is a server that hosts databases. You can run your own host, or use the SpacetimeDB maincloud. Many databases can run on a single host.

Database
A SpacetimeDB database is an application that runs on a host.

A database exports tables, which store data, and reducers, which allow clients to make requests.

A database's schema and business logic is specified by a piece of software called a module. Modules can be written in C#, Rust or TypeScript.

(Technically, a SpacetimeDB module is a WebAssembly module or JavaScript bundle, that imports a specific low-level WebAssembly ABI and exports a small number of special functions. However, the SpacetimeDB server-side libraries hide these low-level details. As a developer, writing a module is mostly like writing any other C# or Rust application, except for the fact that a special CLI tool is used to deploy the application.)

Table
A SpacetimeDB table is a SQL database table. Tables are declared in a module's native language. For instance, in C#, a table is declared like so:

TypeScript
C#
Rust
import { table, t } from 'spacetimedb/server';

const players = table(
  { name: 'players', public: true },
  {
    id: t.u64().primaryKey(),
    name: t.string(),
    age: t.u32(),
    user: t.identity(),
  }
);
The contents of a table can be read and updated by reducers. Tables marked public can also be read by clients.

Reducer
A reducer is a function exported by a database. Connected clients can call reducers to interact with the database. This is a form of remote procedure call.

TypeScript
C#
Rust
A reducer can be written in a TypeScript module like so:

spacetimedb.reducer('set_player_name', { id: t.u64(), name: t.string() }, (ctx, { id, name }) => {
   // ...
});
And a TypeScript client can call that reducer:

function main() {
   // ...setup code, then...
   ctx.reducers.setPlayerName(57n, "Marceline");
}
These look mostly like regular function calls, but under the hood, the client sends a request over the internet, which the database processes and responds to.

The ReducerContext is a reducer's only mandatory parameter and includes information about the caller's identity. This can be used to authenticate the caller.

Reducers are run in their own separate and atomic database transactions. When a reducer completes successfully, the changes the reducer has made, such as inserting a table row, are committed to the database. However, if the reducer instead returns an error, or throws an exception, the database will instead reject the request and revert all those changes. That is, reducers and transactions are all-or-nothing requests. It's not possible to keep the first half of a reducer's changes and discard the last.

Transactions are only started by requests from outside the database. When a reducer calls another reducer directly, as in the example below, the changes in the called reducer does not happen in its own child transaction. Instead, when the nested reducer gracefully errors, and the overall reducer completes successfully, the changes in the nested one are still persisted.

TypeScript
C#
Rust
spacetimedb.reducer('hello', (ctx) => {
   try {
      world(ctx);
   } catch {
      otherChanges(ctx);
   }
});

const world = spacetimedb.reducer('world', (ctx) => {
   clearAllTables(ctx);
   // ...
});
While SpacetimeDB doesn't support nested transactions, a reducer can schedule another reducer to run at an interval, or at a specific time.

See Reducers for more details about reducers.

Procedure
A procedure is a function exported by a database, similar to a reducer. Connected clients can call procedures. Procedures can perform additional operations not possible in reducers, including making HTTP requests to external services. However, procedures don't automatically run in database transactions, and must manually open and commit a transaction in order to read from or modify the database state.

Procedures are currently in beta, and their API may change in upcoming SpacetimeDB releases.

TypeScript
C#
Rust
Unreal C++
Unreal Blueprint
A procedure can be defined in a TypeScript module:

spacetimedb.procedure("make_request", t.string(), ctx => {
   // ...
})
And a TypeScript client can call that procedure:

ctx.procedures.makeRequest();
A TypeScript client can also register a callback to run when a procedure call finishes, which will be invoked with that procedure's return value:

ctx.procedures.makeRequest().then(
    res => console.log(`Procedure make_request returned ${res}`),
    err => console.error(`Procedure make_request failed! ${err}`),
);
See Procedures for more details about procedures.

View
A view is a read-only function exported by a database that computes and returns results from tables. Unlike reducers, views do not modify database state - they only query and return data. Views are useful for computing derived data, aggregations, or joining multiple tables before sending results to clients.

Views must be declared as public and accept only a context parameter. They can return either a single row or multiple rows. Like tables, views can be subscribed to and automatically update when their underlying data changes.

TypeScript
C#
Rust
A view can be written in a TypeScript module like so:

spacetimedb.view(
  { name: 'my_player', public: true },
  t.option(players.row()),
  (ctx) => {
    const row = ctx.db.players.identity.find(ctx.sender);
    return row ?? null;
  }
);
Views can be queried and subscribed to using SQL:

SELECT * FROM my_player;
See Views for more details about views.

Client
A client is an application that connects to a database. A client logs in using an identity and receives an connection id to identify the connection. After that, it can call reducers and query public tables.

Clients are written using the client-side SDKs. The spacetime CLI tool allows automatically generating code that works with the client-side SDKs to talk to a particular database.

Clients are regular software applications that developers can choose how to deploy (through Steam, app stores, package managers, or any other software deployment method, depending on the needs of the application.)

Identity
A SpacetimeDB Identity identifies someone interacting with a database. It is a long lived, public, globally valid identifier that will always refer to the same end user, even across different connections.

A user's Identity is attached to every reducer call they make, and you can use this to decide what they are allowed to do.

Modules themselves also have Identities. When you spacetime publish a module, it will automatically be issued an Identity to distinguish it from other modules. Your client application will need to provide this Identity when connecting to the host.

Identities are issued using the OpenID Connect specification. Database developers are responsible for issuing Identities to their end users. OpenID Connect lets users log in to these accounts through standard services like Google and Facebook.

Specifically, an identity is derived from the issuer and subject fields of a JSON Web Token (JWT) hashed together. The psuedocode for this is as follows:

def identity_from_claims(issuer: str, subject: str) -> [u8; 32]:
   hash1: [u8; 32] = blake3_hash(issuer + "|" + subject)
   id_hash: [u8; 26] = hash1[:26]
   checksum_hash: [u8; 32] = blake3_hash([
      0xC2,
      0x00,
      *id_hash
   ])
   identity_big_endian_bytes: [u8; 32] = [
      0xC2,
      0x00,
      *checksum_hash[:4],
      *id_hash
   ]
   return identity_big_endian_bytes
You can obtain a JWT from our turnkey identity provider SpacetimeAuth, or you can get one from any OpenID Connect compliant identity provider.

ConnectionId
A ConnectionId identifies client connections to a SpacetimeDB database.

A user has a single Identity, but may open multiple connections to your database. Each of these will receive a unique ConnectionId.

Energy
Energy is the currency used to pay for data storage and compute operations in a SpacetimeDB host.


React Quickstart
Get a SpacetimeDB React app running in under 5 minutes.

Prerequisites
Node.js 18+ installed
SpacetimeDB CLI installed
Install the SpacetimeDB CLI tool
Create your project
Run the spacetime dev command to create a new project with a SpacetimeDB module and React client.

This will start the local SpacetimeDB server, publish your module, generate TypeScript bindings, and start the React development server.

spacetime dev --template react-ts my-spacetime-app
Open your app
Navigate to http://localhost:5173 to see your app running.

The template includes a basic React app connected to SpacetimeDB.

Explore the project structure
Your project contains both server and client code.

Edit spacetimedb/src/index.ts to add tables and reducers. Edit client/src/App.tsx to build your UI.

my-spacetime-app/
├── spacetimedb/          # Your SpacetimeDB module
│   └── src/
│       └── index.ts      # Server-side logic
├── client/               # React frontend
│   └── src/
│       ├── App.tsx
│       └── module_bindings/  # Auto-generated types
└── package.json

Understand tables and reducers
Open spacetimedb/src/index.ts to see the module code. The template includes a person table and two reducers: add to insert a person, and say_hello to greet everyone.

Tables store your data. Reducers are functions that modify data — they're the only way to write to the database.

import { schema, table, t } from 'spacetimedb/server';

export const spacetimedb = schema(
  table(
    { name: 'person', public: true },
    {
      name: t.string(),
    }
  )
);

spacetimedb.reducer('add', { name: t.string() }, (ctx, { name }) => {
  ctx.db.person.insert({ name });
});

spacetimedb.reducer('say_hello', (ctx) => {
  for (const person of ctx.db.person.iter()) {
    console.info(`Hello, ${person.name}!`);
  }
  console.info('Hello, World!');
});
Test with the CLI
Use the SpacetimeDB CLI to call reducers and query your data directly.

# Call the add reducer to insert a person
spacetime call <database-name> add Alice

# Query the person table
spacetime sql <database-name> "SELECT * FROM person"
 name
---------
 "Alice"

# Call say_hello to greet everyone
spacetime call <database-name> say_hello

# View the module logs
spacetime logs <database-name>
2025-01-13T12:00:00.000000Z  INFO: Hello, Alice!
2025-01-13T12:00:00.000000Z  INFO: Hello, World!
Next steps
See the Chat App Tutorial for a complete example
Read the TypeScript SDK Reference for detailed API docs
Edit this page

TypeScript Quickstart
Get a SpacetimeDB TypeScript app running in under 5 minutes.

Prerequisites
Node.js 18+ installed
SpacetimeDB CLI installed
Install the SpacetimeDB CLI tool
Create your project
Run the spacetime dev command to create a new project with a TypeScript SpacetimeDB module.

This will start the local SpacetimeDB server, publish your module, and generate TypeScript client bindings.

spacetime dev --template basic-ts my-spacetime-app
Explore the project structure
Your project contains both server and client code.

Edit spacetimedb/src/index.ts to add tables and reducers. Use the generated bindings in client/src/module_bindings/ to build your client.

my-spacetime-app/
├── spacetimedb/          # Your SpacetimeDB module
│   └── src/
│       └── index.ts      # Server-side logic
├── client/               # Client application
│   └── src/
│       ├── index.ts
│       └── module_bindings/  # Auto-generated types
└── package.json

Understand tables and reducers
Open spacetimedb/src/index.ts to see the module code. The template includes a person table and two reducers: add to insert a person, and say_hello to greet everyone.

Tables store your data. Reducers are functions that modify data — they're the only way to write to the database.

import { schema, table, t } from 'spacetimedb/server';

export const spacetimedb = schema(
  table(
    { name: 'person' },
    {
      name: t.string(),
    }
  )
);

spacetimedb.reducer('add', { name: t.string() }, (ctx, { name }) => {
  ctx.db.person.insert({ name });
});

spacetimedb.reducer('say_hello', (ctx) => {
  for (const person of ctx.db.person.iter()) {
    console.info(`Hello, ${person.name}!`);
  }
  console.info('Hello, World!');
});
Test with the CLI
Use the SpacetimeDB CLI to call reducers and query your data directly.

# Call the add reducer to insert a person
spacetime call <database-name> add Alice

# Query the person table
spacetime sql <database-name> "SELECT * FROM person"
 name
---------
 "Alice"

# Call say_hello to greet everyone
spacetime call <database-name> say_hello

# View the module logs
spacetime logs <database-name>
2025-01-13T12:00:00.000000Z  INFO: Hello, Alice!
2025-01-13T12:00:00.000000Z  INFO: Hello, World!
Next steps
See the Chat App Tutorial for a complete example
Read the TypeScript SDK Reference for detailed API docs
Chat App Tutorial
In this tutorial, we'll implement a simple chat server as a SpacetimeDB module. You can write your module in TypeScript, C#, or Rust - use the tabs throughout this guide to see code examples in your preferred language.

A SpacetimeDB module is code that gets compiled and uploaded to SpacetimeDB. This code becomes server-side logic that interfaces directly with SpacetimeDB's relational database.

Each SpacetimeDB module defines a set of tables and a set of reducers.

TypeScript
C#
Rust
Tables are declared with table({ ...opts }, { ...columns }). Each inserted object is a row; each field is a column.
Tables are private by default (readable only by the owner and your module code). Set { public: true } to make them readable by everyone; writes still happen only via reducers.
A reducer is a function that reads/writes the database. Each reducer runs in its own transaction; its writes commit only if it completes without throwing.
note
SpacetimeDB runs your module inside the database host (not Node.js). There's no direct filesystem or network access from reducers.

Install SpacetimeDB
If you haven't already, start by installing SpacetimeDB. This installs the spacetime CLI used to build, publish, and interact with your database.

Install the SpacetimeDB CLI tool
TypeScript
C#
Rust
No additional installation needed - Node.js/npm will handle dependencies.

Project structure
Let's start by running spacetime init to initialize our project's directory structure:

TypeScript
C#
Rust
spacetime init --lang typescript quickstart-chat
spacetime init will ask you for a project path in which to put your project. By default this will be ./quickstart-chat. This basic project will have a few helper files like Cursor rules for SpacetimeDB and a spacetimedb directory which is where your SpacetimeDB module code will go.

TypeScript
C#
Rust
Inside the spacetimedb/ directory will be a src/index.ts entrypoint (required for publishing).

Declare imports
TypeScript
C#
Rust
Open spacetimedb/src/index.ts. Replace its contents with the following imports:

import { schema, t, table, SenderError } from 'spacetimedb/server';
From spacetimedb/server, we import:

table to define SpacetimeDB tables.
t for column/type builders.
schema to compose our database schema and register reducers.
SenderError to signal user-visible (transaction-aborting) errors.
Define tables
We'll store two kinds of data: information about each user, and the messages that have been sent.

For each User, we'll store their Identity (the caller's unique identifier), an optional display name, and whether they're currently online. We'll use Identity as the primary key (unique and indexed).

TypeScript
C#
Rust
Add to spacetimedb/src/index.ts:

const User = table(
  { name: 'user', public: true },
  {
    identity: t.identity().primaryKey(),
    name: t.string().optional(),
    online: t.bool(),
  }
);

const Message = table(
  { name: 'message', public: true },
  {
    sender: t.identity(),
    sent: t.timestamp(),
    text: t.string(),
  }
);

// Compose the schema (gives us ctx.db.user and ctx.db.message, etc.)
const spacetimedb = schema(User, Message);
Set users' names
We'll allow users to set a display name, since raw identities aren't user-friendly. Define a reducer that validates input, looks up the caller's User row by primary key, and updates it.

TypeScript
C#
Rust
Add:

function validateName(name: string) {
  if (!name) {
    throw new SenderError('Names must not be empty');
  }
}

spacetimedb.reducer('set_name', { name: t.string() }, (ctx, { name }) => {
  validateName(name);
  const user = ctx.db.user.identity.find(ctx.sender);
  if (!user) {
    throw new SenderError('Cannot set name for unknown user');
  }
  ctx.db.user.identity.update({ ...user, name });
});
You can extend validation with moderation checks, Unicode normalization, max length checks, or duplicate-name rejection.

Send messages
Define a reducer to insert a new Message with the caller's identity and the call timestamp.

TypeScript
C#
Rust
Add:

function validateMessage(text: string) {
  if (!text) {
    throw new SenderError('Messages must not be empty');
  }
}

spacetimedb.reducer('send_message', { text: t.string() }, (ctx, { text }) => {
  validateMessage(text);
  console.info(`User ${ctx.sender}: ${text}`);
  ctx.db.message.insert({
    sender: ctx.sender,
    text,
    sent: ctx.timestamp,
  });
});
Set users' online status
SpacetimeDB can invoke lifecycle reducers when clients connect/disconnect. We'll create or update a User row to mark the caller online on connect, and mark them offline on disconnect.

TypeScript
C#
Rust
Add:

spacetimedb.init(_ctx => {});

spacetimedb.clientConnected(ctx => {
  const user = ctx.db.user.identity.find(ctx.sender);
  if (user) {
    ctx.db.user.identity.update({ ...user, online: true });
  } else {
    ctx.db.user.insert({
      identity: ctx.sender,
      name: undefined,
      online: true,
    });
  }
});

spacetimedb.clientDisconnected(ctx => {
  const user = ctx.db.user.identity.find(ctx.sender);
  if (user) {
    ctx.db.user.identity.update({ ...user, online: false });
  } else {
    console.warn(
      `Disconnect event for unknown user with identity ${ctx.sender}`
    );
  }
});
Start the server
If you haven't already started the SpacetimeDB host, run this in a separate terminal and leave it running:

spacetime start
Publish the module
From the quickstart-chat directory:

TypeScript
C#
Rust
spacetime publish --server local --project-path spacetimedb quickstart-chat
You can choose any unique database name in place of quickstart-chat. Must be alphanumeric with internal hyphens.

Call reducers
Use the CLI to call reducers. Arguments are passed as JSON:

TypeScript
C#
Rust
spacetime call --server local quickstart-chat send_message 'Hello, World!'
Check that it ran by viewing logs:

spacetime logs --server local quickstart-chat
SQL queries
SpacetimeDB supports a subset of SQL so you can query your data:

spacetime sql --server local quickstart-chat "SELECT * FROM message"
Output will resemble:

 sender                                                             | sent                             | text
--------------------------------------------------------------------+----------------------------------+-----------------
 0x93dda09db9a56d8fa6c024d843e805d8262191db3b4ba84c5efcd1ad451fed4e | 2025-04-08T15:47:46.935402+00:00 | "Hello, World!"
You've just set up your first SpacetimeDB module! You can find the full code for this module:

TypeScript server module
C# server module
Rust server module
Creating the Client
Next, you'll learn how to create a SpacetimeDB client application. Choose your preferred client language below.

TypeScript (React)
C# (Console)
Rust (Console)
Next, you'll learn how to use TypeScript to create a SpacetimeDB client application.

By the end of this introduction, you will have created a basic single page web app which connects to the quickstart-chat database you just created.

Project structure
Make sure you're in the quickstart-chat directory you created earlier in this guide:

cd quickstart-chat
Initialize a React app in the current directory:

pnpm create vite@latest . -- --template react-ts
pnpm install
We also need to install the spacetimedb package:

pnpm install spacetimedb
note
If you are using another package manager like yarn or npm, the same steps should work with the appropriate commands for those tools.

warning
The @clockworklabs/spacetimedb-sdk package has been deprecated in favor of the spacetimedb package as of SpacetimeDB version 1.4.0. If you are using the old SDK package, you will need to switch to spacetimedb. You will also need a SpacetimeDB CLI version of 1.4.0+ to generate bindings for the new spacetimedb package.

You can now pnpm run dev to see the Vite template app running at http://localhost:5173.

Basic layout
The app we're going to create is a basic chat application. We will begin by creating a layout for our app. The webpage will contain four sections:

A profile section, where we can set our name.
A message section, where we can see all the messages.
A system section, where we can see system messages.
A new message section, where we can send a new message.
Replace the entire contents of src/App.tsx with the following:

import React, { useEffect, useState } from 'react';
import { Message, tables, reducers } from './module_bindings';
import { useSpacetimeDB, useTable, where, eq, useReducer } from 'spacetimedb/react';
import { Identity, Timestamp } from 'spacetimedb';
import './App.css';

export type PrettyMessage = {
  senderName: string;
  text: string;
  sent: Timestamp;
  kind: 'system' | 'user';
};

function App() {
  const [newName, setNewName] = useState('');
  const [settingName, setSettingName] = useState(false);
  const [systemMessages, setSystemMessages] = useState([] as Infer<typeof Message>[]);
  const [newMessage, setNewMessage] = useState('');

  const onlineUsers: User[] = [];
  const offlineUsers: User[] = [];
  const users = [...onlineUsers, ...offlineUsers];
  const prettyMessages: PrettyMessage[] = [];

  const name = '';

  const onSubmitNewName = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSettingName(false);
    // TODO: Call `setName` reducer
  };

  const onSubmitMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewMessage('');
    // TODO: Call `sendMessage` reducer
  };

  return (
    <div className="App">
      <div className="profile">
        <h1>Profile</h1>
        {!settingName ? (
          <>
            <p>{name}</p>
            <button
              onClick={() => {
                setSettingName(true);
                setNewName(name);
              }}
            >
              Edit Name
            </button>
          </>
        ) : (
          <form onSubmit={onSubmitNewName}>
            <input
              type="text"
              aria-label="username input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <button type="submit">Submit</button>
          </form>
        )}
      </div>
      <div className="message-panel">
        <h1>Messages</h1>
        {prettyMessages.length < 1 && <p>No messages</p>}
        <div className="messages">
          {prettyMessages.map((message, key) => {
            const sentDate = message.sent.toDate();
            const now = new Date();
            const isOlderThanDay =
              now.getFullYear() !== sentDate.getFullYear() ||
              now.getMonth() !== sentDate.getMonth() ||
              now.getDate() !== sentDate.getDate();

            const timeString = sentDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const dateString = isOlderThanDay
              ? sentDate.toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }) + ' '
              : '';

            return (
              <div
                key={key}
                className={
                  message.kind === 'system' ? 'system-message' : 'user-message'
                }
              >
                <p>
                  <b>
                    {message.kind === 'system' ? 'System' : message.senderName}
                  </b>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      marginLeft: '0.5rem',
                      color: '#666',
                    }}
                  >
                    {dateString}
                    {timeString}
                  </span>
                </p>
                <p>{message.text}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="online" style={{ whiteSpace: 'pre-wrap' }}>
        <h1>Online</h1>
        <div>
          {onlineUsers.map((user, key) => (
            <div key={key}>
              <p>{user.name || user.identity.toHexString().substring(0, 8)}</p>
            </div>
          ))}
        </div>
        {offlineUsers.length > 0 && (
          <div>
            <h1>Offline</h1>
            {offlineUsers.map((user, key) => (
              <div key={key}>
                <p>
                  {user.name || user.identity.toHexString().substring(0, 8)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="new-message">
        <form
          onSubmit={onSubmitMessage}
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '50%',
            margin: '0 auto',
          }}
        >
          <h3>New Message</h3>
          <textarea
            aria-label="message input"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
          ></textarea>
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;
We have configured the onSubmitNewName and onSubmitMessage callbacks to be called when the user clicks the submit button in the profile and new message sections, respectively. For now, they do nothing when called, but later we'll add some logic to call SpacetimeDB reducers when these callbacks are called.

Let's also make it pretty. Replace the contents of src/App.css with the following:

.App {
  display: grid;
  /* 
    3 rows: 
      1) Profile
      2) Main content (left = message, right = online)
      3) New message
  */
  grid-template-rows: auto 1fr auto;
  /* 2 columns: left for chat, right for online */
  grid-template-columns: 2fr 1fr;

  height: 100vh; /* fill viewport height */
  width: clamp(300px, 100%, 1200px);
  margin: 0 auto;
}

/* ----- Profile (Row 1, spans both columns) ----- */
.profile {
  grid-column: 1 / 3;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--theme-color);
}

.profile h1 {
  margin-right: auto; /* pushes name/edit form to the right */
}

.profile form {
  display: flex;
  flex-grow: 1;
  align-items: center;
  gap: 0.5rem;
  max-width: 300px;
}

.profile form input {
  background-color: var(--textbox-color);
}

/* ----- Chat Messages (Row 2, Col 1) ----- */
.message-panel {
  grid-row: 2 / 3;
  grid-column: 1 / 2;

  /* Ensure this section scrolls if content is long */
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.system-message {
  background-color: var(--theme-color);
  color: var(--theme-color-contrast);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-style: italic;
}

.user-message {
  background-color: var(--textbox-color);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
}

.message h1 {
  margin-right: 0.5rem;
}

/* ----- Online Panel (Row 2, Col 2) ----- */
.online {
  grid-row: 2 / 3;
  grid-column: 2 / 3;

  /* Also scroll independently if needed */
  overflow-y: auto;
  padding: 1rem;
  border-left: 1px solid var(--theme-color);
  white-space: pre-wrap;
  font-family: monospace;
}

/* ----- New Message (Row 3, spans columns 1-2) ----- */
.new-message {
  grid-column: 1 / 3;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid var(--theme-color);
}

.new-message form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 600px;
}

.new-message form h3 {
  margin-bottom: 0.25rem;
}

/* Distinct background for the textarea */
.new-message form textarea {
  font-family: monospace;
  font-weight: 400;
  font-size: 1rem;
  resize: vertical;
  min-height: 80px;
  background-color: var(--textbox-color);
  color: inherit;

  /* Subtle shadow for visibility */
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.24);
}

@media (prefers-color-scheme: dark) {
  .new-message form textarea {
    box-shadow: 0 0 0 1px #17492b;
  }
}
Next, we need to replace the global styles in src/index.css as well:

/* ----- CSS Reset & Global Settings ----- */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ----- Color Variables ----- */
:root {
  --theme-color: #3dc373;
  --theme-color-contrast: #08180e;
  --textbox-color: #edfef4;
  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --theme-color: #4cf490;
    --theme-color-contrast: #132219;
    --textbox-color: #0f311d;
  }
}

/* ----- Page Setup ----- */
html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
    'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family:
    source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
}

/* ----- Buttons ----- */
button {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background-color: var(--theme-color);
  color: var(--theme-color-contrast);
  cursor: pointer;
  font-weight: 600;
  letter-spacing: 0.1px;
  font-family: monospace;
}

/* ----- Inputs & Textareas ----- */
input,
textarea {
  border: none;
  border-radius: 0.375rem;
  caret-color: var(--theme-color);
  font-family: monospace;
  font-weight: 600;
  letter-spacing: 0.1px;
  padding: 0.5rem 0.75rem;
}

input:focus,
textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--theme-color);
}
Generate your module types
Before we can run the app, we need to generate the TypeScript bindings that App.tsx imports. The spacetime CLI's generate command generates client-side interfaces for the tables, reducers, and types defined in your server module.

In your quickstart-chat directory, run:

spacetime generate --lang typescript --out-dir src/module_bindings --project-path spacetimedb
Take a look inside src/module_bindings. The CLI should have generated several files:

module_bindings
├── client_connected_reducer.ts
├── client_disconnected_reducer.ts
├── index.ts
├── init_reducer.ts
├── message_table.ts
├── message_type.ts
├── send_message_reducer.ts
├── set_name_reducer.ts
├── user_table.ts
└── user_type.ts

With spacetime generate we have generated TypeScript types derived from the types you specified in your module, which we can conveniently use in our client. We've placed these in the module_bindings folder.

Now you can run pnpm run dev and open http://localhost:5173 to see your app's layout. It won't connect to SpacetimeDB yet - let's fix that next.

The main entry to the SpacetimeDB API is the DbConnection, a type that manages a connection to a remote database. Let's import it and a few other types into our src/main.tsx below our other imports:

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Identity } from 'spacetimedb';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection, type ErrorContext } from './module_bindings/index.ts';
Note that we are importing DbConnection from our module_bindings because it is a code generated type with all the type information about our tables and types.

We've also imported the SpacetimeDBProvider React component which will allow us to connect our SpacetimeDB state directly to our React state seamlessly.

Create your SpacetimeDB client
Now that we've imported the DbConnection type, we can use it to connect our app to our database.

Replace the body of the main.tsx file with the following, just below your imports:

const onConnect = (conn: DbConnection, identity: Identity, token: string) => {
  localStorage.setItem('auth_token', token);
  console.log(
    'Connected to SpacetimeDB with identity:',
    identity.toHexString()
  );
  conn.reducers.onSendMessage(() => {
    console.log('Message sent.');
  });
};

const onDisconnect = () => {
  console.log('Disconnected from SpacetimeDB');
};

const onConnectError = (_ctx: ErrorContext, err: Error) => {
  console.log('Error connecting to SpacetimeDB:', err);
};

const connectionBuilder = DbConnection.builder()
  .withUri('ws://localhost:3000')
  .withModuleName('quickstart-chat')
  .withToken(localStorage.getItem('auth_token') || undefined)
  .onConnect(onConnect)
  .onDisconnect(onDisconnect)
  .onConnectError(onConnectError);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <App />
    </SpacetimeDBProvider>
  </StrictMode>
);
Here we are configuring our SpacetimeDB connection by specifying the server URI, database name, and a few callbacks including the onConnect callback. When onConnect is called after connecting, we store the connection state, our Identity, and our SpacetimeDB credentials in our React state. If there is an error connecting, we also print that error to the console.

We are also using localStorage to store our SpacetimeDB credentials. This way, we can reconnect to SpacetimeDB with the same Identity and token if we refresh the page. The first time we connect, we won't have any credentials stored, so we pass undefined to the withToken method. This will cause SpacetimeDB to generate new credentials for us.

If you chose a different name for your database, replace quickstart-chat with that name, or republish your module as quickstart-chat.

Our React hooks will subscribe to the data in SpacetimeDB. When we subscribe, SpacetimeDB will run our subscription queries and store the result in a local "client cache". This cache will be updated in real-time as the data in the table changes on the server.

We pass our connection configuration directly to the SpacetimeDBProvider, which will manage our connection to SpacetimeDB.

Accessing the Data
Once SpacetimeDB is connected, we can easily access the data in the client cache using SpacetimeDB's provided React hooks, useTable and useSpacetimeDB.

useTable is the simplest way to access your database data. useTable subscribes your React app to data in a SpacetimeDB table so that it updates as the data changes. It essentially acts just like useState in React except the data is being updated in real-time from SpacetimeDB tables.

useSpacetimeDB gives you direct access to the connection in case you want to check the state of the connection or access database table state. Note that useSpacetimeDB does not automatically subscribe your app to data in the database.

Add the following useSpacetimeDB hook to the top of your render function in App.tsx, just below your useState declarations.

const { identity, isActive: connected } = useSpacetimeDB();
const setName = useReducer(reducers.setName);
const sendMessage = useReducer(reducers.sendMessage);

// Subscribe to all messages in the chat
const [messages] = useTable(tables.message);
Next replace const onlineUsers: User[] = []; with the following:

// Subscribe to all online users in the chat
// so we can show who's online and demonstrate
// the `where` and `eq` query expressions
const [onlineUsers] = useTable(
  tables.user,
  where(eq('online', true))
);
Notice that we can filter users in the user table based on their online status by passing a query expression into the useTable hook as the second argument.

Let's now prettify our messages in our render function by sorting them by their sent timestamp, and joining the username of the sender to the message by looking up the user by their Identity in the user table. Replace const prettyMessages: PrettyMessage[] = []; with the following:

const prettyMessages: PrettyMessage[] = messages
  .sort((a, b) => (a.sent.toDate() > b.sent.toDate() ? 1 : -1))
  .map(message => {
    const user = users.find(
      u => u.identity.toHexString() === message.sender.toHexString()
    );
    return {
      senderName: user?.name || message.sender.toHexString().substring(0, 8),
      text: message.text,
      sent: message.sent,
      kind: Identity.zero().isEqual(message.sender) ? 'system' : 'user',
    };
  });
That's all we have to do to hook up our SpacetimeDB state to our React state. SpacetimeDB ensures that any changes on the server are pushed down to our application and rerendered on screen in real-time.

Let's also update our render function to show a loading message while we're connecting to SpacetimeDB. Add this just below our prettyMessages declaration:

if (!connected || !identity) {
  return (
    <div className="App">
      <h1>Connecting...</h1>
    </div>
  );
}
Finally, let's also compute the name of the user from the Identity in our name variable. Replace const name = ''; with the following:

const name = (() => {
  const user = users.find(u => u.identity.isEqual(identity));
  return user?.name || identity?.toHexString().substring(0, 8) || '';
})();
Calling Reducers
Let's hook up our callbacks so we can send some messages and see them displayed in the app after they are synchronised by SpacetimeDB. We need to update the onSubmitNewName and onSubmitMessage callbacks to send the appropriate reducer to the module.

Modify the onSubmitNewName callback by adding a call to the setName reducer:

const onSubmitNewName = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setSettingName(false);
  setName({ name: newName });
};
Next, modify the onSubmitMessage callback by adding a call to the sendMessage reducer:

const onSubmitMessage = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setNewMessage('');
  sendMessage({ text: newMessage });
};
SpacetimeDB generated these functions for us based on the type information provided by our module. Calling these functions will invoke our reducers in our module.

Let's try out our app to see the result of these changes.

pnpm run dev
warning
Don't forget! You may need to publish your server module if you haven't yet.

Send some messages and update your username and watch it change in real-time. Note that when you update your username, it also updates immediately for all prior messages. This is because the messages store the user's Identity directly, instead of their username, so we can retroactively apply their username to all prior messages.

Try opening a few incognito windows to see what it's like with multiple users!

Notify about new users
We can also register onInsert, onUpdate, and onDelete callbacks to handle events, not just state. For example, we might want to show a notification any time a new user connects to the database.

Note that these callbacks can fire in two contexts:

After a reducer runs, when the client's cache is updated about changes to subscribed rows.
After calling subscribe, when the client's cache is initialized with all existing matching rows.
Our current useTable only filters online users, but we can print a system message anytime a user enters or leaves the room by subscribing to callbacks on the onlineUsers React hook.

Update your onlineUsers React hook to add the following callbacks:

// Subscribe to all online users in the chat
// so we can show who's online and demonstrate
// the `where` and `eq` query expressions
const [ onlineUsers ] = useTable(
  tables.user,
  where(eq('online', true)),
  {
    onInsert: user => {
      // All users being inserted here are online
      const name = user.name || user.identity.toHexString().substring(0, 8);
      setSystemMessages(prev => [
        ...prev,
        {
          sender: Identity.zero(),
          text: `${name} has connected.`,
          sent: Timestamp.now(),
        },
      ]);
    },
    onDelete: user => {
      // All users being deleted here are offline
      const name = user.name || user.identity.toHexString().substring(0, 8);
      setSystemMessages(prev => [
        ...prev,
        {
          sender: Identity.zero(),
          text: `${name} has disconnected.`,
          sent: Timestamp.now(),
        },
      ]);
    },
  }
);
These callbacks will be called any time the state of the useTable result changes to add or remove a row, while respecting your where filter.

Here, we post a system message indicating that a new user has connected if the user is being added to the user table and they're online, or if an existing user's online status is being updated to "online".

Next, let's add the system messages to our list of Messages so they can be interleaved with the chat messages. Modify prettyMessages to concat the systemMessages as well:

const prettyMessages: PrettyMessage[] = Array.from(messages)
  .concat(systemMessages)
  .sort((a, b) => (a.sent.toDate() > b.sent.toDate() ? 1 : -1))
  .map(message => {
    const user = users.find(
      u => u.identity.toHexString() === message.sender.toHexString()
    );
    return {
      senderName: user?.name || message.sender.toHexString().substring(0, 8),
      text: message.text,
      sent: message.sent,
      kind: Identity.zero().isEqual(message.sender) ? 'system' : 'user',
    };
  });
Finally, let's also subscribe to offline users so we can show them in the sidebar as well. Replace const offlineUsers: User[] = []; with:

const [offlineUsers] = useTable(
  tables.user,
  where(eq('online', false))
);
Try it out!
Now that everything is set up, let's send some messages and see SpacetimeDB in action.

Send your first message: Type a message in the input field and click Send. You should see it appear in the message list almost instantly.

Set your name: Click "Edit Name" in the profile section and enter a username. Notice how your name updates immediately - not just for new messages, but for all your previous messages too! This is because messages store your Identity, and we look up the current name when displaying them.

Open multiple windows: Open the app in a second browser tab or an incognito window. You'll get a new identity and appear as a different user. Send messages from both and watch them appear in real-time on both screens.

Watch the online status: Notice the "Online" sidebar showing connected users. Open and close browser tabs to see users connect and disconnect, with system messages announcing each event.

Test persistence: Close all browser windows, then reopen the app. Your messages are still there! SpacetimeDB persists all your data, and your identity token (saved in localStorage) lets you reconnect as the same user.

You've just experienced the core features of SpacetimeDB: real-time synchronization, automatic persistence, and seamless multiplayer - all without writing any backend networking code.

Conclusion
Congratulations! You've built a simple chat app with SpacetimeDB. You can find the full source code for the client we've created in this quickstart tutorial here.

At this point you've learned how to create a basic TypeScript client for your SpacetimeDB quickstart-chat module. You've learned how to connect to SpacetimeDB and call reducers to update data. You've learned how to subscribe to table data, and hook it up so that it updates reactively in a React application.

What's next?
Congratulations! You've built a chat app with SpacetimeDB.

Check out the SDK Reference documentation for more advanced usage
Explore the Unity Tutorial or Unreal Tutorial for game development
Learn about Procedures for making external API calls
Edit this page

ypeScript Reference
The SpacetimeDB client SDK for TypeScript contains all the tools you need to build clients for SpacetimeDB modules using Typescript, either in the browser or with NodeJS.

Before diving into the reference, you may want to review:

Generating Client Bindings - How to generate TypeScript bindings from your module
Connecting to SpacetimeDB - Establishing and managing connections
SDK API Reference - Core concepts that apply across all SDKs
Name	Description
Project setup	Configure your TypeScript project to use the SpacetimeDB TypeScript client SDK.
Generate module bindings	Use the SpacetimeDB CLI to generate module-specific types and interfaces.
DbConnection type	A connection to a remote database.
DbContext interface	Methods for interacting with the remote database. Implemented by DbConnection and various event context types.
EventContext type	DbContext available in row callbacks.
ReducerEventContext type	DbContext available in reducer callbacks.
SubscriptionEventContext type	DbContext available in subscription-related callbacks.
ErrorContext type	DbContext available in error-related callbacks.
Access the client cache	Make local queries against subscribed rows, and register row callbacks to run when subscribed rows change.
Observe and invoke reducers	Send requests to the database to run reducers, and register callbacks to run when notified of reducers.
Identify a client	Types for identifying users and client connections.
Project setup
First, create a new client project, and add the following to your tsconfig.json file:

{
  "compilerOptions": {
    //You can use any target higher than this one
    //https://www.typescriptlang.org/tsconfig#target
    "target": "es2015"
  }
}
Then add the SpacetimeDB SDK to your dependencies:

cd client
npm install spacetimedb
WARNING! The @clockworklabs/spacetimedb-sdk package has been deprecated in favor of the spacetimedb package as of SpacetimeDB version 1.4.0. If you are using the old SDK package, you will need to switch to spacetimedb. You will also need a SpacetimeDB CLI version of 1.4.0+ to generate bindings for the new spacetimedb package.

You should have this folder layout starting from the root of your project:

quickstart-chat
├── client
│   ├── node_modules
│   ├── public
│   └── src
└── server
    └── src
Tip for utilities/scripts
If want to create a quick script to test your module bindings from the command line, you can use https://www.npmjs.com/package/tsx to execute TypeScript files.

Then you create a script.ts file and add the imports, code and execute with:

npx tsx src/script.ts
Generate module bindings
Each SpacetimeDB client depends on some bindings specific to your module. Create a module_bindings directory in your project's src directory and generate the Typescript interface files using the Spacetime CLI. From your project directory, run:

mkdir -p client/src/module_bindings
spacetime generate --lang typescript \
    --out-dir client/src/module_bindings \
    --project-path PATH-TO-MODULE-DIRECTORY
Import the module_bindings in your client's main file:

import * as moduleBindings from './module_bindings/index';
You may also need to import some definitions from the SDK library:

import { Identity, ConnectionId, Event, ReducerEvent } from 'spacetimedb';
Type DbConnection
DbConnection;
A connection to a remote database is represented by the DbConnection type. This type is generated per-module, and contains information about the types, tables and reducers defined by your module.

Name	Description
Connect to a database	Construct a DbConnection.
Access tables and reducers	Access subscribed rows in the client cache, request reducer invocations, and register callbacks.
Connect to a database
class DbConnection {
  public static builder(): DbConnectionBuilder;
}
Construct a DbConnection by calling DbConnection.builder() and chaining configuration methods, then calling .build(). You must at least specify withUri, to supply the URI of the SpacetimeDB to which you published your module, and withModuleName, to supply the human-readable SpacetimeDB domain name or the raw Identity which identifies the database.

Name	Description
withUri method	Set the URI of the SpacetimeDB instance which hosts the remote database.
withModuleName method	Set the name or Identity of the remote database.
withConfirmedReads method	Enable or disable confirmed reads.
onConnect callback	Register a callback to run when the connection is successfully established.
onConnectError callback	Register a callback to run if the connection is rejected or the host is unreachable.
onDisconnect callback	Register a callback to run when the connection ends.
withToken method	Supply a token to authenticate with the remote database.
build method	Finalize configuration and connect.
Method withUri
class DbConnectionBuilder {
  public withUri(uri: string): DbConnectionBuilder;
}
Configure the URI of the SpacetimeDB instance or cluster which hosts the remote database.

Method withModuleName
class DbConnectionBuilder {
  public withModuleName(name_or_identity: string): DbConnectionBuilder;
}
Configure the SpacetimeDB domain name or hex string encoded Identity of the remote database which identifies it within the SpacetimeDB instance or cluster.

Method withConfirmedReads
class DbConnectionBuilder {
  public withConfirmedReads(confirmedReads: bool): DbConnectionBuilder;
}
Configure the connection to request confirmed reads.

When enabled, the server will send query results only after they are confirmed to be durable, i.e. persisted to disk on one or more replicas depending on the replication settings of the database. When set to false, the server will send results as soon as transactions are committed in memory.

If this method is not called, the server chooses the default.

Callback onConnect
class DbConnectionBuilder {
  public onConnect(
    callback: (ctx: DbConnection, identity: Identity, token: string) => void
  ): DbConnectionBuilder;
}
Chain a call to .onConnect(callback) to your builder to register a callback to run when your new DbConnection successfully initiates its connection to the remote database. The callback accepts three arguments: a reference to the DbConnection, the Identity by which SpacetimeDB identifies this connection, and a private access token which can be saved and later passed to withToken to authenticate the same user in future connections.

Callback onConnectError
class DbConnectionBuilder {
  public onConnectError(
    callback: (ctx: ErrorContext, error: Error) => void
  ): DbConnectionBuilder;
}
Chain a call to .onConnectError(callback) to your builder to register a callback to run when your connection fails.

Callback onDisconnect
class DbConnectionBuilder {
  public onDisconnect(
    callback: (ctx: ErrorContext, error: Error | null) => void
  ): DbConnectionBuilder;
}
Chain a call to .onDisconnect(callback) to your builder to register a callback to run when your DbConnection disconnects from the remote database, either as a result of a call to disconnect or due to an error.

Method withToken
class DbConnectionBuilder {
  public withToken(token?: string): DbConnectionBuilder;
}
Chain a call to .withToken(token) to your builder to provide an OpenID Connect compliant JSON Web Token to authenticate with, or to explicitly select an anonymous connection. If this method is not called or null is passed, SpacetimeDB will generate a new Identity and sign a new private access token for the connection.

Method build
class DbConnectionBuilder {
  public build(): DbConnection;
}
After configuring the connection and registering callbacks, attempt to open the connection.

Access tables and reducers
Field db
class DbConnection {
  public db: RemoteTables;
}
The db field of the DbConnection provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
class DbConnection {
  public reducers: RemoteReducers;
}
The reducers field of the DbConnection provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Interface DbContext
interface DbContext<
    DbView,
    Reducers,
>
DbConnection, EventContext, ReducerEventContext, SubscriptionEventContext and ErrorContext all implement DbContext. DbContext has fields and methods for inspecting and configuring your connection to the remote database.

The DbContext interface is implemented by connections and contexts to every module. This means that its DbView and Reducers are generic types.

Name	Description
db field	Access subscribed rows of tables and register row callbacks.
reducers field	Request reducer invocations and register reducer callbacks.
disconnect method	End the connection.
Subscribe to queries	Register SQL queries to receive updates about matching rows.
Read connection metadata	Access the connection's Identity and ConnectionId
Field db
interface DbContext {
  db: DbView;
}
The db field of a DbContext provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
interface DbContext {
  reducers: Reducers;
}
The reducers field of a DbContext provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Method disconnect
interface DbContext {
  disconnect(): void;
}
Gracefully close the DbConnection. Throws an error if the connection is already disconnected.

Subscribe to queries
Name	Description
SubscriptionBuilder type	Builder-pattern constructor to register subscribed queries.
SubscriptionHandle type	Manage an active subscripion.
Type SubscriptionBuilder
SubscriptionBuilder;
Name	Description
ctx.subscriptionBuilder() constructor	Begin configuring a new subscription.
onApplied callback	Register a callback to run when matching rows become available.
onError callback	Register a callback to run if the subscription fails.
subscribe method	Finish configuration and subscribe to one or more SQL queries.
subscribeToAllTables method	Convenience method to subscribe to the entire database.
Constructor ctx.subscriptionBuilder()
interface DbContext {
  subscriptionBuilder(): SubscriptionBuilder;
}
Subscribe to queries by calling ctx.subscription_builder() and chaining configuration methods, then calling .subscribe(queries).

Callback onApplied
class SubscriptionBuilder {
  public onApplied(
    callback: (ctx: SubscriptionEventContext) => void
  ): SubscriptionBuilder;
}
Register a callback to run when the subscription is applied and the matching rows are inserted into the client cache.

Callback onError
class SubscriptionBuilder {
  public onError(
    callback: (ctx: ErrorContext, error: Error) => void
  ): SubscriptionBuilder;
}
Register a callback to run if the subscription is rejected or unexpectedly terminated by the server. This is most frequently caused by passing an invalid query to subscribe.

Method subscribe
class SubscriptionBuilder {
  subscribe(queries: string | string[]): SubscriptionHandle;
}
Subscribe to a set of queries.

See the SpacetimeDB SQL Reference for information on the queries SpacetimeDB supports as subscriptions.

Method subscribeToAllTables
class SubscriptionBuilder {
  subscribeToAllTables(): void;
}
Subscribe to all rows from all public tables. This method is provided as a convenience for simple clients. The subscription initiated by subscribeToAllTables cannot be canceled after it is initiated. You should subscribe to specific queries if you need fine-grained control over the lifecycle of your subscriptions.

Type SubscriptionHandle
SubscriptionHandle;
A SubscriptionHandle represents a subscribed query or a group of subscribed queries.

The SubscriptionHandle does not contain or provide access to the subscribed rows. Subscribed rows of all subscriptions by a connection are contained within that connection's ctx.db. See Access the client cache.

Name	Description
isEnded method	Determine whether the subscription has ended.
isActive method	Determine whether the subscription is active and its matching rows are present in the client cache.
unsubscribe method	Discard a subscription.
unsubscribeThen method	Discard a subscription, and register a callback to run when its matching rows are removed from the client cache.
Method isEnded
class SubscriptionHandle {
  public isEnded(): bool;
}
Returns true if this subscription has been terminated due to an unsubscribe call or an error.

Method isActive
class SubscriptionHandle {
  public isActive(): bool;
}
Returns true if this subscription has been applied and has not yet been unsubscribed.

Method unsubscribe
class SubscriptionHandle {
  public unsubscribe(): void;
}
Terminate this subscription, causing matching rows to be removed from the client cache. Any rows removed from the client cache this way will have onDelete callbacks run for them.

Unsubscribing is an asynchronous operation. Matching rows are not removed from the client cache immediately. Use unsubscribeThen to run a callback once the unsubscribe operation is completed.

Throws an error if the subscription has already ended, either due to a previous call to unsubscribe or unsubscribeThen, or due to an error.

Method unsubscribeThen
class SubscriptionHandle {
  public unsubscribeThen(on_end: (ctx: SubscriptionEventContext) => void): void;
}
Terminate this subscription, and run the onEnd callback when the subscription is ended and its matching rows are removed from the client cache. Any rows removed from the client cache this way will have onDelete callbacks run for them.

Returns an error if the subscription has already ended, either due to a previous call to unsubscribe or unsubscribeThen, or due to an error.

Read connection metadata
Field isActive
interface DbContext {
  isActive: bool;
}
true if the connection has not yet disconnected. Note that a connection isActive when it is constructed, before its onConnect callback is invoked.

Type EventContext
EventContext;
An EventContext is a DbContext augmented with a field event: Event. EventContexts are passed as the first argument to row callbacks onInsert, onDelete and onUpdate.

Name	Description
event field	Enum describing the cause of the current row callback.
db field	Provides access to the client cache.
reducers field	Allows requesting reducers run on the remote database.
Event type	Possible events which can cause a row callback to be invoked.
Field event
class EventContext {
  public event: Event<Reducer>;
}
/* other fields */
The Event contained in the EventContext describes what happened to cause the current row callback to be invoked.

Field db
class EventContext {
  public db: RemoteTables;
}
The db field of the context provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
class EventContext {
  public reducers: RemoteReducers;
}
The reducers field of the context provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Type Event
type Event<Reducer> =
  | { tag: 'Reducer'; value: ReducerEvent<Reducer> }
  | { tag: 'SubscribeApplied' }
  | { tag: 'UnsubscribeApplied' }
  | { tag: 'Error'; value: Error }
  | { tag: 'UnknownTransaction' };
Name	Description
Reducer variant	A reducer ran in the remote database.
SubscribeApplied variant	A new subscription was applied to the client cache.
UnsubscribeApplied variant	A previous subscription was removed from the client cache after a call to unsubscribe.
Error variant	A previous subscription was removed from the client cache due to an error.
UnknownTransaction variant	A transaction ran in the remote database, but was not attributed to a known reducer.
ReducerEvent type	Metadata about a reducer run. Contained in Event::Reducer and ReducerEventContext.
UpdateStatus type	Completion status of a reducer run.
Reducer type	Module-specific generated enum with a variant for each reducer defined by the module.
Variant Reducer
{
  tag: 'Reducer';
  value: ReducerEvent<Reducer>;
}
Event when we are notified that a reducer ran in the remote database. The ReducerEvent contains metadata about the reducer run, including its arguments and termination status(#type-updatestatus).

This event is passed to row callbacks resulting from modifications by the reducer.

Variant SubscribeApplied
{
  tag: 'SubscribeApplied';
}
Event when our subscription is applied and its rows are inserted into the client cache.

This event is passed to row onInsert callbacks resulting from the new subscription.

Variant UnsubscribeApplied
{
  tag: 'UnsubscribeApplied';
}
Event when our subscription is removed after a call to SubscriptionHandle.unsubscribe or SubscriptionHandle.unsubscribeThen and its matching rows are deleted from the client cache.

This event is passed to row onDelete callbacks resulting from the subscription ending.

Variant Error
{
  tag: 'Error';
  value: Error;
}
Event when a subscription ends unexpectedly due to an error.

This event is passed to row onDelete callbacks resulting from the subscription ending.

Variant UnknownTransaction
{
  tag: 'UnknownTransaction';
}
Event when we are notified of a transaction in the remote database which we cannot associate with a known reducer. This may be an ad-hoc SQL query or a reducer for which we do not have bindings.

This event is passed to row callbacks resulting from modifications by the transaction.

Type ReducerEvent
A ReducerEvent contains metadata about a reducer run.

type ReducerEvent<Reducer> = {
  /**
   * The time when the reducer started running.
   */
  timestamp: Timestamp;

  /**
   * Whether the reducer committed, was aborted due to insufficient energy, or failed with an error message.
   */
  status: UpdateStatus;

  /**
   * The identity of the caller.
   * TODO: Revise these to reflect the forthcoming Identity proposal.
   */
  callerIdentity: Identity;

  /**
   * The connection ID of the caller.
   *
   * May be `null`, e.g. for scheduled reducers.
   */
  callerConnectionId?: ConnectionId;

  /**
   * The amount of energy consumed by the reducer run, in eV.
   * (Not literal eV, but our SpacetimeDB energy unit eV.)
   * May be present or undefined at the implementor's discretion;
   * future work may determine an interface for module developers
   * to request this value be published or hidden.
   */
  energyConsumed?: bigint;

  /**
   * The `Reducer` enum defined by the `moduleBindings`, which encodes which reducer ran and its arguments.
   */
  reducer: Reducer;
};
Type UpdateStatus
type UpdateStatus =
  | { tag: 'Committed'; value: __DatabaseUpdate }
  | { tag: 'Failed'; value: string }
  | { tag: 'OutOfEnergy' };
Name	Description
Committed variant	The reducer ran successfully.
Failed variant	The reducer errored.
OutOfEnergy variant	The reducer was aborted due to insufficient energy.
Variant Committed
{
  tag: 'Committed';
}
The reducer returned successfully and its changes were committed into the database state. An Event with tag: 'Reducer' passed to a row callback must have this status in its ReducerEvent.

Variant Failed
{
  tag: 'Failed';
  value: string;
}
The reducer returned an error, panicked, or threw an exception. The value is the stringified error message. Formatting of the error message is unstable and subject to change, so clients should use it only as a human-readable diagnostic, and in particular should not attempt to parse the message.

Variant OutOfEnergy
{
  tag: 'OutOfEnergy';
}
The reducer was aborted due to insufficient energy balance of the module owner.

Type Reducer
type Reducer =
  | { name: 'ReducerA'; args: ReducerA }
  | { name: 'ReducerB'; args: ReducerB }
The module bindings contains a type Reducer with a variant for each reducer defined by the module. Each variant has a field args containing the arguments to the reducer.

Type ReducerEventContext
A ReducerEventContext is a DbContext augmented with a field event: ReducerEvent. ReducerEventContexts are passed as the first argument to reducer callbacks.

Name	Description
event field	ReducerEvent containing reducer metadata.
db field	Provides access to the client cache.
reducers field	Allows requesting reducers run on the remote database.
Field event
class ReducerEventContext {
  public event: ReducerEvent<Reducer>;
}
The ReducerEvent contained in the ReducerEventContext has metadata about the reducer which ran.

Field db
class ReducerEventContext {
  public db: RemoteTables;
}
The db field of the context provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
class ReducerEventContext {
  public reducers: RemoteReducers;
}
The reducers field of the context provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Type SubscriptionEventContext
A SubscriptionEventContext is a DbContext. Unlike the other context types, SubscriptionEventContext doesn't have an event field. SubscriptionEventContexts are passed to subscription onApplied and unsubscribeThen callbacks.

Name	Description
db field	Provides access to the client cache.
reducers field	Allows requesting reducers run on the remote database.
Field db
class SubscriptionEventContext {
  public db: RemoteTables;
}
The db field of the context provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
class SubscriptionEventContext {
  public reducers: RemoteReducers;
}
The reducers field of the context provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Type ErrorContext
An ErrorContext is a DbContext augmented with a field event: Error. ErrorContexts are to connections' onDisconnect and onConnectError callbacks, and to subscriptions' onError callbacks.

Name	Description
event field	The error which caused the current error callback.
db field	Provides access to the client cache.
reducers field	Allows requesting reducers run on the remote database.
Field event
class ErrorContext {
  public event: Error;
}
Field db
class ErrorContext {
  public db: RemoteTables;
}
The db field of the context provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
class ErrorContext {
  public reducers: RemoteReducers;
}
The reducers field of the context provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Access the client cache
All DbContext implementors, including DbConnection and EventContext, have fields .db, which in turn has methods for accessing tables in the client cache.

Each table defined by a module has an accessor method, whose name is the table name converted to camelCase, on this .db field. The table accessor methods return table handles. Table handles have methods for accessing rows and registering onInsert and onDelete callbacks. Handles for tables which have a declared primary key field also expose onUpdate callbacks. Table handles also offer the ability to find subscribed rows by unique index.

Name	Description
Accessing rows	Iterate over or count subscribed rows.
onInsert callback	Register a function to run when a row is added to the client cache.
onDelete callback	Register a function to run when a row is removed from the client cache.
onUpdate callback	Register a function to run when a subscribed row is replaced with a new version.
Unique index access	Seek a subscribed row by the value in its unique or primary key column.
BTree index access	Not supported.
Accessing rows
Method count
class TableHandle {
  public count(): number;
}
Returns the number of rows of this table resident in the client cache, i.e. the total number which match any subscribed query.

Method iter
class TableHandle {
  public iter(): Iterable<Row>;
}
An iterator over all the subscribed rows in the client cache, i.e. those which match any subscribed query.

The Row type will be an autogenerated type which matches the row type defined by the module.

Callback onInsert
class TableHandle {
  public onInsert(callback: (ctx: EventContext, row: Row) => void): void;

  public removeOnInsert(callback: (ctx: EventContext, row: Row) => void): void;
}
The onInsert callback runs whenever a new row is inserted into the client cache, either when applying a subscription or being notified of a transaction. The passed EventContext contains an Event which can identify the change which caused the insertion, and also allows the callback to interact with the connection, inspect the client cache and invoke reducers.

The Row type will be an autogenerated type which matches the row type defined by the module.

removeOnInsert may be used to un-register a previously-registered onInsert callback.

Callback onDelete
class TableHandle {
  public onDelete(callback: (ctx: EventContext, row: Row) => void): void;

  public removeOnDelete(callback: (ctx: EventContext, row: Row) => void): void;
}
The onDelete callback runs whenever a previously-resident row is deleted from the client cache.

The Row type will be an autogenerated type which matches the row type defined by the module.

removeOnDelete may be used to un-register a previously-registered onDelete callback.

Callback onUpdate
class TableHandle {
  public onUpdate(
    callback: (ctx: EventContext, old: Row, new: Row) => void
  ): void;

  public removeOnUpdate(
    callback: (ctx: EventContext, old: Row, new: Row) => void
  ): void;
}
The onUpdate callback runs whenever an already-resident row in the client cache is updated, i.e. replaced with a new row that has the same primary key.

Only tables with a declared primary key expose onUpdate callbacks. Handles for tables without a declared primary key will not have onUpdate or removeOnUpdate methods.

The Row type will be an autogenerated type which matches the row type defined by the module.

removeOnUpdate may be used to un-register a previously-registered onUpdate callback.

Unique constraint index access
For each unique constraint on a table, its table handle has a field whose name is the unique column name. This field is a unique index handle. The unique index handle has a method .find(desiredValue: Col) -> Row | undefined, where Col is the type of the column, and Row the type of rows. If a row with desiredValue in the unique column is resident in the client cache, .find returns it.

BTree index access
The SpacetimeDB TypeScript client SDK does not support non-unique BTree indexes.

Observe and invoke reducers
All DbContext implementors, including DbConnection and EventContext, have fields .reducers, which in turn has methods for invoking reducers defined by the module and registering callbacks on it.

Each reducer defined by the module has three methods on the .reducers:

An invoke method, whose name is the reducer's name converted to camel case, like setName. This requests that the module run the reducer.
A callback registation method, whose name is prefixed with on, like onSetName. This registers a callback to run whenever we are notified that the reducer ran, including successfully committed runs and runs we requested which failed. This method returns a callback id, which can be passed to the callback remove method.
A callback remove method, whose name is prefixed with removeOn, like removeOnSetName. This cancels a callback previously registered via the callback registration method.
Identify a client
Type Identity
Identity
A unique public identifier for a client connected to a database.

Type ConnectionId
ConnectionId
An opaque identifier for a client connection to a database, intended to differentiate between connections from the same Identity.
