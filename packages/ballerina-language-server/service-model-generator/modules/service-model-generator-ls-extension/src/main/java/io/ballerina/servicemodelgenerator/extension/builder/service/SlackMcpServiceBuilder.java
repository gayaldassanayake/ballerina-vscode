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

/** Builds source for the Slack MCP server template. */
public class SlackMcpServiceBuilder extends AbstractServiceBuilder {
    private static final String MODULE = "slack.mcp";
    private static final String TEMPLATE_LOCATION = "services/slack_mcp.json";

    @Override
    public String kind() {
        return MODULE;
    }

    @Override
    public ServiceInitModel getServiceInitModel(GetServiceInitModelContext context) {
        InputStream stream = SlackMcpServiceBuilder.class.getClassLoader().getResourceAsStream(TEMPLATE_LOCATION);
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
        if (!Utils.importExists(modulePart, "ballerinax", MODULE)) {
            edits.add(new TextEdit(Utils.toRange(modulePart.lineRange().startLine()),
                    "import ballerinax/slack.mcp as slackmcp;\n"));
        }
        String source = "\nlistener slackmcp:SlackMcpListener slackMcpListener = new (\n"
                + "    {token: " + value(properties, "token") + "},\n"
                + "    {readOnly: " + value(properties, "readOnly") + ", allowedChannelIds: "
                + value(properties, "allowedChannelIds") + "},\n"
                + "    {port: " + value(properties, "mcpPort") + ", path: " + value(properties, "path") + "}\n"
                + ");\n";
        edits.add(new TextEdit(Utils.toRange(modulePart.lineRange().endLine()), source));
        Map<String, List<TextEdit>> changes = new LinkedHashMap<>();
        changes.put(context.filePath(), edits);
        addDependencies(context, changes);
        return changes;
    }

    private void addDependencies(AddServiceInitModelContext context, Map<String, List<TextEdit>> changes) {
        Path toml = context.project().sourceRoot().resolve("Ballerina.toml");
        try {
            String content = Files.readString(toml);
            String text = dependency(content, "ballerinax", "slack", "5.1.3")
                    + dependency(content, "ballerina", "mcp", "1.1.1");
            if (text.isEmpty()) {
                return;
            }
            if (!content.endsWith("\n")) {
                text = "\n" + text;
            }
            int line = (int) content.lines().count();
            changes.put(toml.toAbsolutePath().toString(), List.of(new TextEdit(
                    new Range(new Position(line, 0), new Position(line, 0)), text)));
        } catch (IOException e) {
            throw new IllegalStateException("Unable to update Ballerina.toml with Slack MCP dependencies.", e);
        }
    }

    private String dependency(String content, String org, String name, String version) {
        if (content.contains("org = \"" + org + "\"\nname = \"" + name + "\"")) {
            return "";
        }
        return "[[dependency]]\norg = \"" + org + "\"\nname = \"" + name + "\"\nversion = \""
                + version + "\"\nrepository = \"local\"\n\n";
    }

    private String value(Map<String, Value> properties, String key) {
        return properties.get(key).getValue();
    }
}
