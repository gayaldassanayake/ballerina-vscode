export interface McpServerTemplate {
    id: string;
    title: string;
    description: string;
    orgName: string;
    packageName: string;
    moduleName: string;
    version: string;
}

// Add each supported, library-provided MCP server here. The picker and the
// creation form use the package metadata, so no picker changes are needed for
// subsequent entries.
export const MCP_SERVER_TEMPLATES: McpServerTemplate[] = [
    {
        id: "postgresql",
        title: "PostgreSQL",
        description: "Create an MCP server that safely exposes PostgreSQL database tools.",
        orgName: "ballerinax",
        packageName: "postgresql",
        moduleName: "postgresql.mcp",
        version: "1.19.0",
    },
    {
        id: "slack",
        title: "Slack",
        description: "Create an MCP server that safely exposes curated Slack workspace tools.",
        orgName: "ballerinax",
        packageName: "slack",
        moduleName: "slack.mcp",
        version: "5.1.3",
    },
];
