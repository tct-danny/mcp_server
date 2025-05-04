import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Octokit } from "@octokit/rest";
import { z } from "zod";
import dotenv from 'dotenv';

// Load environment variables from .env file (optional, good for local dev)
dotenv.config();

// --- GitHub Client Setup ---
const githubToken = process.env.GITHUB_TOKEN;

if (!githubToken) {
  console.error("Error: GITHUB_TOKEN environment variable not set.");
  // In a real MCP server, we should probably communicate this error back via MCP
  // but for now, we'll exit if the token isn't found.
  process.exit(1);
}

const octokit = new Octokit({
  auth: githubToken,
  userAgent: 'CursorGitHubMCPServer/v1.0.0' // Good practice to identify your app
});

// --- MCP Server Setup ---
const server = new McpServer({
  name: "GitHub Actions",
  version: "1.0.0",
  // Add capabilities as we add tools
  capabilities: {
    tools: {} // Indicate we will provide tools
  }
});

// --- Tool Definitions (To be added) ---

// Create Repository Tool
server.tool(
  "create_repository",
  // Zod schema for parameters
  {
    name: z.string().describe("Required. The name of the repository."),
    description: z.string().optional().describe("A short description of the repository."),
    private: z.boolean().optional().default(false).describe("Whether the repository is private."),
    // Add other relevant options like auto_init, gitignore_template, license_template if needed
  },
  // Handler function
  async ({ name, description, private: isPrivate }) => {
    try {
      console.error(`Attempting to create repository: ${name}`); // Log attempt
      const response = await octokit.rest.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
      });
      console.error(`Successfully created repository: ${response.data.html_url}`); // Log success
      return {
        content: [
          { type: "text", text: `Successfully created repository: ${response.data.html_url}` }
        ]
      };
    } catch (error) {
      console.error(`Error creating repository ${name}:`, error); // Log error
      // Provide a more informative error message to the LLM
      const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
      const errorDetails = error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : "No further details.";
      return {
        content: [
          { type: "text", text: `Error creating repository '${name}': ${errorMessage}\nDetails: ${errorDetails}` }
        ],
        isError: true // Indicate that this is an error response
      };
    }
  }
);

// Create Branch Tool
server.tool(
  "create_branch",
  // Zod schema for parameters
  {
    owner: z.string().describe("Required. The account owner of the repository (e.g., 'octocat')."),
    repo: z.string().describe("Required. The name of the repository without the .git extension."),
    branch: z.string().describe("Required. The name for the new branch."),
    sha: z.string().describe("Required. The SHA1 value for the commit to base the new branch from.")
  },
  // Handler function
  async ({ owner, repo, branch, sha }) => {
    try {
      console.error(`Attempting to create branch '${branch}' in ${owner}/${repo} from SHA ${sha}`);
      const response = await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha,
      });
      console.error(`Successfully created branch: ${response.data.ref}`);
      return {
        content: [
          { type: "text", text: `Successfully created branch '${branch}' in repository ${owner}/${repo}. Ref: ${response.data.ref}` }
        ]
      };
    } catch (error) {
      console.error(`Error creating branch '${branch}' in ${owner}/${repo}:`, error);
      const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
      const errorDetails = error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : "No further details.";
      return {
        content: [
          { type: "text", text: `Error creating branch '${branch}' in ${owner}/${repo}: ${errorMessage}\nDetails: ${errorDetails}` }
        ],
        isError: true
      };
    }
  }
);

// Create Pull Request Tool
server.tool(
  "create_pull_request",
  // Zod schema for parameters
  {
    owner: z.string().describe("Required. The account owner of the repository."),
    repo: z.string().describe("Required. The name of the repository."),
    title: z.string().describe("Required. The title of the pull request."),
    head: z.string().describe("Required. The name of the branch where your changes are implemented."),
    base: z.string().describe("Required. The name of the branch you want the changes pulled into."),
    body: z.string().optional().describe("The contents of the pull request body (description)."),
    // Add draft, maintainer_can_modify if needed
  },
  // Handler function
  async ({ owner, repo, title, head, base, body }) => {
    try {
      console.error(`Attempting to create PR in ${owner}/${repo}: '${title}' (${head} -> ${base})`);
      const response = await octokit.rest.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body,
      });
      console.error(`Successfully created PR: ${response.data.html_url}`);
      return {
        content: [
          { type: "text", text: `Successfully created pull request: ${response.data.html_url}` }
        ]
      };
    } catch (error) {
      console.error(`Error creating PR in ${owner}/${repo}:`, error);
      const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
      const errorDetails = error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : "No further details.";
      return {
        content: [
          { type: "text", text: `Error creating pull request in ${owner}/${repo}: ${errorMessage}\nDetails: ${errorDetails}` }
        ],
        isError: true
      };
    }
  }
);

