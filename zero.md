Zero Schema
Zero applications have both a database schema (the normal backend schema all web apps have) and a Zero schema.

The Zero schema is conventionally located in schema.ts in your app's source code. The Zero schema serves two purposes:

Provide typesafety for ZQL queries
Define first-class relationships between tables
The Zero schema is usually generated from your backend schema, but can be defined by hand for more control.

Generating from Database
If you use Drizzle or Prisma ORM, you can generate schema.ts with drizzle-zero or prisma-zero:

Drizzle
Prisma
Copy
npm install -D drizzle-zero
npx drizzle-zero generate
🧑‍💻
Not seeing your generator?
We'd love more! See the source for drizzle-zero and prisma-zero as a guide, or reach out on Discord with questions.

Writing by Hand
You can also write Zero schemas by hand for full control.

Table Schemas
Use the table function to define each table in your Zero schema:

Copy
import {table, string, boolean} from '@rocicorp/zero'
 
const user = table('user')
  .columns({
    id: string(),
    name: string(),
    partner: boolean()
  })
  .primaryKey('id')
Column types are defined with the boolean(), number(), string(), json(), and enumeration() helpers. See Column Types for how database types are mapped to these types.

Name Mapping
Use from() to map a TypeScript table or column name to a different database name:

Copy
const userPref = table('userPref')
  // Map TS "userPref" to DB name "user_pref"
  .from('user_pref')
  .columns({
    id: string(),
    // Map TS "orgID" to DB name "org_id"
    orgID: string().from('org_id')
  })
Multiple Schemas
You can also use from() to access other Postgres schemas:

Copy
// Sync the "event" table from the "analytics" schema.
const event = table('event').from('analytics.event')
Optional Columns
Columns can be marked optional. This corresponds to the SQL concept nullable.

Copy
const user = table('user')
  .columns({
    id: string(),
    name: string(),
    nickName: string().optional()
  })
  .primaryKey('id')
An optional column can store a value of the specified type or null to mean no value.

🤔
Null and undefined
Note that null and undefined mean different things when working with Zero rows.

When reading, if a column is optional, Zero can return null for that field. undefined is not used at all when Reading from Zero.
When writing, you can specify null for an optional field to explicitly write null to the datastore, unsetting any previous value.
For create and upsert you can set optional fields to undefined (or leave the field off completely) to take the default value as specified by backend schema for that column. For update you can set any non-PK field to undefined to leave the previous value unmodified.
Enumerations
Use the enumeration helper to define a column that can only take on a specific set of values. This is most often used alongside an enum Postgres column type.

Copy
import {table, string, enumeration} from '@rocicorp/zero'
 
const user = table('user')
  .columns({
    id: string(),
    name: string(),
    mood: enumeration<'happy' | 'sad' | 'taco'>()
  })
  .primaryKey('id')
Custom JSON Types
Use the json helper to define a column that stores a JSON-compatible value:

Copy
import {table, string, json} from '@rocicorp/zero'
 
const user = table('user')
  .columns({
    id: string(),
    name: string(),
    settings: json<{theme: 'light' | 'dark'}>()
  })
  .primaryKey('id')
Compound Primary Keys
Pass multiple columns to primaryKey to define a compound primary key:

Copy
const user = table('user')
  .columns({
    orgID: string(),
    userID: string(),
    name: string()
  })
  .primaryKey('orgID', 'userID')
Relationships
Use the relationships function to define relationships between tables. Use the one and many helpers to define singular and plural relationships, respectively:

Copy
const messageRelationships = relationships(
  message,
  ({one, many}) => ({
    sender: one({
      sourceField: ['senderID'],
      destField: ['id'],
      destSchema: user
    }),
    replies: many({
      sourceField: ['id'],
      destSchema: message,
      destField: ['parentMessageID']
    })
  })
)
This creates "sender" and "replies" relationships that can later be queried with the related ZQL clause:

Copy
const messagesWithSenderAndReplies = z.query.messages
  .related('sender')
  .related('replies')
This will return an object for each message row. Each message will have a sender field that is a single User object or null, and a replies field that is an array of Message objects.

Many-to-Many Relationships
You can create many-to-many relationships by chaining the relationship definitions. Assuming issue and label tables, along with an issueLabel junction table, you can define a labels relationship like this:

Copy
const issueRelationships = relationships(
  issue,
  ({many}) => ({
    labels: many(
      {
        sourceField: ['id'],
        destSchema: issueLabel,
        destField: ['issueID']
      },
      {
        sourceField: ['labelID'],
        destSchema: label,
        destField: ['id']
      }
    )
  })
)
🤔
Only two levels of chaining are supported
See https://bugs.rocicorp.dev/issue/3454.

Compound Keys Relationships
Relationships can traverse compound keys. Imagine a user table with a compound primary key of orgID and userID, and a message table with a related senderOrgID and senderUserID. This can be represented in your schema with:

Copy
const messageRelationships = relationships(
  message,
  ({one}) => ({
    sender: one({
      sourceField: ['senderOrgID', 'senderUserID'],
      destSchema: user,
      destField: ['orgID', 'userID']
    })
  })
)
Circular Relationships
Circular relationships are fully supported:

Copy
const commentRelationships = relationships(
  comment,
  ({one}) => ({
    parent: one({
      sourceField: ['parentID'],
      destSchema: comment,
      destField: ['id']
    })
  })
)
Database Schemas
Use createSchema to define the entire Zero schema:

Copy
import {createSchema} from '@rocicorp/zero'
 
export const schema = createSchema({
  tables: [user, medium, message],
  relationships: [
    userRelationships,
    mediumRelationships,
    messageRelationships
  ]
})
Default Type Parameter
Use DefaultTypes to register the your Schema type with Zero:

Copy
declare module '@rocicorp/zero' {
  interface DefaultTypes {
    schema: Schema
  }
}
This prevents having to pass Schema manually to every Zero API.

Migrations
Zero uses TypeScript-style structural typing to detect schema changes and implement smooth migrations.

How it Works
When the Zero client connects to zero-cache it sends a copy of the schema it was constructed with. zero-cache compares this schema to the one it has, and rejects the connection with a special error code if the schema is incompatible.

By default, the Zero client handles this error code by calling location.reload(). The intent is to request a newer version of the app that has been updated to handle the new server schema.

🤔
Update Order
It's important to update the database schema first, then the app. Otherwise a reload loop will occur.

If a reload loop does occur, Zero uses exponential backoff to avoid overloading the server.

If you want to change or delay this reload, you can do so by providing the onUpdateNeeded constructor parameter:

Copy
new Zero({
  onUpdateNeeded: updateReason => {
    if (reason.type === 'SchemaVersionNotSupported') {
      // Do something custom here, like show a banner.
      // When you're ready, call `location.reload()`.
    }
  }
})
If the schema changes in a compatible way while a client is running, zero-cache syncs the schema change to the client so that it's ready when the app reloads.

If the schema changes in an incompatible way while a client is running, zero-cache will close the client connection with the same error code as above.

Schema Change Process
Like other database-backed applications, Zero schema migrations generally follow an "expand/migrate/contract" pattern:

Implement and run an "expand" migration on the backend that is backwards compatible with existing schemas. Add new columns or tables, plus any defaults and triggers needed for compatibility with existing clients.
Update and deploy the API and client app to use the new schema.
After a grace period, implement and run a "contract" migration on the backend to drop or rename obsolete columns/tables.
Steps 1 and 2 can generally be done as part of a single deploy in your CI pipeline, but step 3 should be weeks later, when most open clients have refreshed the application. See Rolling Updates for more details.

😬
Warning
Certain schema changes require special handling in Postgres. See Schema Changes for details.

Previous
Status
Next
A
Authentication
Setting up auth in Zero apps has a few steps:

Setting the userID on the client
Sending credentials to the mutate and queries endpoints
Setting the Context type to implement permissions
Logging out if desired
Setting userID
Because multiple users can share the same browser, Zero requires that you provide a userID parameter on construction:

React
SolidJS
TypeScript
Copy
import {ZeroProvider} from '@rocicorp/zero/react'
import type {ZeroOptions} from '@rocicorp/zero'
 
const opts: ZeroOptions = {
  // ...
  userID: 'user-123'
}
 
return (
  <ZeroProvider {...opts}>
    <App />
  </ZeroProvider>
)
If the user is not logged in, just pass empty string or some other constant value:

Copy
const opts: ZeroOptions = {
  // ...
  userID: 'anon'
}
Zero segregates the client-side storage for each user. This allows users to quickly switch between multiple users and accounts without resyncing.

🧑‍🏫
`userID` is not a security boundary
All users that have access to a browser profile have access to the same IndexedDB instances. There is nothing that Zero can do about this – users can just open the folder where the data is stored and look inside it.

