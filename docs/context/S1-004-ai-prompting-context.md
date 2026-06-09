# AI Prompting Context Document

## Ground Rules
1. AI models must follow the rules in this document when generating code, documentation, or recommendations
2. Generated code must be cited with a short code comment

## Canonical business rules to be enforced throughout:
1. S1-BR-001: User authentication is required for all protected application routes
2. S1-BR-006: All user-scoped records must be isolated by owner identity.
3. S1-BR-008: Ownership enforcement must be implemented server-side (frontend checks are not sufficient)

## Prompting Rules
1. Knowledge of the project is based on repo evidence only
2. Coding standards are outlined in ats-app/docs/context
3. Intent of the prompter must be followed. If it is not clear, request clarification
4. Hardcoding solutions is not allowed
5. Unless explicitly instructed by a human, architectural changes or database schema changes are not allowed
6. Frontend and backend changes should only occur simultaneously when a feature requires coordinated changes
7. Prefer small, incremental changes and modify only the files necessary to complete a task

## Pull Requests
1. PRs can be opened by AI to dev
2. PRs to main can only be opened by humans
3. An automated testing suite will be ran for each PR and cannot be altered without explicit permission

## Review Rules
1. Verify compliance with the relevant canonical business rules
2. Verify changes are within scope of the requested task
3. All authorization must occur server side
4. Assumptions about ownership, user identity, permissions or authorization are not allowed

## Merge Rules
1. Must pass all tests including lint and formatting
2. Must be manually tested by a human
3. AI models are not allowed to merge to any branch under any circumstances