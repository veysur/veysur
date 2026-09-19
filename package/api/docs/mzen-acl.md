# Mzen

## Access Control in mzen-server

Access control in mzen-server is handled by the **ACL component**.

### Endpoint Configuration

Each endpoint configuration specifies **ACL rules**, which include:

- **ACL role names**
- A flag indicating whether that role name is **permitted** or **not**

### ACL Role Handlers

ACL roles have an associated handler (e.g., `authed`, `projectAdmin`, `projectOwner`), which determines if a request has a given role.

#### `initContext()` Method

The `initContext()` method on the ACL role handler is executed at the beginning of each request. It configures the object `aclContext` with any context data required to determine if the current request has a given role.

**Example:**
The `authed` ACL role handler's `initContext()` method:
- Parses a JWT from the `Authorization` header (if one exists)
- Decodes the JWT
- Stores the decoded JWT data onto the `aclContext`

#### `hasRole()` Method

The `hasRole()` method on an ACL role handler:
- Takes the `aclContext` object
- Determines if the current request has a given role

**Example:**
The `authed` role handler returns `true` if the `aclContext` contains decoded JWT data.

The `hasRole()` method can return:
- A **boolean** (`true`/`false`)
- An **object** defining conditions under which the request has the associated role

**Example:**
The `projectAdmin` role handler:
- Checks the `project` data in the JWT for an array of project IDs that the current user has permission to administer
- Returns this array as the property `projectAdmin`

### Passing Data to Request Handlers

The data returned by `hasRole()` is provided to the request handler method as `aclConditions`. The request handler can use this data to complete the request.

### Project-Scoped Endpoints

When an endpoint operates on a single project's data, gate it with `role: 'projectOwner'` or `'projectAdmin'` and declare `projectId: { src: 'param' }` in the endpoint's `data` — the role handler checks the JWT's `project` map itself (see `src/acl/role-assessor/ProjectOwner.ts` / `ProjectAdmin.ts`), with no repo query needed.

Don't gate this kind of endpoint with a generic role (e.g. `customer`) and add a manual ownership lookup inside the service method instead — that duplicates a check the ACL layer already guarantees, and is easy to get wrong or forget. See `getPaymentHistory` in `src/endpoint/shared/payment.ts`, which was fixed to use `projectOwner` for exactly this reason.
