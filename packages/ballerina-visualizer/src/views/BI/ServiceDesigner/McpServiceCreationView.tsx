import styled from "@emotion/styled";
import { useState } from "react";
import { Icon, View, ViewContent } from "@wso2/ui-toolkit";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import ButtonCard from "../../../components/ButtonCard";
import { FormHeader } from "../../../components/FormHeader";
import { TitleBar } from "../../../components/TitleBar";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { MCP_SERVER_TEMPLATES, McpServerTemplate } from "./McpServerCatalogue";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin: 20px;
    max-width: 760px;
`;

const CardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
`;

interface McpServiceCreationViewProps {
    projectPath: string;
}

export function McpServiceCreationView({ projectPath }: McpServiceCreationViewProps) {
    const { rpcClient } = useRpcContext();
    const [showExistingServers, setShowExistingServers] = useState(false);

    const openServiceForm = async (template: McpServerTemplate) => {
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIServiceWizard,
                artifactInfo: {
                    org: template.orgName,
                    packageName: template.packageName,
                    moduleName: template.moduleName,
                    version: template.version,
                },
            },
        });
    };

    const openScratchForm = async () => {
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIServiceWizard,
                artifactInfo: {
                    org: "ballerina",
                    packageName: "mcp",
                    moduleName: "mcp",
                    version: "1.0.0",
                },
            },
        });
    };

    return (
        <View>
            <TopNavigationBar projectPath={projectPath} />
            <TitleBar title="MCP Service" subtitle="Create MCP service" />
            <ViewContent>
                <Container>
                    <section>
                        <FormHeader title="Create MCP Service" />
                        <CardGrid>
                            <ButtonCard
                                id="mcp-from-scratch"
                                icon={<Icon name="bi-mcp" />}
                                title="Create from scratch"
                                description="Create an MCP service and define its tools yourself."
                                onClick={openScratchForm}
                            />
                            <ButtonCard
                                id="mcp-use-existing"
                                icon={<Icon name="bi-connector" />}
                                title="Use an existing MCP server"
                                description="Choose a library-provided MCP server and configure it."
                                onClick={() => setShowExistingServers(true)}
                            />
                        </CardGrid>
                    </section>
                    {showExistingServers && (
                        <section>
                            <FormHeader title="Existing MCP Servers" />
                            <CardGrid>
                                {MCP_SERVER_TEMPLATES.map((template) => (
                                    <ButtonCard
                                        key={template.id}
                                        id={`mcp-template-${template.id}`}
                                        icon={<Icon name="bi-mcp" />}
                                        title={template.title}
                                        description={template.description}
                                        onClick={() => openServiceForm(template)}
                                    />
                                ))}
                            </CardGrid>
                        </section>
                    )}
                </Container>
            </ViewContent>
        </View>
    );
}
