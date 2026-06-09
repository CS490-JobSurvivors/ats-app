# Engineering Coding Standards Context Document

## Relevant Canonical Business Rules
1. S1-BR-001: User authentication is required for all protected application routes. 
2. S1-BR-006: All user-scoped records must be isolated by owner identity.
3. S1-BR-008: Ownership enforcement must be implemented server-side (frontend checks are not sufficient). 
## Naming Conventions 
- Files
    - kebab-case 
    - ex. login-page.tsx
- Variables
    - camelCase
    - ex. applicantName
- Branches
    - feature, bugfix, and hotfix
    - Examples: feature/s1-004/ai-prompting-context, bugfix/s1-010/button-not-working, hotfix/s1-013/login-token-error
- Commits
    - Reference ticket number where applicable
    - Examples: S1-004: Add AI prompting context doc S1-004: Update AI prompting context doc
## Folder Structure
- Organize the folders using a feature-based structure, separating the frontend and backend, and the different features/modules
## Folder Responsibilities 
1. We can update it as we go, adding new folders and files here
## Linting
- Credentials cannot be hardcoded
- Run linting and tests before PR
- Remove any unused imports or variables
- All code must pass the linter before merging
## Formatting
- Enforced by Prettier
- If a function’s purpose isn’t immediately clear, add a short function level comment explaining its intent and any relevant business rules
- Error Handling Style
- Errors should be handled consistently across the application.
## Backend
- Use HTTP status codes
## Frontend
- Show error messages that humans can understand
- Error messages should not reveal important information 
- API Response Conventions 
- All API must return a consistent response in JSON