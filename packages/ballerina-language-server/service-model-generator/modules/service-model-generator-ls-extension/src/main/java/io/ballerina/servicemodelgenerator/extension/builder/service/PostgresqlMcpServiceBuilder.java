/*
 * Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 */

package io.ballerina.servicemodelgenerator.extension.builder.service;

import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetServiceInitModelContext;
import io.ballerina.servicemodelgenerator.extension.util.Utils;
import org.eclipse.lsp4j.Position;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the source for the PostgreSQL MCP server starter template.
 *
 * @since 1.13.0
 */
public class PostgresqlMcpServiceBuilder extends AbstractServiceBuilder {

    private static final String MODULE = "postgresql.mcp";
    private static final String TEMPLATE_LOCATION = "services/postgresql_mcp.json";
    private static final String HOST = "host";
    private static final String DATABASE_PORT = "databasePort";
    private static final String USERNAME = "username";
    private static final String PASSWORD = "password";
    private static final String DATABASE = "database";
    private static final String MCP_PORT = "mcpPort";
    private static final String PATH = "path";
    private static final String READ_ONLY = "readOnly";

    @Override
    public String kind() {
        return MODULE;
    }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        InputStream stream = PostgresqlMcpServiceBuilder.class.getClassLoader().getResourceAsStream(TEMPLATE_LOCATION);
        if (stream == null) {
            return null;
        }
        try (JsonReader reader = new JsonReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            return new Gson().fromJson(reader, ServiceInitModel.class);
        } catch (IOException e) {
            return null;
        }
    }

    @Override
    public Map<String, List<TextEdit>> addServiceInitSource(AddServiceInitModelContext context) {
        ModulePartNode modulePart = context.document().syntaxTree().rootNode();
        Map<String, Value> properties = context.serviceInitModel().getProperties();
        List<TextEdit> edits = new ArrayList<>();

        StringBuilder imports = new StringBuilder();
        appendImportIfMissing(imports, modulePart, "ballerinax", MODULE,
                "import ballerinax/postgresql.mcp as pgmcp;\n");
        appendImportIfMissing(imports, modulePart, "ballerinax", "postgresql.driver",
                "import ballerinax/postgresql.driver as _;\n");
        if (!imports.isEmpty()) {
            edits.add(new TextEdit(Utils.toRange(modulePart.lineRange().startLine()), imports.toString()));
        }

        String source = "\nlistener pgmcp:PostgresMcpListener postgresqlMcpListener = new (\n"
                + "    {\n"
                + "        host: " + value(properties, HOST) + ",\n"
                + "        port: " + value(properties, DATABASE_PORT) + ",\n"
                + "        username: " + value(properties, USERNAME) + ",\n"
                + "        password: " + value(properties, PASSWORD) + ",\n"
                + "        database: " + value(properties, DATABASE) + "\n"
                + "    },\n"
                + "    {readOnly: " + value(properties, READ_ONLY) + "},\n"
                + "    {port: " + value(properties, MCP_PORT) + ", path: " + value(properties, PATH) + "}\n"
                + ");\n";
        edits.add(new TextEdit(Utils.toRange(modulePart.lineRange().endLine()), source));

        Map<String, List<TextEdit>> changes = new LinkedHashMap<>();
        changes.put(context.filePath(), edits);
        addLocalDependencies(context, changes);
        return changes;
    }

    private void addLocalDependencies(AddServiceInitModelContext context, Map<String, List<TextEdit>> changes) {
        Path ballerinaToml = context.project().sourceRoot().resolve("Ballerina.toml");
        try {
            String content = Files.readString(ballerinaToml);
            StringBuilder dependencies = new StringBuilder();
            appendDependencyIfMissing(dependencies, content, "ballerinax", "postgresql", "1.19.0");
            appendDependencyIfMissing(dependencies, content, "ballerina", "mcp", "1.1.1");
            if (dependencies.isEmpty()) {
                return;
            }
            if (!content.endsWith("\n")) {
                dependencies.insert(0, '\n');
            }
            int lastLine = (int) content.lines().count();
            Range endOfFile = new Range(new Position(lastLine, 0), new Position(lastLine, 0));
            changes.put(ballerinaToml.toAbsolutePath().toString(), List.of(new TextEdit(endOfFile,
                    dependencies.toString())));
        } catch (IOException e) {
            throw new IllegalStateException("Unable to update Ballerina.toml with PostgreSQL MCP dependencies.", e);
        }
    }

    private void appendDependencyIfMissing(StringBuilder dependencies, String content, String org, String name,
                                           String version) {
        if (content.contains("org = \"" + org + "\"\nname = \"" + name + "\"")) {
            return;
        }
        dependencies.append("[[dependency]]\n")
                .append("org = \"").append(org).append("\"\n")
                .append("name = \"").append(name).append("\"\n")
                .append("version = \"").append(version).append("\"\n")
                .append("repository = \"local\"\n\n");
    }

    private void appendImportIfMissing(StringBuilder imports, ModulePartNode modulePart, String org, String module,
                                       String importStatement) {
        if (!Utils.importExists(modulePart, org, module)) {
            imports.append(importStatement);
        }
    }

    private String value(Map<String, Value> properties, String key) {
        return properties.get(key).getValue();
    }
}