If you have more than one set of Zero data per-user (i.e., for different apps in the same domain), you can additionally use the storageKey parameter:

Copy
const opts: ZeroOptions = {
  // ...
  userID: 'user-123',
  storageKey: 'my-app'
}
If specified, storageKey is concatenated along with userID and other internal Zero information to form a unique IndexedDB database name.

Zero's IndexedDB databases are prefixed with 'rep' or 'replicache' because reasons.
Zero's IndexedDB databases are prefixed with 'rep' or 'replicache' because reasons.

Sending Credentials
You can send credentials using either cookies or tokens.

Cookies
The most common way to authenticate Zero is with cookies.

To enable it, set the ZERO_QUERY_FORWARD_COOKIES and ZERO_MUTATE_FORWARD_COOKIES options to true:

Copy
export ZERO_QUERY_FORWARD_COOKIES="true"
export ZERO_MUTATE_FORWARD_COOKIES="true"
# run zero-cache, e.g. `npx zero-cache-dev`
Zero-cache will then forward all cookies sent to cacheURL to your mutate and queries endpoints:

Copy
const opts: ZeroOptions = {
  schema,
  // Cookies sent to zero.example.com will be forwarded to
  // api.example.com/mutate and api.example.com/queries.
  cacheURL: 'https://zero.example.com',
  mutateURL: 'https://api.example.com/mutate',
  queryURL: 'https://api.example.com/queries'
}
Cookies will show up in the normal HTTP Cookie header and you can authenticate these endpoints just like you would any API request.

Deployment
In order for cookie auth to work, the browser must send your frontend's cookies to zero-cache, so that zero-cache can forward them to your API.

During development, this works automatically as long as your frontend and zero-cache are both running on localhost with different ports. Browsers send cookies based on domain name, not port number, so cookies set by localhost:3000 are also sent to localhost:4848.

For production you'll need to do two things:

Run zero-cache on a subdomain of your main site (e.g., zero.example.com if your main site is example.com). Consult your hosting provider's docs, or your favorite LLM for how to configure this.
Set cookies from your main site with the Domain attribute set to your root domain (e.g., .example.com). If you use a third-party auth provider, consult their docs on how to do this. For example, for Better Auth, this is done with the crossSubDomainCookies feature.
⚠️
Never use SameSite=None for auth cookies
Do not set SameSite=None on cookies used for authentication with Zero. Because Zero uses WebSockets, setting SameSite=None can expose your application to Cross-Site WebSocket Hijacking (CSWSH) attacks.

Use SameSite=Lax (the browser default) or SameSite=Strict instead.

Tokens
Zero also supports token-based authentication.

If you have an opaque auth token, such as a JWT or a token from your auth provider, you can pass it to Zero's auth parameter:

Copy
const opts: ZeroOptions = {
  // ...
  auth: token
}
Zero will forward this token to your mutate and queries endpoints in an Authorization: Bearer <token> header, which you can use to authenticate the request as normal:

Copy
export async function handleMutate(request: Request) {
  const session = await authenticate(
    request.headers.get('Authorization')
  )
 
  // handle mutate request ...
}
Auth Failure and Refresh
To mark a request as unauthorized, return a 401 or 403 status code from your queries or mutate endpoint.

Copy
export async function handleMutate(request: Request) {
  const session = await authenticate(
    request.headers.get('Authorization')
  )
 
  if (!session) {
    // can be 401 or 403
    return json({error: 'Unauthorized'}, {status: 401})
  }
 
  // handle mutate request ...
}
This will cause Zero to disconnect from zero-cache and the connection status will change to needs-auth. You can then re-authenticate the user and call zero.connection.connect() to reconnect to zero-cache:

Copy
function NeedsAuthDialog() {
  const connectionState = useConnectionState()
 
  const refreshCookie = async () => {
    await login()
    // no token needed since we use cookie auth
    zero.connection.connect()
  }
 
  if (connectionState.name === 'needs-auth') {
    return (
      <div>
        <h1>Authentication Required</h1>
        <button onClick={refreshCookie}>Login</button>
      </div>
    )
  }
 
  return null
}
Or, if you aren't using cookie auth:

Copy
function NeedsAuthDialog() {
  const connectionState = useConnectionState()
 
  const refreshAuthToken = async () => {
    const token = await fetchNewToken()
    // pass a new token to reconnect to zero-cache
    zero.connection.connect({auth: token})
  }
 
  if (connectionState.name === 'needs-auth') {
    return (
      <div>
        <h1>Authentication Required</h1>
        <button onClick={refreshAuthToken}>Login</button>
      </div>
    )
  }
 
  return null
}
Context
When a user is authenticated, you will want to know who they are in your queries and mutators to enforce permissions.

To do this, define a Context type that includes the user's ID and any other relevant information, then register that type with Zero:

Copy
export type ZeroContext = {
  userID: string
  role: 'admin' | 'user'
}
 
declare module '@rocicorp/zero' {
  interface DefaultTypes {
    context: ZeroContext
  }
}
Then pass an instance of this context when instantiating Zero:

Copy
const opts: ZeroOptions = {
  // ...
  context: {
    userID: 'user-123',
    role: 'admin'
  }
}
On the server-side, you will also pass an instance of this context when invoking your queries and mutators:

Copy
const query = mustGetQuery(queries, name)
query.fn({args, ctx})
 
// or
 
const mutator = mustGetMutator(mutators, name)
mutator.fn({tx, args, ctx})
You can then access the context within your queries and mutators to implement permissions.

Permission Patterns
Zero does not have (or need) a first-class permission system like RLS.

Instead, you implement permissions by authenticating the user in your queries and mutators endpoints, and creating a Context object that contains the user's ID and other information. This context is passed to your queries and mutators and used to control what data the user can access.

Here are a collection of common permissions patterns and how to implement them in Zero.

Read Permissions
Only Owned Rows
Copy
// Use the context's `userID` to filter the rows to only the
// ones owned by the user.
const myPosts = defineQuery(({ctx: {userID}}) => {
  return zql.post.where('authorID', userID)
})
Owned or Shared Rows
Copy
// Use the context's `userID` to filter the rows to only the
// ones owned by the user or shared with the user.
const allowedPosts = defineQuery(({ctx: {userID}}) => {
  return zql.post.where(({cmp, exists, or}) =>
    or(
      cmp('authorID', userID),
      exists('sharedWith', q => q.where('userID', userID))
    )
  )
})
Owned Rows or All if Admin
Copy
const allowedPosts = defineQuery(
  ({ctx: {userID, role}}) => {
    if (role === 'admin') {
      return zql.post
    }
    return zql.post.where('authorID', userID)
  }
)
Write Permissions
Enforce Ownership
Copy
// All created items are owned by the user who created them.
const createPost = defineMutator(
  z.object({
    id: z.string(),
    title: z.string(),
    content: z.string()
  }),
  (tx, {ctx: {userID}, args: {id, title, content}}) => {
    return zql.post.insert({
      id,
      title,
      content,
      authorID: userID
    })
  }
)
Edit Owned Rows
Copy
const updatePost = defineMutator(
  z.object({
    id: z.string(),
    content: z.string().optional()
  }),
  (tx, {ctx: {userID}, args: {id, content}}) => {
    const prev = await tx.run(
      zql.post.where('id', id).one()
    )
    if (!prev) {
      return
    }
    if (prev.authorID !== userID) {
      throw new Error('Access denied')
    }
    return zql.post.update({
      id,
      content
    })
  }
)
Edit Owned or Shared Rows
Copy
const updatePost = defineMutator(
  z.object({
    id: z.string(),
    content: z.string().optional()
  }),
  (tx, {ctx: {userID}, args: {id, content}}) => {
    const prev = await tx.run(
      zql.post
        .where('id', id)
        .related('sharedWith', q =>
          q.where('userID', userID)
        )
        .one()
    )
    if (!prev) {
      return
    }
    if (
      prev.authorID !== userID &&
      prev.sharedWith.length === 0
    ) {
      throw new Error('Access denied')
    }
    return zql.post.update({
      id,
      content
    })
  }
)
Edit Owned or All if Admin
Copy
const updatePost = defineMutator(
  z.object({
    id: z.string(),
    content: z.string().optional()
  }),
  (tx, {ctx: {role, userID}, args: {id, content}}) => {
    const prev = await tx.run(
      zql.post.where('id', id).one()
    )
    if (!prev) {
      return
    }
    if (role !== 'admin' && prev.authorID !== userID) {
      throw new Error('Access denied')
    }
    return zql.post.update({
      id,
      content
    })
  }
)
Logging Out
When a user logs out, you should consider what should happen to the synced data.

If you do nothing, the synced data will be left on the device. The next login will be a little faster because Zero doesn't have to resync that data from scratch. But also, the data will be left on the device indefinitely which could be undesirable for privacy and security.

