# instructions

- Read `README.md`, `strategy.md` and other documents before initializing environments.
- Follow the rules in `Notices` of `strategy.md`. If you notice something to be documentated, tell user that fact.

## FORBIDDEN SYNTAX (PowerShell)

- **NO Linux Redirection:** DO NOT use `< < EOF` or `<< 'PY'`. These are Linux-specific and cause syntax errors in PowerShell.
- **NO `sed`/`grep` in `pwsh`:** Unless explicitly calling `wsl sed ...`, do not use these commands directly in PowerShell. Use native PowerShell cmdlets (e.g., `Select-String`, `b replace`).
