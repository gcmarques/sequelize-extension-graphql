# sequelize-extension-graphql

[![Build Status](https://travis-ci.org/gcmarques/sequelize-extension-graphql.svg?branch=master)](https://travis-ci.org/gcmarques/sequelize-extension-graphql)
[![codecov](https://codecov.io/gh/gcmarques/sequelize-extension-graphql/branch/master/graph/badge.svg)](https://codecov.io/gh/gcmarques/sequelize-extension-graphql)
![GitHub license](https://img.shields.io/github/license/gcmarques/sequelize-extension-graphql.svg)

### Installation
```bash
$ npm install --save sequelize-extension-graphql
```

### Usage

This library uses [sequelize-extension](https://www.npmjs.com/package/sequelize-extension) to create a GraphQL schema and resolvers based on the sequelize models.
```javascript
const Sequelize = require('sequelize');
const extendSequelize = require('sequelize-extension');
const enhanceGraphql = require('sequelize-extension-graphql');

const sequelize = new Sequelize(...);

const db = {};
db.User = sequelize.define('user', {
  username: Sequelize.STRING(255),
  password: {
    type: Sequelize.STRING(255),
    hidden: true, // this attribute will not be exposed to graphql
  },
});

db.User.mutations = {};
db.User.queries = {};

db.User.mutations.authenticate = {
  input: `
    AuthenticateUserInput {
      username: String
      password: String
    }`,
  schema: `
    # Authenticate \[user\]() with username and password.
    authenticate(with: AuthenticateUserInput!): JSON!
  `,
  resolver: async (parent, input, ctx, info) => {
    const { username, password } = input.with;
    ...
  },
};

db.User.queries.retrieve = {
  schema: `
    # Query one \[user\]() entity by its unique id or open an anonymous context for \[user\].
    user(id: ID)
  `,
  resolver: async (_, input, ctx, info) => {
    ...
  },
};

db.User.queries.pendingEmails = {
  input: `
    PendingEmailInput {
      Since: Int
    }
  `,
  schema: `
    # Query \[user\]()'s pending emails.
    pendingEmails(with: PendingEmailInput!): JSON!
  `,
  resolver: async (_, input, ctx, info) => {
    ...
  },
};

extendSequelize(db, {
  graphql: enhanceGraphql(),
});

const schema = db.getGraphQLExecutableSchema();
```

It will create an executable GraphQL schema similar to this:
```graphql
schema {
  query: root
  mutation: root
}

scalar UUID

scalar JSON

scalar Jsontype

scalar Date

input AuthenticateUserInput {
  username: String
  password: String
}

input PendingEmailInput {
  since: Int
}

type root {
  # Query one [user]() entity by its unique id or open an anonymous context for [user].
  user(id: ID): user
  pendingEmails(with: PendingEmailInput!): JSON!
}

type user {
  id: ID!
  username: String
  
  # Authenticate \[user\]() with username and password.
  authenticate(with: AuthenticateUserInput!): JSON!
}
```

### Using with graphql-tools-sequelize

[graphql-tools-sequelize](https://github.com/rse/graphql-tools-sequelize) is very useful if you want to quickly have a CRUD. Just make sure gts has booted before extending the models. 

It will create an executable GraphQL schema similar to this:
```javascript
const Sequelize = require('sequelize');
const extendSequelize = require('sequelize-extension');
const enhanceGraphql = require('sequelize-extension-graphql');
const GraphQLToolsSequelize = require('graphql-tools-sequelize');

const db = {};
const gts = new GraphQLToolsSequelize(sequelize, { idtype: 'ID' });

// ...
async function extend() {
  await gts.boot();
  extendSequelize(db, {
    graphql: enhanceGraphql({ gts }),
  });
}

db.User = sequelize.define('user', {
  username: Sequelize.STRING(255),
  password: {
    type: Sequelize.STRING(255),
    hidden: true, // this attribute will not be exposed to graphql
});

db.User.mutations = {};
db.User.queries = {};

// You can overried gts CRUD functions by settings it on the model.
// The default gts functions are "create", "update",
// "delete" and "clone" within mutations and "retrieve" and "list"
// within queries. 
db.User.mutations.create = {
  input: `
    CustomCreateInput {
      username: String
      password: String
    }
  `,
  schema: `
    # Create \[user\]() with username and password.
    create(with: CustomCreateInput!): user!
  `,
  resolver: async (_, input, ctx, info) => {
    ...
  },
}

// You can also prevent a CRUD function by setting it to false.
db.User.mutations.clone = false;

extend().then(() => {
  console.log('Ready');
});
```

It will create an executable GraphQL schema similar to this:
```graphql
schema {
  query: root
  mutation: root
}

scalar UUID

scalar JSON

scalar Jsontype

scalar Date

input CustomCreateInput {
  username: String
  password: String
}

type root {
  # Query one [user]() entity by its unique id or open an anonymous context for [user].
  user(id: ID): user

  # Query one or many [user]() entities,
  # by either an (optionally available) full-text-search (`query`)
  # or an (always available) attribute-based condition (`where`),
  # optionally sort them (`order`),
  # optionally start the result set at the n-th entity (zero-based `offset`), and
  # optionally reduce the result set to a maximum number of entities (`limit`).
  users(fts: String, where: JSON, order: JSON, offset: Int = 0, limit: Int = 100): [user]!
}

type user {
  id: ID!
  username: String

  # Create \[user\]() with a json.
  create(with: JSON): user!

  # Update one [user]() entity with specified attributes (`with`).
  update(with: JSON!): user!

  # Delete one [user]() entity.
  delete: ID!
}
```

### Options

* `enums` (String?)
  Additional custom enum definitions to be added to the schema. Note: Sequelize.ENUM will be automatically created by this extension.
* `inputs` (String?)
  Additional custom input definitions to be added to the schema.
* `methods` (String?)
  Additional custom query methods to be added to the schema.
* `types` (String?)
  Additional custom type definitions to be added to the schema.
* `gts` ([GraphqlToolsSequelize](https://github.com/rse/graphql-tools-sequelize)?)
  Graphql-tools-sequelize interface to create methods. The extension will use (if available):
  * `entityQuerySchema` and `entityQueryResolver` to define `retrieve` and `list`.
  * `entityCreateSchema` and `entityCreateResolver` to define `create`.
  * `entityCloneSchema` and `entityCloneResolver` to define `clone`.
  * `entityUpdateSchema` and `entityUpdateResolver` to define `update`.
  * `entityDeleteSchema` and `entityDeleteResolver` to define `delete`.

### Other Extensions
[sequelize-extension-tracking](https://www.npmjs.com/package/sequelize-extension-tracking) - Automatically track sequelize instance updates.\
[sequelize-extension-updatedBy](https://www.npmjs.com/package/sequelize-extension-updatedBy) - Automatically set `updatedBy` with `options.user.id` option.\
[sequelize-extension-deletedBy](https://www.npmjs.com/package/sequelize-extension-deletedBy) - Automatically set `deletedBy` with `options.user.id` option.\
[sequelize-extension-createdBy](https://www.npmjs.com/package/sequelize-extension-createdBy) - Automatically set `createdBy` with `options.user.id` option.