If you instead want to clear data on logout, Zero provides the dropAllDatabases function:

Copy
import {dropAllDatabases} from '@rocicorp/zero'
 
// Returns an object with:
// - The names of the successfully dropped databases
// - Any errors encountered while dropping
const {dropped, errors} = await dropAllDatabases()
Previous
Schema
Next
Reading Data
Queries
Reading and Syncing Data

Queries are how you read and sync data with Zero. Here's a simple example:

Copy
import {defineQueries, defineQuery} from '@rocicorp/zero'
import {z} from 'zod'
import {zql} from 'schema.ts'
 
export const queries = defineQueries({
  postsByAuthor: defineQuery(
    z.object({authorID: z.string()}),
    ({args: {authorID}}) =>
      zql.post.where('authorID', authorID)
  )
})
Architecture
A copy of each query exists on both the client and on your server:

Image
Often the implementations will be the same, and you can just share their code. This is easy with full-stack frameworks like TanStack Start or Next.js.

But the implementations don't have to be the same, or even compute the same result. For example, the server can add extra filters to enforce permissions that the client query does not.

Life of a Query
When a query is invoked, it initially runs on the client, against the client-side datastore. Any matching data is returned immediately and the user sees instant results.

Client hydration
Client hydration

In the background, the name and arguments for the query are sent to zero-cache. Zero-cache calls the queries endpoint on your server to get the ZQL for the query. Your server looks up its implementation of the query, invokes it, and returns the resulting ZQL expression to zero-cache.

Zero-cache then runs this ZQL against the server-side data. The initial server result is sent back to the client and the client query updates in response.

Server hydration
Server hydration

zero-cache receives updates from Postgres via logical replication. It updates affected queries and sends row changes back to the client, which updates the client query, and the user sees the changes.

Incremental update
Incremental update

Defining Queries
Basics
Create a query using defineQuery.

The only required argument is a QueryFn, which must return a ZQL expression:

Copy
import {zql} from 'schema.ts'
 
const allPostsQueryDef = defineQuery(() => zql.post)
Arguments
The QueryFn can take a single args parameter. To enable this, pass a validator to defineQuery:

Copy
import {zql} from 'schema.ts'
 
const postsByAuthor = defineQuery(
  z.object({authorID: z.string().optional()}),
  ({args: {authorID}}) => {
    let q = zql.post
    if (authorID !== undefined) {
      q = q.where('authorID', authorID)
    }
    return q
  }
)
We use Zod in these examples, but you can use any validation library that implements Standard Schema.

🤔
Why validators are required
Zero queries run on both the client and on your server. In the server case, the parameters come from the client and are untrusted. The validator ensures the data passed to your query is of the expected type.

Query Registries
The result of defineQuery is a QueryDefinition. By itself this isn't super useful. You need to register it using defineQueries:

Copy
export const queries = defineQueries({
  posts: {
    all: allPostsQueryDef
  }
})
Typically these are done together in one step:

Copy
export const queries = defineQueries({
  posts: {
    all: defineQuery(() => zql.post)
  }
})
The result of defineQueries is called a QueryRegistry. Each field in the registry is a callable Query that you can use to read data:

Copy
import {zero} from 'zero.ts'
import {queries} from 'queries.ts'
 
const allPosts = await zero.run(queries.posts.all())
Query Names
Each Query has a queryName which is computed by defineQueries. This name is later sent to your server to identify the query to run:

Copy
console.log(queries.posts.all.queryName)
// "posts.all"
Context
Query parameters are supplied by the client application and passed to the server automatically by Zero. This makes them unsuitable for credentials, since the user could modify them.

For this reason, Zero queries also support the concept of a context object.

Access your context with the ctx parameter to your query:

Copy
const myPostsQuery = defineQuery(({ctx: {userID}}) => {
  // User cannot control context.userID, so this safely
  // restricts the query to the user's own posts.
  return zql.post.where('authorID', userID)
})
queries.ts
By convention, all queries for an application are listed in a central queries.ts file. This allows them to be easily used on both the client and server:

Copy
import {defineQueries, defineQuery} from '@rocicorp/zero'
import {z} from 'zod'
import {zql} from './schema.ts'
 
export const queries = defineQueries({
  posts: {
    get: defineQuery(z.string(), id =>
      zql.post.where('id', id)
    ),
    byAuthor: defineQuery(
      z.object({
        authorID: z.string(),
        includeDrafts: z.boolean().optional()
      }),
      ({args: {authorID, includeDrafts}}) => {
        let q = zql.post.where('authorID', authorID)
        if (!includeDrafts) {
          q = q.where('isDraft', false)
        }
        return q
      }
    )
  }
})
You can use as many levels of nesting as you want to organize your queries.

As your application grows, you can move queries to different files to keep them organized:

Copy
// posts.ts
export const postQueries = {
  get: defineQuery(z.string(), id =>
    zql.post.where('id', id)
  )
  // ...
}
 
// users.ts
export const userQueries = {
  byRole: defineQuery(z.string(), role =>
    zql.user.where('role', role)
  )
  // ...
}
 
// queries.ts
import {postQueries} from './posts.ts'
import {userQueries} from './users.ts'
 
export const queries = defineQueries({
  posts: postQueries,
  users: userQueries
})
⚠️
Use `defineQueries` at top level only
Because defineQueries establishes the full name for each query (i.e., posts.get, users.byRole), it should only be used once at the top level of your queries.ts file.

Server Setup
In order for queries to sync, you must provide an implementation of the query endpoint on your server. zero-cache calls this endpoint to resolve each query to ZQL that it can run.

Registering the Endpoint
Use ZERO_QUERY_URL to tell zero-cache where to find your query implementation:

Copy
export ZERO_QUERY_URL="http://localhost:3000/api/zero/query"
# run zero-cache, e.g. `npx zero-cache-dev`
Implementing the Endpoint
You can use the handleQueryRequest and mustGetQuery functions to implement the endpoint.

Tanstack Start
Next.js
Solid Start
Hono
Copy
// src/routes/api/zero/query.ts
import {createFileRoute} from '@tanstack/react-router'
import {handleQueryRequest} from '@rocicorp/zero/server'
import {mustGetQuery} from '@rocicorp/zero'
import {queries} from 'queries.ts'
import {schema} from 'schema.ts'
 
export const Route = createFileRoute('/api/zero/query')({
  server: {
    handlers: {
      POST: async ({request}) => {
        const result = await handleQueryRequest(
          (name, args) => {
            const query = mustGetQuery(queries, name)
            return query.fn({args, ctx: {userId: 'anon'}})
          },
          schema,
          request
        )
 
        return Response.json(result)
      }
    }
  }
})
handleQueryRequest accepts a standard Request and returns a JSON object which can be serialized and returned by your server framework of choice.

mustGetQuery looks up the query in the registry and throws an error if not found.

The query.fn function is your query implementation wrapped in the validator you provided.

Custom Query URL
By default, Zero sends queries to the URL specified in the ZERO_QUERY_URL parameter in the zero-cache config.

However you can customize this on a per-client basis. To do so, list multiple comma-separated URLs in ZERO_QUERY_URL:

Copy
ZERO_QUERY_URL='https://api.example.com/query,https://api.staging.example.com/query'
Then choose one of those URLs by passing it to queryURL on the Zero constructor:

Copy
const zero = new Zero({
  schema,
  queries,
  queryURL: 'https://api.staging.example.com/query'
})
URL Patterns
The strings listed in ZERO_QUERY_URL can also be URLPatterns:

Copy
ZERO_QUERY_URL="https://mybranch-*.preview.myapp.com/query"
This queries URL will allow clients to choose URLs like:

https://mybranch-aaa.preview.myapp.com/query ✅
https://mybranch-bbb.preview.myapp.com/query ✅
But rejects URLs like:

https://preview.myapp.com/query ❌ (missing subdomain)
https://malicious.com/query ❌ (different domain)
https://mybranch-123.preview.myapp.com/query/extra ❌ (extra path)
https://mybranch-123.preview.myapp.com/other ❌ (different path)
🥇
Pro Tip (tm)
Because URLPattern is a web standard, you can test them right in your browser:

URL Pattern
For more information, see the URLPattern docs.

Running Queries
Reactively
The most common way to use queries is with the useQuery reactive hooks from the React or SolidJS bindings (or the equivalent low-level API):

React
SolidJS
TypeScript
Copy
import {useQuery} from '@rocicorp/zero/react'
import {queries} from 'zero/queries.ts'
 
function App() {
  const [posts] = useQuery(queries.posts.get('user123'))
  return posts.map(post => (
    <div key={post.id}>{post.title}</div>
  ))
}
These functions allow you to automatically re-render UI when a query changes.

Once
You usually want to subscribe to a query in a reactive UI, but every so often you'll need to run a query just once. To do this, use zero.run():

