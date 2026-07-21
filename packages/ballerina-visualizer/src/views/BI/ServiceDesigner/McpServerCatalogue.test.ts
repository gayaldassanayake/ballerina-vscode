import { MCP_SERVER_TEMPLATES } from "./McpServerCatalogue";

describe("MCP server catalogue", () => {
    it("lists PostgreSQL as a selectable existing MCP server", () => {
        expect(MCP_SERVER_TEMPLATES).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: "postgresql",
                title: "PostgreSQL",
                orgName: "ballerinax",
                packageName: "postgresql",
                moduleName: "postgresql.mcp",
            }),
            expect.objectContaining({
                id: "slack",
                title: "Slack",
                orgName: "ballerinax",
                packageName: "slack",
                moduleName: "slack.mcp",
            }),
        ]));
    });
});
