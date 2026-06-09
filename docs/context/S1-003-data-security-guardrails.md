# Data and Security Guardrails Context Document

## Ground Rules
1. AI models must follow the rules in this document when generating code or recommendations
2. All authorization and ownership rules must be enforced server-side

## Canonical Business Rules to be enforced throughout:
1. S1-BR-001: User authentication is required for all protected application routes
2. S1-BR-006: All user-scoped records must be isolated by owner identity
3. S1-BR-008: Ownership enforcement must be implemented server-side (frontend checks are not sufficient)

## Per-User Data Ownership
1. Every record should be linked to the user who made it
2. All records should store owner's user ID
   - examples: profile data, apps, job records
3. Users can only access/edit/delete their own records

## Authorization Checks
1. Always verify the user is logged in before handling any user data
   - If not logged in -> return 401 unauthorized
   - If trying to access another user's data -> 403 forbidden
2. Always validate the user's login token on every API call

## Protected Route Behavior
1. Always redirect unauthenticated users to the login page
2. Always block unauthorized access on the backend even if the frontend is bypassed

## Prohibited Cross User Access Patterns
1. Never allow User A to read, edit, or delete User B's data
2. Always filter queries by the logged in user's ID

## General Security Rules
1. Never store passwords in plain text - use a hashing library like bcrypt or argon2
2. Never commit secrets to repo
   - Store them in .env files locally
   - examples: passwords, api keys