Copy
const results = await zero.run(
  queries.issues.byPriority('high')
)
By default, run() only returns results that are currently available on the client. That is, it returns the data that would be given for result.type === 'unknown'.

If you want to wait for the server to return results, pass {type: 'complete'} to run:

Copy
const results = await zero.run(
  queries.issues.byPriority('high'),
  {type: 'complete'}
)
For Preloading
Almost all Zero apps will want to preload some data in order to maximize the feel of instantaneous UI transitions.

Because preload queries are often much larger than a screenful of UI, Zero provides a special zero.preload() method to avoid the overhead of materializing the result into JS objects:

Copy
// Preload a large number of the inbox query results.
zero.preload(
  queries.issues.inbox({
    sort: 'created',
    sortDirection: 'desc',
    limit: 1000
  })
)
Missing Data
Because Zero returns local results immediately and server results asynchronously, displaying "not found" / 404 UI can be slightly tricky.

If you just use a simple existence check, you will often see the 404 UI flicker while the server result loads:

React
SolidJS
TypeScript
Copy
const [issue] = useQuery(queries.issues.get('some-id'))
 
// ❌ This causes flickering of the UI
if (!issue) {
  return <div>404 Not Found</div>
} else {
  return <div>{issue.title}</div>
}
To do this correctly, only display the "not found" UI when the result type is complete. This way the 404 page is slow but pages with data are still just as fast:

React
SolidJS
TypeScript
Copy
const [issue, issueResult] = useQuery(
  queries.issues.get('some-id')
)
 
if (!issue && issueResult.type === 'complete') {
  return <div>404 Not Found</div>
}
 
if (!issue) {
  return null
}
 
return <div>{issue.title}</div>
Partial Data
Zero immediately returns the data for a query it has on the client, then falls back to the server for any missing data.

Sometimes it's useful to know the difference between these two types of results. To do so, use the result from useQuery:

React
SolidJS
TypeScript
Copy
const [issues, issuesResult] = useQuery(
  queries.issues.inbox()
)
if (issuesResult.type === 'complete') {
  console.log('All data is present')
} else {
  console.log('Some data is missing')
}
The possible values of result.type are currently complete and unknown.

The complete value is currently only returned when Zero has received the server result. In the future, Zero will be able to return this result type when it knows that all possible data for this query is already available locally. Additionally, we plan to add a prefix result for when the data is known to be a prefix of the complete result. See Consistency for more information.

Handling Errors
If the queries endpoint throws an application or parse error, zero-cache will report it to the client using the type and error fields on the query details object:

React
SolidJS
TypeScript
Copy
const [posts, postsResult] = useQuery(
  queries.posts.byAuthorID('user123')
)
 
if (postsResult.type === 'error') {
  return (
    <div>
      Error loading posts: {postsResult.error.message}
    </div>
  )
}
🤔
Query endpoint failures are not shown here
See Connection Status for how HTTP or network errors from the queries endpoint are handled.

Granular Updates
You can use the materialize() method to create a view that you can listen to for changes.

However, this will only tell you when the view has changed and give you the complete new result. It won't tell you what changed.

To know what changed, you can create your own custom View implementation:

Copy
// Inside the View class
// Instead of storing the change, we invoke some callback
push(change: Change): void {
  switch (change.type) {
    case 'add':
      this.#onAdd?.(change)
      break
    case 'remove':
      this.#onRemove?.(change)
      break
    case 'edit':
      this.#onEdit?.(change)
      break
    case 'child':
      this.#onChild?.(change)
      break
    default:
      throw new Error(`Unknown change type: ${change['type']}`)
  }
}
For examples, see the View implementations in zero-vue or zero-solid.

Query Caching
Queries can be either active or cached. An active query is one that is currently being used by the application. Cached queries are not currently in use, but continue syncing in case they are needed again soon.

Image
Queries are deactivated according to how they were created:

For useQuery(), the UI unmounts the component (which calls destroy() under the covers).
For preload(), the UI calls cleanup() on the return value of preload().
For run(), queries are automatically deactivated immediately after the result is returned.
For materialize() queries, the UI calls destroy() on the view.
Additionally when a Zero instance closes, all active queries are automatically deactivated. This also happens when the containing page or script is unloaded.

TTLs
Each query has a ttl that controls how long it stays cached.

💡
The TTL clock only ticks while Zero is running
If the user closes all tabs for your app, Zero stops running and the time that elapses doesn't count toward any TTLs.

You do not need to account for such time when choosing a TTL – you only need to account for time your app is running without a query.

TTL Defaults
In most cases, the default TTL should work well:

preload() queries default to ttl:'none', meaning they are not cached at all, and will stop syncing immediately when deactivated. But because preload() queries are typically registered at app startup and never shutdown, and because the ttl clock only ticks while Zero is running, this means that preload queries never get unregistered.
Other queries have a default ttl of 5m (five minutes).
Setting Different TTLs
You can override the default TTL with the ttl parameter:

React
SolidJS
TypeScript
Copy
const [user] = useQuery(
  queries.posts.byAuthorID('user123'),
  {ttl: '5m'}
)
 
// preload()
zero.preload(queries.posts.byAuthorID('user123'), {
  ttl: '5m'
})
TTLs up to 10m (ten minutes) are currently supported. The following formats are allowed:

Format	Meaning
none	No caching. Query will immediately stop when deactivated.
%ds	Number of seconds.
%dm	Number of minutes.
Why Zero TTLs are Short
Zero queries are not free.

Just as in any database, queries consume resources on both the client and server. Memory is used to keep metadata about the query, and disk storage is used to keep the query's current state.

We do drop this state after we haven't heard from a client for awhile, but this is only a partial improvement. If the client returns, we have to re-run the query to get the latest data.

This means that we do not actually want to keep queries active unless there is a good chance they will be needed again soon.

The default Zero TTL values might initially seem too short, but they are designed to work well with the way Zero's TTL clock works and strike a good balance between keeping queries alive long enough to be useful, while not keeping them alive so long that they consume resources unnecessarily.

Local-Only Queries
It can sometimes be useful to run queries only on the client. For example, to implement typeahead search, it really doesn't make sense to register a query with the server for every single keystroke.

Zero doesn't yet have a way to run named queries local-only, but you can run ZQL expressions locally by passing them anywhere a query is supported.

For example, to subscribe to a local-only query:

React
SolidJS
Typescript
Copy
// Queries the already synced data for issues,
// without syncing more data.
const [issues] = useQuery(
  zql.issue.orderBy('created', 'desc').limit(10)
)
Custom Server Implementation
It is possible to implement the ZERO_QUERY_URL endpoint without using Zero's TypeScript libraries, or even in a different language entirely.

The endpoint receives a POST request with a JSON body of the form:

Copy
type QueriesRequestBody = {
  id: string
  name: string
  args: readonly ReadonlyJSONValue[]
}[]
And responds with:

Copy
type QueriesResponseBody = (
  | {
      id: string
      name: string
      // See https://github.com/rocicorp/mono/blob/main/packages/zero-protocol/src/ast.ts
      ast: AST
    }
  | {
      error: 'app'
      id: string
      name: string
      details: ReadonlyJSONValue
    }
  | {
      error: 'zero'
      id: string
      name: string
      details: ReadonlyJSONValue
    }
  | {
      error: 'http'
      id: string
      name: string
      status: number
      details: ReadonlyJSONValue
    }
)[]
Consistency
Zero always syncs a consistent partial replica of the backend database to the client. This avoids many common consistency issues that come up in classic web applications. But there are still some consistency issues to be aware of when using Zero.

For example, imagine that you have a bug database w/ 10k issues. You preload the first 1k issues sorted by created.

The user then does a query of issues assigned to themselves, sorted by created. Among the 1k issues that were preloaded imagine 100 are found that match the query. Since the data we preloaded is in the same order as this query, we are guaranteed that any local results found will be a prefix of the server results.

The UX that result is nice: the user will see initial results to the query instantly. If more results are found server-side, those results are guaranteed to sort below the local results. There's no shuffling of results when the server response comes in.

Now imagine that the user switches the sort to ‘sort by modified’. This new query will run locally, and will again find some local matches. But it is now unlikely that the local results found are a prefix of the server results. When the server result comes in, the user will probably see the results shuffle around.

To avoid this annoying effect, what you should do in this example is also preload the first 1k issues sorted by modified desc. In general for any query shape you intend to do, you should preload the first n results for that query shape with no filters, in each sort you intend to use.

🤔
Zero does not sync duplicate rows
Zero syncs the union of all active queries' results. You don't have to worry about syncing many sorts of the same query when it's likely the results will overlap heavily.

In the future, we will be implementing a consistency model that fixes these issues automatically. We will prevent Zero from returning local data when that data is not known to be a prefix of the server result. Once the consistency model is implemented, preloading can be thought of as purely a performance thing, and not required to avoid unsightly flickering.

