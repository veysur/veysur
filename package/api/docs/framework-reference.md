# Framework reference

Background on the libraries the API is built on.

### Key Dependencies
- @datacapy/server framework for REST API (see Framework Details below)
- bcryptjs for password hashing
- jsonwebtoken for authentication
- nodemailer for email services
- handlebars for templating
- moment-timezone for date handling
- veysur-common shared library

### Framework Details

#### Datacapy (NodeJS Application Model)
- **Repository**: https://github.com/datacapy/datacapy
- **Version**: 0.1.0
- **Description**: NodeJS application model with ODM capabilities and schema-based data validation
- **Architecture**:
  - **Schemas**: Define data structures and validation rules for documents
  - **Repositories**: Handle data persistence and retrieval from databases
  - **Services**: Manage interactions between repositories (checkout, authenticator, report-generator, email)
- **Key Features**:
  - **Object Document Mapping (ODM)**: Populate documents into constructor instances
  - **Document Relations**: Comprehensive relationship support with auto-population
    - hasOne, hasMany, hasManyCount (count of related documents)
    - belongsToOne, belongsToMany (many-to-many with embedded reference arrays)
    - embeddedHasOne, embeddedHasMany, embeddedBelongsToOne, embeddedBelongsToMany
    - Basic query optimization with configurable auto-population
  - **Data Validation & Type-casting**:
    - Built-in validators: required, notNull, notEmpty, length (min/max), regex, equality, email
    - Custom validator support
    - Automatic type-casting with failure validation errors
    - ObjectID type support (BSON/MongoDB)
  - **Default Values**: Used during validation, insert, or update when fields are undefined/null
  - **Data Sources**: Currently supports MongoDB only

#### @datacapy/schema (Data Schema Library)
- **Repository**: Part of the Datacapy ecosystem
- **Version**: 0.1.0
- **Description**: Standalone Javascript data schema definition and validation library
- **Key Features**:
  - Define Javascript data structure schemas with validation rules
  - Type-casting and default value population
  - Schema composition via named schema references
  - Strict mode validation for undefined fields
  - Field labeling for validation error messages
  - Multiple validator instances per field with custom messages

#### @datacapy/server (REST API Server)
- **Repository**: https://github.com/datacapy/datacapy
- **Version**: 0.1.0
- **Description**: NodeJS REST API server wrapper for the Datacapy domain model
- **Key Features**:
  - **HTTP adaptors**: Runs on Express (default) or Hono through a neutral adaptor; see `package/server/docs/http-adaptor.md` in datacapy
  - **Auto-exposure**: Automatically exposes repositories and services as REST endpoints
  - **Configurable Access**: Repository exposure is configurable for security
  - **Request Processing**: Validation and type-casting of incoming request data
  - **Authentication**: Token-based authentication with custom implementation support
  - **Authorization**: Access control lists (ACL) with user authorization
  - **Dynamic Roles**: Role assessment on each request with default and custom role support

### Development Notes
- Uses relaxed TypeScript configuration for flexibility
- API routes follow RESTful conventions
- Authentication with JWT tokens
- Email templates with Handlebars
- Shared code via veysur-common dependency
