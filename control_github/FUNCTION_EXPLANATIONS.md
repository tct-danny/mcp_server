# Function Explanations for github_mcp_server MCP Server

This document explains the MCP tools defined in `index.js` for interacting with the GitHub API.

## Prerequisites
- This server requires a `GITHUB_TOKEN` environment variable containing a valid GitHub Personal Access Token (PAT) with appropriate permissions for the desired actions.

## MCP Tools

### `create_repository`
- **Purpose:** Creates a new GitHub repository for the authenticated user.
- **MCP Name:** `create_repository`
- **Input Schema:**
    - `name` (string, required): The desired name for the new repository.
    - `description` (string, optional): A short description.
    - `private` (boolean, optional, default: `false`): Whether the repository is private.
- **Process:** Uses `octokit.rest.repos.createForAuthenticatedUser` to create the repository.
- **Output:** Confirmation message with the URL of the created repository or an error message.

### `create_branch`
- **Purpose:** Creates a new branch in a specified repository from a given commit SHA.
- **MCP Name:** `create_branch`
- **Input Schema:**
    - `owner` (string, required): Repository owner's username or organization name.
    - `repo` (string, required): Repository name.
    - `branch` (string, required): Name for the new branch.
    - `sha` (string, required): Commit SHA to base the new branch on.
- **Process:** Uses `octokit.rest.git.createRef` to create the branch reference (`refs/heads/`).
- **Output:** Confirmation message with the branch reference or an error message.

### `create_pull_request`
- **Purpose:** Creates a new pull request in a specified repository.
- **MCP Name:** `create_pull_request`
- **Input Schema:**
    - `owner` (string, required): Repository owner.
    - `repo` (string, required): Repository name.
    - `title` (string, required): Pull request title.
    - `head` (string, required): The source branch name (containing the changes).
    - `base` (string, required): The target branch name (to merge into).
    - `body` (string, optional): Pull request description.
- **Process:** Uses `octokit.rest.pulls.create` to create the pull request.
- **Output:** Confirmation message with the URL of the created pull request or an error message.

### `merge_pull_request`
- **Purpose:** Merges a pull request in a specified repository.
- **MCP Name:** `merge_pull_request`
- **Input Schema:**
    - `owner` (string, required): Repository owner.
    - `repo` (string, required): Repository name.
    - `pull_number` (integer, required): The number identifying the pull request.
    - `commit_title` (string, optional): Title for the merge commit.
    - `commit_message` (string, optional): Message for the merge commit.
    - `merge_method` (enum ["merge", "squash", "rebase"], optional, default: "merge"): Merge strategy.
- **Process:** Uses `octokit.rest.pulls.merge` to merge the pull request. Handles potential errors like non-mergeable states or conflicts.
- **Output:** Confirmation message upon successful merge, or an error message indicating failure or specific issues (e.g., merge conflicts).

### `list_repositories`
- **Purpose:** Lists repositories accessible to the authenticated user based on specified filters.
- **MCP Name:** `list_repositories`
- **Input Schema (all optional with defaults):**
    - `visibility` (enum ["all", "public", "private"], default: "all")
    - `affiliation` (string, default: "owner,collaborator,organization_member")
    - `type` (enum ["all", "owner", "public", "private", "member"], default: "all")
    - `sort` (enum ["created", "updated", "pushed", "full_name"], default: "pushed")
    - `direction` (enum ["asc", "desc"], default: "desc")
    - `per_page` (integer, default: 30, max: 100)
    - `page` (integer, default: 1)
- **Process:** Uses `octokit.rest.repos.listForAuthenticatedUser` with the provided filters and pagination.
- **Output:** A list of repository names (`owner/repo`) found, with a note if more pages might exist. Returns an error message on failure.

### `list_branches`
- **Purpose:** Lists branches for a specific repository.
- **MCP Name:** `list_branches`
- **Input Schema:**
    - `owner` (string, required): Repository owner.
    - `repo` (string, required): Repository name.
    - `per_page` (integer, optional, default: 30, max: 100)
    - `page` (integer, optional, default: 1)
- **Process:** Uses `octokit.rest.repos.listBranches` with the provided owner, repo, and pagination.
- **Output:** A list of branch names found in the repository, with a note if more pages might exist. Returns an error message on failure. 