Previous
Authentication
Next
Writing Dat
Mutators
Writing Data

Mutators are how you write data with Zero. Here's a simple example:

Copy
import {defineMutators, defineMutator} from '@rocicorp/zero'
import {z} from 'zod'
 
export const mutators = defineMutators({
  updateIssue: defineMutator(
    z.object({
      id: z.string(),
      title: z.string()
    }),
    async ({tx, args: {id, title}}) => {
      if (title.length > 100) {
        throw new Error(`Title is too long`)
      }
      await tx.mutate.issue.update({
        id,
        title
      })
    }
  )
})
Architecture
A copy of each mutator exists on both the client and on your server:

Image
Often the implementations will be the same, and you can just share their code. This is easy with full-stack frameworks like TanStack Start or Next.js.

But the implementations don't have to be the same, or even compute the same result. For example, the server can add extra checks to enforce permissions, or send notifications or interact with other systems.

Life of a Mutation
When a mutator is invoked, it initially runs on the client, against the client-side datastore. Any changes are immediately applied to open queries and the user sees the changes.

In the background, Zero sends a mutation (a record of the mutator having run with certain arguments) to your server's push endpoint. Your push endpoint runs the push protocol, executing the server-side mutator in a transaction against your database and recording the fact that the mutation ran. The @rocicorp/zero package contains utilities to make it easy to implement this endpoint in TypeScript.

The changes to the database are then replicated to zero-cache using logical replication. zero-cache calculates the updates to active queries and sends rows that have changed to each client. It also sends information about the mutations that have been applied to the database.

Clients receive row updates and apply them to their local cache. Any pending mutations which have been applied to the server have their local effects rolled back. Client-side queries are updated and the user sees the changes.

Defining Mutators
Basics
Create a mutator using defineMutator.

The only required argument is a MutatorFn, which must be async:

Copy
import {defineMutator} from '@rocicorp/zero'
 
const myMutator = defineMutator(async () => {
  // ...
})
🤔
`async` !== slow
Mutators almost always complete in the same frame on the client, within milliseconds. The reason they are marked async is because on the server, reading from the tx object goes over the network to Postgres.

Writing Data
The MutatorFn receives a tx parameter which can be used to write data with a CRUD-style API. Each table in your Zero schema has a corresponding field on tx.mutate:

Copy
const myMutator = defineMutator(async ({tx}) => {
  // This is here because there's a `user` table in your schema.
  await tx.mutate.user.insert(...)
})
⚠️
Always await writes in mutators
Failing to do so allows the transaction to commit early, causing runtime errors when writes are attempted later.

Insert
Create new records with insert:

Copy
tx.mutate.user.insert({
  id: 'user-123',
  username: 'sam',
  language: 'js'
})
Optional fields can be set to null to explicitly set the new field to null. They can also be set to undefined to take the default value (which is often null but can also be some generated value server-side):

Copy
// Sets language to `null` specifically
tx.mutate.user.insert({
  id: 'user-123',
  username: 'sam',
  language: null
})
 
// Sets language to the default server-side value.
// Could be null, or some generated or constant default value too.
tx.mutate.user.insert({
  id: 'user-123',
  username: 'sam'
})
 
// Same as above
tx.mutate.user.insert({
  id: 'user-123',
  username: 'sam',
  language: undefined
})
Upsert
Create new records or update existing ones with upsert:

Copy
tx.mutate.user.upsert({
  id: samID,
  username: 'sam',
  language: 'ts'
})
upsert supports the same null / undefined semantics for optional fields that insert does (see above).

Update
Update an existing record. Does nothing if the specified record (by PK) does not exist.

You can pass a partial object, leaving fields out that you don’t want to change. For example here we leave the username the same:

Copy
// Leaves username field to previous value.
tx.mutate.user.update({
  id: samID,
  language: 'golang'
})
 
// Same as above
tx.mutate.user.update({
  id: samID,
  username: undefined,
  language: 'haskell'
})
 
// Reset language field to `null`
tx.mutate.user.update({
  id: samID,
  language: null
})
Delete
Delete an existing record. Does nothing if specified record does not exist.

Copy
tx.mutate.user.delete({
  id: samID
})
Arguments
The MutatorFn can take a single args parameter. To enable this, pass a validator to defineMutator:

Copy
import {defineMutator} from '@rocicorp/zero'
 
const initStats = defineMutator(
  z.object({issueCount: z.number()}), 
  async ({
    tx,
    args: {issueCount}
  }) => {
    if (issueCount < 0) {
      throw new Error(`issueCount cannot be negative`)
    }
    await tx.mutate.stats.insert({
      id: 'global',
      issueCount
    })
  }
)
We use Zod in these examples, but you can use any validation library that implements Standard Schema.

😈
Mutators don't have to be pure
It's most common for mutators to be a pure function of the database state plus arguments. But it's not required.

Impure mutators can be useful, e.g., to consult some external system on the server for authorization or validation.

Reading Data
You can read data within a mutator by passing ZQL to tx.run:

Copy
const updateIssue = defineMutator(
  z.object({id: z.string(), title: z.string()}),
  async ({tx, args: {id, title}}) => {
    const issue = await tx.run(
      zql.issue.where('id', id).one()
    )
 
    if (issue?.status === 'closed') {
      throw new Error(`Cannot update closed issue`)
    }
 
    await tx.mutate.issue.update({
      id,
      title
    })
  }
)
You have the full power of ZQL at your disposal, including relationships, filters, ordering, and limits.

Reads and writes within a mutator are transactional, meaning that the datastore is guaranteed to not change while your mutator is running. And if the mutator throws, the entire mutation is rolled back.

🤔
Reading in mutators is always local
Unlike zero.run(), there is no type parameter that can be used to wait for server results inside mutators.

This is because waiting for server results in mutators makes no sense – it would defeat the purpose of running optimistically to begin with.

When a mutator runs on the client (tx.location === "client"), ZQL reads only return data already cached on the client. When mutators run on the server (tx.location === "server"), ZQL reads always return all data.

Context
Mutator parameters are supplied by the client application and passed to the server automatically by Zero. This makes them unsuitable for credentials, since the user could modify them.

For this reason, Zero mutators also support the concept of a context object.

Access your context with the ctx parameter to your mutator:

Copy
const createIssue = defineMutator(
  z.object({id: z.string(), title: z.string()}),
  async ({tx, ctx: {userID}, args: {id, title}}) => {
    // Note: User cannot control ctx.userID, so this
    // enforces authorship of created issue.
    await tx.mutate.issue.insert({
      id,
      title,
      authorID: userID
    })
  }
)
Mutator Registries
The result of defineMutator is a MutatorDefinition. By itself this isn't super useful. You need to register it using defineMutators:

Copy
export const mutators = defineMutators({
  issue: {
    update: updateIssue
  }
})
Typically these are done together in one step:

Copy
export const mutators = defineMutators({
  issue: {
    update: defineMutator(
      z.object({id: z.string(), title: z.string()}),
      async ({tx, args: {id, title}}) => {
        await tx.mutate.issue.update({
          id,
          title
        })
      }
    )
  }
})
The result of defineMutators is called a MutatorRegistry. Each field in the registry is a callable Mutator that you can use to perform mutations:

Copy
import {mutators} from 'mutators.ts'
 
zero.mutate(
  mutators.issue.update({
    id: 'issue-123',
    title: 'New title'
  })
)
Mutator Names
Each Mutator has a mutatorName which is computed by defineMutators. When you run a mutator, Zero sends this name along with the arguments to your server to execute the server-side mutation.

Copy
console.log(mutators.issue.update.mutatorName)
// "issue.update"
mutators.ts
By convention, mutators are listed in a central mutators.ts file. This allows them to be easily used on both the client and server:

Copy
import {defineMutators, defineMutator} from '@rocicorp/zero'
import {zql} from './schema.ts'
import {z} from 'zod'
 
export const mutators = defineMutators({
  posts: {
    create: defineMutator(
      z.object({
        id: z.string(),
        title: z.string()
      }),
      async ({
        tx,
        context: {userID},
        args: {id, title}
      }) => {
        await tx.mutate.post.insert({
          id,
          title,
          authorID: userID
        })
      }
    ),
    update: defineMutator(
      z.object({
        id: z.string(),
        title: z.string().optional()
      }),
      async ({
        tx,
        context: {userID},
        args: {id, title}
      }) => {
        const prev = await tx.run(
          zql.post.where('id', id).one()
        )
        if (prev?.authorID !== userID) {
          throw new Error(`Access denied`)
        }
        await tx.mutate.post.update({
          id,
          title,
          authorID: userID
        })
      }
    )
  }
})
You can use as many levels of nesting as you want to organize your mutators.

As your application grows, you can move mutators to different files to keep them organized:

