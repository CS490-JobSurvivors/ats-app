Data and Security Guardrails Context Document

Per-User Data Ownership
every record should be linked to the user who made it 
All records should store owner’s user id 
examples: profile data, apps, job records
Users can only access/edit/delete their own records

Authorization Checks
Always verify the user is logged in before handling any user data
if not logged in -> return 401 unauthorized 
if trying to access another user’s data -> 403 forbidden 
Always validate another user’s login token on every API call


Protected route behavior
Always redirect unauthenticated users to the login page
Always block unauthorized access on the backend even if the frontend is bypassed

Prohibited cross user access patterns
Never allow User A to read, edit, or delete User B’s data
Always filter queries by the logged in user’s ID

General security rules
Never store passwords in plain text. Use a hashing library like bcrypt or argon2
Never commit secrets to repo 
Store them in .env files locally
examples: passwords, api keys 