// Merge Pull Request Tool
server.tool(
  "merge_pull_request",
  // Zod schema for parameters
  {
    owner: z.string().describe("Required. The account owner of the repository."),
    repo: z.string().describe("Required. The name of the repository."),
    pull_number: z.number().int().describe("Required. The number that identifies the pull request."),
    commit_title: z.string().optional().describe("Title for the automatic commit message."),
    commit_message: z.string().optional().describe("Extra detail to append to automatic commit message."),
    merge_method: z.enum(["merge", "squash", "rebase"]).optional().describe("Merge method to use. Default: 'merge'")
  },
  // Handler function
  async ({ owner, repo, pull_number, commit_title, commit_message, merge_method }) => {
    try {
      console.error(`Attempting to merge PR #${pull_number} in ${owner}/${repo}`);
      const response = await octokit.rest.pulls.merge({
        owner,
        repo,
        pull_number,
        commit_title,
        commit_message,
        merge_method: merge_method || "merge", // Default to merge if not provided
      });

      if (response.data.merged) {
        console.error(`Successfully merged PR #${pull_number}: ${response.data.message}`);
        return {
          content: [
            { type: "text", text: `Successfully merged pull request #${pull_number}. Message: ${response.data.message}` }
          ]
        };
      } else {
        // This case might happen if the merge couldn't be completed (e.g., conflicts after the API call started)
        console.error(`Failed to merge PR #${pull_number}: ${response.data.message}`);
        return {
          content: [
            { type: "text", text: `Failed to merge pull request #${pull_number}. Message: ${response.data.message}` }
          ],
          isError: true
        };
      }
    } catch (error) {
      console.error(`Error merging PR #${pull_number} in ${owner}/${repo}:`, error);
      const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
      // GitHub might return 405 Method Not Allowed if not mergeable, or 409 Conflict
      const statusCode = error.response?.status;
      let errorText = `Error merging pull request #${pull_number} in ${owner}/${repo}: ${errorMessage}`;
      if (statusCode === 405) {
         errorText += " (Hint: The PR might not be mergeable yet. Check for conflicts or required checks.)";
      } else if (statusCode === 409) {
         errorText += " (Hint: A conflict occurred during the merge attempt.)";
      }

      return {
        content: [
          { type: "text", text: errorText }
        ],
        isError: true
      };
    }
  }
);

// List Repositories Tool
server.tool(
  "list_repositories",
  // Zod schema for parameters
  {
    visibility: z.enum(["all", "public", "private"]).optional().default("all").describe("Limit results by repository visibility."),
    affiliation: z.string().optional().default("owner,collaborator,organization_member").describe("Comma-separated list of affiliations (e.g., owner,collaborator,organization_member)."),
    type: z.enum(["all", "owner", "public", "private", "member"]).optional().default("all").describe("Limit results by repository type."),
    sort: z.enum(["created", "updated", "pushed", "full_name"]).optional().default("pushed").describe("The property to sort the results by."),
    direction: z.enum(["asc", "desc"]).optional().default("desc").describe("The order to sort by."),
    per_page: z.number().int().optional().default(30).describe("The number of results per page (max 100)."),
    page: z.number().int().optional().default(1).describe("Page number of the results to fetch.")
  },
  // Handler function
  async (params) => {
    try {
      console.error(`Attempting to list repositories with params: ${JSON.stringify(params)}`);
      // Ensure per_page doesn't exceed 100
      const perPage = Math.min(params.per_page || 30, 100);

      const response = await octokit.rest.repos.listForAuthenticatedUser({
        ...params,
        per_page: perPage,
      });

      const repoNames = response.data.map(repo => repo.full_name);
      console.error(`Successfully listed ${repoNames.length} repositories.`);
      
      let responseText = `Found ${repoNames.length} repositories:\n${repoNames.join('\n')}`;
      if (response.data.length === perPage) {
        responseText += `\n\nNote: More results might be available on the next page (page ${params.page + 1}).`;
      }

      return {
        content: [
          { type: "text", text: responseText }
        ]
      };
    } catch (error) {
      console.error(`Error listing repositories:`, error);
      const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
      return {
        content: [
          { type: "text", text: `Error listing repositories: ${errorMessage}` }
        ],
        isError: true
      };
    }
  }
);

// List Branches Tool
server.tool(
  "list_branches",
  // Zod schema for parameters
  {
    owner: z.string().describe("Required. The account owner of the repository."),
    repo: z.string().describe("Required. The name of the repository."),
    per_page: z.number().int().optional().default(30).describe("The number of results per page (max 100)."),
    page: z.number().int().optional().default(1).describe("Page number of the results to fetch.")
    // Add 'protected' boolean filter if needed
  },
  // Handler function
  async ({ owner, repo, per_page, page }) => {
    try {
      console.error(`Attempting to list branches for ${owner}/${repo} (page ${page})`);
      // Ensure per_page doesn't exceed 100
      const perPage = Math.min(per_page || 30, 100);

      const response = await octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: perPage,
        page,
      });

      const branchNames = response.data.map(branch => branch.name);
      console.error(`Successfully listed ${branchNames.length} branches for ${owner}/${repo}.`);

      let responseText = `Found ${branchNames.length} branches in ${owner}/${repo}:\n${branchNames.join('\n')}`;
      if (response.data.length === perPage) {
        responseText += `\n\nNote: More results might be available on the next page (page ${page + 1}).`;
      }

      return {
        content: [
          { type: "text", text: responseText }
        ]
      };
    } catch (error) {
      console.error(`Error listing branches for ${owner}/${repo}:`, error);
      const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
      return {
        content: [
          { type: "text", text: `Error listing branches for ${owner}/${repo}: ${errorMessage}` }
        ],
        isError: true
      };
    }
  }
);

// Example: Placeholder for create_repository
// server.tool(
//   "create_repository",
//   // Zod schema for parameters
//   { name: z.string().describe("The desired name for the new repository.") },
//   // Handler function
//   async (params) => {
//     // ... implementation using octokit ...
//     return { content: [{ type: "text", text: "Repository created (placeholder)." }] };
//   }
// );

// --- Server Connection ---
async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Use console.error for logging to avoid interfering with MCP stdout
    console.error("GitHub MCP Server connected via stdio.");
  } catch (error) {
    console.error("Failed to start GitHub MCP Server:", error);
    process.exit(1);
  }
}

runServer();

// --- Helper Functions (Optional) ---
// We can add helper functions here to interact with Octokit 