Copy
// posts.ts
export const postMutators = {
  create: defineMutator(
    z.object({
      id: z.string(),
      title: z.string(),
    }),
    async ({tx, context: {userID}, args: {id, title}}) => {
      await tx.mutate.post.insert({
        id,
        title,
        authorID: userID,
      })
    },
  ),
}
 
// user.ts
export const userMutators = {
  updateRole: defineMutator(
    z.object({
      role: z.string(),
    }),
    async ({tx, ctx: {userID}, args: {role}}) => {
      await tx.mutate.user.update({
        id: userID,
        role,
      })
    },
  ),
}
 
// mutators.ts
import {postMutators} from 'zero/mutators/posts.ts'
import {userMutators} from 'zero/mutators/users.ts'
 
export const mutators = defineMutators{{
  posts: postMutators,
  users: userMutators,
})
⚠️
Use `defineMutators` at top level only
defineMutators establishes the full name for each mutator (i.e., posts.create, users.updateRole), which is later sent to the server.

So this should only be used once at the top level of your mutators.ts file.

Registration
Before you can use your mutators, you need to register them with Zero:

React
SolidJS
TypeScript
Copy
import {ZeroProvider} from '@rocicorp/zero/react'
import type {ZeroOptions} from '@rocicorp/zero'
import {mutators} from 'zero/mutators.ts'
 
const opts: ZeroOptions = {
  // ... cacheURL, schema, etc.
  mutators
}
 
return (
  <ZeroProvider {...opts}>
    <App />
  </ZeroProvider>
)
🪖
Knowing is half the battle
Mutators need to be registered with Zero because Zero calls them during sync for conflict resolution.

If you invoke a mutator that is not registered, Zero will throw an error.

Server Setup
In order for mutations to sync, you must provide an implementation of the mutate endpoint on your server. zero-cache calls this endpoint to process each mutation.

Registering the Endpoint
Use ZERO_MUTATE_URL to tell zero-cache where to find your mutate implementation:

Copy
export ZERO_MUTATE_URL="http://localhost:3000/api/zero/mutate"
# run zero-cache, e.g. `npx zero-cache-dev`
Implementing the Endpoint
You can use the handleMutateRequest and mustGetMutator functions to implement the endpoint. Plug in whatever dbProvider you set up (see server-zql or the install guide).

Tanstack Start
Next.js
Solid Start
Hono
Copy
// src/routes/api/zero/mutate.ts
import {createFileRoute} from '@tanstack/react-router'
import {handleMutateRequest} from '@rocicorp/zero/server'
import {mustGetMutator} from '@rocicorp/zero'
import {mutators} from 'mutators.ts'
import {dbProvider} from 'db-provider.ts'
 
export const Route = createFileRoute('/api/zero/mutate')({
  server: {
    handlers: {
      POST: async ({request}) => {
        const result = await handleMutateRequest(
          dbProvider,
          transact =>
            transact((tx, name, args) => {
              const mutator = mustGetMutator(mutators, name)
              return mutator.fn({
                args,
                tx,
                ctx: {userId: 'anon'}
              })
            }),
          request
        )
 
        return Response.json(result)
      }
    }
  }
})
🤔
Using a different bindings library
Zero includes several built-in database adapters. You can also easily create your own. See ZQL on the Server for more information.

handleMutateRequest accepts a standard Request and returns a JSON object which can be serialized and returned by your server framework of choice.

mustGetMutator looks up the mutator in the registry and throws an error if not found.

The mutator.fn function is your mutator implementation wrapped in the validator you provided.

Handling Errors
The handleMutateRequest function skips any mutations that throw:

Copy
const result = await handleMutateRequest(
  dbProvider,
  transact =>
    transact(async (tx, name, args) => {
      // The mutation is skipped and the next mutation runs as normal.
      // The optimistic mutation on the client will be reverted.
      throw new Error('bonk')
    }),
  c.req.raw
)
handleMutateRequest catches such errors and turns them into a structured response that gets sent back to the client. You can recover the errors and show UI if you want.

It is also of course possible for the entire push endpoint to return an HTTP error, or to not reply at all:

Tanstack Start
Next.js
Solid Start
Hono
Copy
export const Route = createFileRoute('/api/zero/mutate')({
  server: {
    handlers: {
      POST: async () => {
        throw new Error('zonk') // will trigger resend
      }
    }
  }
})
If Zero receives any response from the mutate endpoint other than HTTP 200, 401, or 403, it will disconnect and enter the error state.

If Zero receives HTTP 401 or 403, the client will enter the needs auth state and require a manual reconnect with zero.connection.connect(), then it will retry all queued mutations.

If you want a different behavior, it is possible to implement the mutate endpoint yourself and handle errors differently.

Custom Mutate URL
By default, Zero sends mutations to the URL specified in the ZERO_MUTATE_URL parameter.

However you can customize this on a per-client basis. To do so, list multiple comma-separated URLs in the ZERO_MUTATE_URL parameter:

Copy
export ZERO_MUTATE_URL="https://api.example.com/mutate,https://api.staging.example.com/mutate"
Then choose one of those URLs by passing it to mutateURL on the Zero constructor:

Copy
const opts: ZeroOptions = {
  // ...
  mutateURL: 'https://api.staging.example.com/mutate'
}
URL Patterns
The strings listed in ZERO_MUTATE_URL can also be URLPatterns:

Copy
export ZERO_MUTATE_URL="https://mybranch-*.preview.myapp.com/mutate"
For more information, see the URLPattern section of the Queries docs. It works the same way for mutations.

Server-Specific Code
To implement server-specific code, just run different mutators in your mutate endpoint. Server authority to the rescue!

defineMutators accepts a baseMutators parameter that makes this easy. The returned mutator registry will contain all the mutators from baseMutators, plus any new ones you define or override:

Copy
// server-mutators.ts
import {defineMutators, defineMutator} from '@rocicorp/zero'
import {z} from 'zod'
import {zql} from 'schema.ts'
import {mutators as sharedMutators} from 'mutators.ts'
 
export const serverMutators = defineMutators(
  sharedMutators,
  {
    posts: {
      // Overrides the shared mutator definition with same name.
      update: defineMutator(
        z.object({
          id: z.string(),
          title: z.string().optional(),
          priority: z.number().optional()
        }),
        async ({
          tx,
          ctx: {userID},
          args: {id, title, priority}
        }) => {
          // Run the shared mutator first.
          await sharedMutators.posts.update.fn({
            tx,
            ctx,
            args
          })
 
          // Record a history of this operation happening in an audit log table.
          await tx.mutate.auditLog.insert({
            issueId: id,
            action: 'update-title',
            timestamp: Date.getTime()
          })
        }
      )
    }
  }
)
For simple things, we also expose a location field on the transaction object that you can use to branch your code:

Copy
const myMutator = defineMutator(async ({tx}) => {
  if (tx.location === 'client') {
    // Client-side code
  } else {
    // Server-side code
  }
})
Running Mutators
Once you have registered your mutators, you can invoke them with zero.mutate:

Copy
import {mutators} from 'mutators.ts'
import {nanoid} from 'nanoid'
 
zero.mutate(
  mutators.issue.update({
    id: nanoid(),
    title: 'New title'
  })
)
🎲
Client-generated random IDs recommended
Client-generated random IDs from libraries like uuid, ulid, or nanoid work much better with sync engines like Zero. See IDs for more details.

Waiting for Results
We typically recommend that you "fire and forget" mutators.

Optimistic mutations make sense when the common case is that a mutation succeeds. If a mutation frequently fails, then showing the user an optimistic result isn't very useful, because it will likely be wrong.

That said there are cases where it is nice to know when a write succeeded on either the client or server.

One example is if you need to read a row directly after writing it. Zero's local writes are very fast (almost always < 1 frame), but because Zero is backed by IndexedDB, writes are still technically asynchronous and reads directly after a write may not return the new data.

You can use the .client promise in this case to wait for a write to complete on the client side:

Copy
const write = zero.mutate(
  mutators.issue.insert({
    id: nanoid(),
    title: 'New title'
  })
)
 
// issue-123 not guaranteed to be present here. read1 may be undefined.
const read1 = await zero.run(
  queries.issue.byId('issue-123').one()
)
 
// Await client write – almost always less than 1 frame, and same
// macrotask, so no browser paint will occur here.
const res = await write.client
 
if (res.type === 'error') {
  console.error('Mutator failed on client', res.error)
}
 
// issue-123 definitely can be read now.
const read2 = await zero.run(
  queries.issue.byId('issue-123').one()
)
You can also wait for the server write to succeed:

Copy
const write = zero.mutate(
  mutators.issue.insert({
    id: nanoid(),
    title: 'New title'
  })
)
 
const clientRes = await write.client
if (clientRes.type === 'error') {
  throw new Error(
    `Mutator failed on client`,
    clientRes.error
  )
}
 
