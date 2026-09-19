# Data Store

The application uses JSON on the client side. It would be good if we could just store this data rather than doing translation back and forth between the client side and the server side. Luckily this issue has come up in previous projects and the Mzen project was created with this in mind. It’s an Object Document Mapper (ODM) with support for MongoDB and MySQL.

## MySQL

One of the arguments against using a document database is that data is not as easy to query when it comes to querying aggregate statistics. With this in mind it might make sense to use a relational database that has support for JSON data type. This way we can get the benefits of a document database while still retaining the ability to have aggregate statistical data stored in a more traditional format.

MySQL provides a limited set of operators and functions for manipulating JSON data so it is important that we choose our data structures very carefully. JSON functions are not lock aware at the JSON path level. When updating the JSON document MySQL retrieves the entire document, modifies it and then stores it back. Concurrent transactions attempting to update the same JSON document can result in race conditions and have unexpected results.

There are a few options for mitigating race conditions on JSON updates:

### Schema Normalisation
Split the JSON into smaller parts which are stored separately.

### Optimistic Locking
Add a version or `updated` field and check it during update.

### JSON_VALUE
The MySQL `JSON_VALUE` function is needed to create generated columns correctly as `JSON_EXTRACT` does not convert JSON null values to MySQL NULL. Since `JSON_VALUE` was introduced in MySQL 8.0.21, this project requires **MySQL 8.0.21 or later**.

## Conventions

- **Primary keys** are named `_id`
- **Primary key values** are a base62 encoded uuid (v7)
  - Base62 is alphanumeric characters
  - The value is 21 characters long
  - Because the uuid is prefixed with a timestamp the resulting base62 id is sortable by creation time
  - We store ids in ASCII encoding since this overlaps with Unicode but requires less storage space (MySQL)
- **Foreign keys** have the suffix `Id`, e.g. `createdById` or `userId`
- **Created and updated datetime fields** are named `created` and `updated`
- **MySQL data source driver** assumes server time is UTC
  - It's good practice to have the server run on UTC time but we shouldn't make any assumption about this
  - **Todo:** update driver to convert from JavaScript UTC to MySQL server time