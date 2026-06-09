# S1-006 - Configure Linting and Formatting

# Business Rules
1. S1-BR-001: User authentication is required for all protected application routes.
2. S1-BR-006: All user-scoped records must be isolated by owner identity.
## Frontend Lint
- ESLint
    - ESLint will be used as the project's linting tool.
    - Purpose:
    1. Detect coding errors
    2. Identify unused variables and imports
    3. Enforce coding standards
    4. Improve maintainability
## Backend (Python)
- Ruff for linting
- Ruff Formatter for formatting
## Prettier 
- Prettier will be used as the project's formatting tool.
- Automatically format code, ensure consistent code style
## Formatting Standards
- Indentation: Use 2 spaces for indentation. Do not use tabs.
- Function Placement
- Functions should be organized consistently within a file.
    - Recommended order:
        - Imports
        - Constants
        - Types and Interfaces
        - Main Component or Class Definition
        - Helper Functions
        - Exports
## Linting Standards
- Unused Variables: Unused variables should be removed before code is merged.
- Unused Imports: Remove unused imports before code is merged.
## Credentials
- API keys and passwords must not be hardcoded into source files. Environment variables must be used instead.
## Commented-Out Code
- Commented-out production code should not be committed. Unused code should be removed.
## AI-Generated Code Requirements
- AI-generated code must: 
    - Follow all formatting standards
    - Pass linting checks.
    - Follow naming conventions defined in S1-001.
    - Be reviewed by a team member before merging.
## Developer Workflow
- Before submitting a pull request:
    - Run lint/formatting checks.
    - Run formatting checks.
    - Run tests.
    - Resolve all warnings and errors.
    - Submit code for review.