// optimistic write guaranteed to be present here, but not
// server write.
const read1 = await zero.run(
  queries.issue.byId('issue-123').one()
)
 
// Await server write – this involves a round-trip.
const serverRes = await write.server
if (serverRes.type === 'error') {
  throw new Error(
    `Mutator failed on server`,
    serverRes.error
  )
}
 
// issue-123 is written to server and any results are
// synced to this client.
// read2 could potentially be undefined here, for example if the
// server mutator rejected the write.
const read2 = await zero.run(
  queries.issue.byId('issue-123').one()
)
If the client-side mutator fails, the .server promise is also rejected with the same error. You don't have to listen to both promises, the server promise covers both cases.

🤔
Returning data from mutators
There is not yet a way to return data from mutators in the success case. Let us know if you need this.

Permissions
Because mutators are just normal TypeScript functions that run server-side, there is no need for a special permissions system. You can implement whatever permission checks you want using plain TypeScript code.

See Permissions for more information.

Dropping Down to Raw SQL
The ServerTransaction interface has a dbTransaction property that exposes the underlying database connection. This allows you to run raw SQL queries directly against the database.

This is useful for complex queries, or for using Postgres features that Zero doesn't support yet:

Copy
const markAllAsRead = defineMutator(
  z.object({
    userId: z.string()
  }),
  async ({tx, args: {userId}}) => {
    // shared stuff ...
 
    if (tx.location === 'server') {
      // `tx` is now narrowed to `ServerTransaction`.
      // Do special server-only stuff with raw SQL.
      await tx.dbTransaction.query(
        `
      UPDATE notification
      SET read = true
      WHERE user_id = $1
    `,
        [userId]
      )
    }
  }
)
See ZQL on the Server for more information.

Notifications and Async Work
The best way to handle notifications and async work is a transactional outbox. This ensures that notifications actually do eventually get sent, without holding open database transactions to talk over the network. This can be implemented very easily in Zero by writing notifications to an outbox table as part of your mutator, then processing that table periodically with a background job.

However sometimes it's still nice to do a quick and dirty async send as part of a mutation, for example early on in development, or to record metrics. For this, the createMutators pattern is useful:

Copy
// server-mutators.ts
import {defineMutator} from '@rocicorp/zero'
import z from 'zod'
import {zql} from 'schema.ts'
import {mutators as clientMutators} from 'mutators.ts'
 
// Instead of defining server mutators as a constant,
// define them as a function of a list of async tasks.
export function createMutators(
  asyncTasks: Array<() => Promise<void>>
) {
  return defineMutators(clientMutators, {
    issue: {
      update: defineMutator(
        z.object({
          id: z.string(),
          title: z.string()
        }),
        async (tx, {id, title}) => {
          await tx.mutate.issue.update({id, title})
          asyncTasks.push(() => sendEmailToSubscribers(id))
        }
      )
    }
  })
}
Then in your mutate handler:

Tanstack Start
Next.js
Solid Start
Hono
Copy
export const Route = createFileRoute('/api/zero/mutate')({
  server: {
    handlers: {
      POST: async ({request}) => {
        const asyncTasks: Array<() => Promise<void>> = []
        const mutators = createMutators(asyncTasks)
 
        const result = await handleMutateRequest(
          dbProvider,
          transact =>
            transact((tx, name, args) => {
              const mutator = mustGetMutator(mutators, name)
              return mutator.fn({
                tx,
                ctx: {userId: 'anon'},
                args
              })
            }),
          request
        )
 
        // Run all async tasks
        // If any fail, do not block the response, since the
        // mutation result has already been written to the database.
        await Promise.allSettled(
          asyncTasks.map(task => task())
        )
        return json(result)
      }
    }
  }
})
Custom Mutate Implementation
You can manually implement the mutate endpoint in any programming language.

This will be documented in the future, but you can refer to the handleMutateRequest source code for an example for now.

Previous
Reading Data
Next
ZQL Reference

ZQL
Zero Query Language

Inspired by SQL, ZQL is expressed in TypeScript with heavy use of the builder pattern. If you have used Drizzle or Kysely, ZQL will feel familiar.

ZQL queries are composed of one or more clauses that are chained together into a query.

Create a Builder
To get started, use createBuilder.

If you use drizzle-zero or prisma-zero, this happens automatically and an instance is stored in the zql constant exported from schema.ts:

Copy
import {zql} from 'schema.ts'
 
// zql.myTable.where(...)
Otherwise, create an instance manually:

Copy
// schema.ts
// ...
export const zql = createBuilder(schema)
Select
ZQL queries start by selecting a table. There is no way to select a subset of columns; ZQL queries always return the entire row, if permissions allow it.

Copy
import {zql} from 'zero.ts'
 
// Returns a query that selects all rows and columns from the
// issue table.
zql.issue
This is a design tradeoff that allows Zero to better reuse the row locally for future queries. This also makes it easier to share types between different parts of the code.

🧑‍🏫
Data returned from ZQL should be considered immutable
This means you should not modify the data directly. Instead, clone the data and modify the clone.

ZQL caches values and returns them multiple times. If you modify a value returned from ZQL, you will modify it everywhere it is used. This can lead to subtle bugs.

JavaScript and TypeScript lack true immutable types so we use readonly to help enforce it. But it's easy to cast away the readonly accidentally.

Ordering
You can sort query results by adding an orderBy clause:

Copy
zql.issue.orderBy('created', 'desc')
Multiple orderBy clauses can be present, in which case the data is sorted by those clauses in order:

Copy
// Order by priority descending. For any rows with same priority,
// then order by created desc.
zql.issue
  .orderBy('priority', 'desc')
  .orderBy('created', 'desc')
All queries in ZQL have a default final order of their primary key. Assuming the issue table has a primary key on the id column, then:

Copy
// Actually means: zql.issue.orderBy('id', 'asc');
zql.issue
 
// Actually means: zql.issue.orderBy('priority', 'desc').orderBy('id', 'asc');
zql.issue.orderBy('priority', 'desc')
Limit
You can limit the number of rows to return with limit():

Copy
zql.issue.orderBy('created', 'desc').limit(100)
Paging
You can start the results at or after a particular row with start():

Copy
let start: IssueRow | undefined
while (true) {
  let q = zql.issue
    .orderBy('created', 'desc')
    .limit(100)
  if (start) {
    q = q.start(start)
  }
  const batch = await q.run()
  console.log('got batch', batch)
 
  if (batch.length < 100) {
    break
  }
  start = batch[batch.length - 1]
}
By default start() is exclusive - it returns rows starting after the supplied reference row. This is what you usually want for paging. If you want inclusive results, you can do:

Copy
zql.issue.start(row, {inclusive: true})
Getting a Single Result
If you want exactly zero or one results, use the one() clause. This causes ZQL to return Row|undefined rather than Row[].

Copy
const result = await zql.issue
  .where('id', 42)
  .one()
  .run()
if (!result) {
  console.error('not found')
}
one() overrides any limit() clause that is also present.

Relationships
You can query related rows using relationships that are defined in your Zero schema.

Copy
// Get all issues and their related comments
zql.issue.related('comments')
Relationships are returned as hierarchical data. In the above example, each row will have a comments field, which is an array of the corresponding comments rows.

You can fetch multiple relationships in a single query:

Copy
zql.issue
  .related('comments')
  .related('reactions')
  .related('assignees')
Refining Relationships
By default all matching relationship rows are returned, but this can be refined. The related method accepts an optional second function which is itself a query.

Copy
zql.issue.related(
  'comments',
  // It is common to use the 'q' shorthand variable for this parameter,
  // but it is a _comment_ query in particular here, exactly as if you
  // had done zql.comment.
  q =>
    q
      .orderBy('modified', 'desc')
      .limit(100)
      .start(lastSeenComment)
)
This relationship query can have all the same clauses that top-level queries can have.

😬
Order and limit not supported in junction relationships
Using orderBy or limit in a relationship that goes through a junction table (i.e., a many-to-many relationship) is not currently supported and will throw a runtime error. See bug 3527.

You can sometimes work around this by making the junction relationship explicit, depending on your schema and usage.

Nested Relationships
You can nest relationships arbitrarily:

Copy
// Get all issues, first 100 comments for each (ordered by modified,desc),
// and for each comment all of its reactions.
zql.issue.related('comments', q =>
  q
    .orderBy('modified', 'desc')
    .limit(100)
    .related('reactions')
)
Where
You can filter a query with where():

Copy
zql.issue.where('priority', '=', 'high')
The first parameter is always a column name from the table being queried. TypeScript completion will offer available options (sourced from your Zero Schema).

Comparison Operators
Where supports the following comparison operators:

Operator	Allowed Operand Types	Description
= , !=	boolean, number, string	JS strict equal (===) semantics
< , <=, >, >=	number	JS number compare semantics
LIKE, NOT LIKE, ILIKE, NOT ILIKE	string	SQL-compatible LIKE / ILIKE
IN , NOT IN	boolean, number, string	RHS must be array. Returns true if rhs contains lhs by JS strict equals.
IS , IS NOT	boolean, number, string, null	Same as = but also works for null
TypeScript will restrict you from using operators with types that don’t make sense – you can’t use > with boolean for example.

🤔
Note
If you don’t see the comparison operator you need, let us know, many are easy to add.

Equals is the Default Comparison Operator
Because comparing by = is so common, you can leave it out and where defaults to =.

Copy
zql.issue.where('priority', 'high')
Comparing to null
As in SQL, ZQL’s null cannot be compared with =, !=, <, or any other normal comparison operator. Comparing any value to null with such operators is always false:

Comparison	Result
42 = null	false
42 < null	false
42 > null	false
42 != null	false
null = null	false
null != null	false
These semantics feel a bit weird, but they are consistent with SQL. The reason SQL does it this way is to make join semantics work: if you’re joining employee.orgID on org.id you do not want an employee in no organization to match an org that hasn’t yet been assigned an ID.

For when you purposely do want to compare to null ZQL supports IS and IS NOT operators that also work just like in SQL:

Copy
// Find employees not in any org.
zql.employee.where('orgID', 'IS', null)
 
// Find employees in an org other than 42 OR employees in NO org
zql.employee.where('orgID', 'IS NOT', 42)
TypeScript will prevent you from comparing to null with other operators.

Compound Filters
The argument to where can also be a callback that returns a complex expression:

Copy
// Get all issues that have priority 'critical' or else have both
// priority 'medium' and not more than 100 votes.
zql.issue.where(({cmp, and, or, not}) =>
  or(
    cmp('priority', 'critical'),
    and(
      cmp('priority', 'medium'),
      not(cmp('numVotes', '>', 100))
    )
  )
)
cmp is short for compare and works the same as where at the top-level except that it can’t be chained and it only accepts comparison operators (no relationship filters – see below).

Note that chaining where() is also a one-level and:

Copy
// Find issues with priority 3 or higher, owned by aa
zql.issue
  .where('priority', '>=', 3)
  .where('owner', 'aa')
Comparing Literal Values
The where clause always expects its first parameter to be a column name as a string. Same with the cmp helper:

Copy
// "foo" is a column name, not a string:
zql.issue.where('foo', 'bar')
 
// "foo" is a column name, not a string:
zql.issue.where(({cmp}) => cmp('foo', 'bar'))
To compare to a literal value, use the cmpLit helper:

Copy
zql.issue.where(cmpLit('foobar', 'foo' + 'bar'))
This is particularly useful for implementing permissions, because the first parameter can be a field of your context:

Copy
zql.issue.where(cmpLit(ctx.role, 'admin'))
Relationship Filters
Your filter can also test properties of relationships. Currently the only supported test is existence:

Copy
// Find all orgs that have at least one employee
zql.organization.whereExists('employees')
The argument to whereExists is a relationship, so just like other relationships, it can be refined with a query:

Copy
// Find all orgs that have at least one cool employee
zql.organization.whereExists('employees', q =>
  q.where('location', 'Hawaii')
)
As with querying relationships, relationship filters can be arbitrarily nested:

Copy
// Get all issues that have comments that have reactions
zql.issue.whereExists('comments', q =>
  q.whereExists('reactions')
)
The exists helper is also provided which can be used with and, or, cmp, and not to build compound filters that check relationship existence:

Copy
// Find issues that have at least one comment or are high priority
zql.issue.where({cmp, or, exists} =>
  or(
    cmp('priority', 'high'),
    exists('comments'),
  ),
)
Type Helpers
You can get the TypeScript type of the result of a query using the QueryResultType helper:

Copy
import type {QueryResultType} from '@rocicorp/zero'
 
const complexQuery = zql.issue.related(
  'comments',
  q => q.related('author')
)
type MyComplexResult = QueryResultType<typeof complexQuery>
 
// MyComplexResult is: readonly IssueRow & {
//   readonly comments: readonly (CommentRow & {
//     readonly author: readonly AuthorRow|undefined;
//   })[];
// }[]
You can get the type of a single row with QueryRowType:

Copy
import type {QueryRowType} from '@rocicorp/zero'
 
type MySingleRow = QueryRowType<typeof complexQuery>
 
// MySingleRow is: readonly IssueRow & {
//   readonly comments: readonly (CommentRow & {
//     readonly author: readonly AuthorRow|undefined;
//   })[];
// }
Planning
Zero automatically plans queries, selecting the best indexes and join orders in most cases.

Inspecting Query Plans
You can inspect the plan that Zero generates for any ZQL query using the inspector.

Manually Flipping Joins
The process Zero uses to optimize joins is called "join flipping", because it involves "flipping" the order of joins to minimize the number of rows processed.

Typically the Zero planner will pick the joins to flip automatically. But in some rare cases, you may want to manually specify the join order. This can be done by passing the flip:true option to whereExists:

Copy
// Find the first 100 documents that user 42 can edit,
// ordered by created desc. Because each user is an editor
// of only a few documents, flip:true is much faster than
// flip:false.
zql.documents.whereExists('editors',
    e => e.where('userID', 42),
    {flip: true}
  ),
  .orderBy('created', 'desc')
  .limit(100)
Or with exists:

Copy
// Find issues created by user 42 or that have a comment
// by user 42. Because user 42 has commented on only a
// few issues, flip:true is much faster than flip:false.
zql.issue.where({cmp, or, exists} =>
  or(
    cmp('creatorID', 42),
    exists('comments',
      c => c.where('creatorID', 42),
      {flip: true}),
  ),
)
You can manually flip just one or a few of the whereExists clauses in a query, leaving the rest to be planned automatically.

Previous
Writing Data
Next
ZQL on the Server
On this page

ZQL on the Server
The Zero package includes utilities to run ZQL on the server directly against your upstream Postgres database.

This is useful for many reasons:

It allows mutators to read data using ZQL to check permissions or invariants.
You can use ZQL to implement standard REST endpoints, allowing you to share code with mutators.
In the future (but not yet implemented), this can support server-side rendering.
😬
Warning
ZQLDatabase currently does a read of your postgres schema before every transaction. This is fine for most usages, but for high scale it may become a problem. Let us know if you need a fix for this.

Creating a Database
To run ZQL on the database, you will create a ZQLDatabase instance. Zero ships with several built-in factories for popular Postgres bindings libraries.

Drizzle
Prisma
node-postgres
postgres.js
Copy
// app/api/mutate/db-provider.ts
import {zeroDrizzle} from '@rocicorp/zero/server/adapters/drizzle'
import {schema} from '../../zero/schema.ts'
import * as drizzleSchema from '../../drizzle/schema.ts'
 
// pass a drizzle client instance. for example:
export const drizzleClient = drizzle(pool, {
  schema: drizzleSchema
})
export const dbProvider = zeroDrizzle(schema, drizzleClient)
 
// Register the database provider for type safety
declare module '@rocicorp/zero' {
  interface DefaultTypes {
    dbProvider: typeof dbProvider
  }
}
Within your mutators, you can access the underlying transaction via tx.dbTransaction.wrappedTransaction:

Drizzle
Prisma
node-postgres
postgres.js
Copy
// mutators.ts
export const mutators = defineMutators({
  createUser: defineMutator(
    z.object({id: z.string(), name: z.string()}),
    async ({tx, args: {id, name}}) => {
      if (tx.location === 'server') {
        await tx.dbTransaction.wrappedTransaction
          .insert(drizzleSchema.user)
          .values({id, name})
      }
    }
  )
})
Custom Database
To implement support for some other Postgres bindings library, you will implement the DBConnection interface.

See the implementations for the existing adapters for examples.

Running ZQL
Once you have an instance of ZQLDatabase, use the transaction() method to run ZQL:

Copy
await dbProvider.transaction(async tx => {
  // await tx.mutate...
  // await tx.query...
  // await myMutator.fn({tx, ctx, args})
})
SSR
Zero doesn't yet have the wiring setup in its bindings layers to really nicely support server-side rendering (patches welcome though!).

For now, we don't recommend using Zero with SSR. Use your framework's recommended pattern to prevent SSR execution:

TanStack Start
Next.js
SolidStart
Copy
import {lazy} from 'react'
 
// Use React lazy to defer loading the ZeroProvider
const ZeroProvider = lazy(() =>
  import('@rocicorp/zero/react').then(mod => ({
    default: mod.ZeroProvider
  }))
)
 
function Root() {
  return (
    <ZeroProvider>
      <App />
    </ZeroProvider>
  )
}
Previous
ZQL Reference
Next
Connection Status
On this page
