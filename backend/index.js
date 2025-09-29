require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { zodTextFormat } = require('openai/helpers/zod');
const z = require('zod');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
const PORT = process.env.PORT || 5050;

const Field = z.object({
    name: z.string(),
    type: z.enum(['id', 'string', 'first_name', 'last_name', 'name', 'email', 'text', 'number', 'date', 'boolean'])
});

const Entity = z.object({
    name: z.string(),
    fields: z.array(Field).max(10)
});

const Action = z.object({
    name: z.string(),
    entity: z.string(),
    type: z.enum(['form', 'table', 'none'])
});

const Role = z.object({
    name: z.string(),
    actions: z.array(Action).max(5)
});

const App = z.object({
    app_name: z.string(),
    entities: z.array(Entity).max(10),
    roles: z.array(Role).max(5),
});

function parseJSONOutput(text) {
    if (!text || typeof text !== 'string') return null;

    try {
        return JSON.parse(text);
    } catch (e) {
        const match = text.match(/(\{[\s\S]*\})/);
        if (!match) return null;
        const objText = match[1];
        try {
            return JSON.parse(objText);
        } catch (e) {
            return null;
        }
    }
}

app.post('/api/extract', async (req, res) => {
    try {
        const { description } = req.body;
        if (!description || typeof description !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid description' });
        }
        const shortDesc = description.slice(0, 2000);

        const instruction = `Given a short description of an app, output exactly one valid JSON object modelling the requirements of the app.
Each entity should reflect the data the app needs to store.
"id" should be used for any database table primary keys.
"first_name", "last_name", and "name" should be used for person names.
"text" should be used for long text that usually spans multiple lines.
Each role should have a list of actions they can perform that views or modifies other entities.
Each action should be a simple verb or verb-noun phrase like "Create Invoice" or "View Reports".
Each action should have a corresponding entity that it acts upon and an action type.
An action type is "form" if it adds an instance of an entity, "table" if it requires viewing instances of an entity, and "none" if it is more complex or does not directly relate to an entity like "Generate Report" or "Manage Users".
Any "none" type actions should appear at the end of the action list for a role.
The role and action lists can have at most 5 items while the entity and field lists can have at most 10 items.
Only include the most important items, keeping it as simple as required.
If a value is unknown, use reasonable defaults.
If the user input is unrelated to app requirements, do not return anything, or return an empty object.
The JSON object must follow this schema:

{
  "app_name": "App Name",
  "entities": [
    {
      "name": "Entity Name",
      "fields": [
        {"name": "field_name", "type": "id|string|first_name|last_name|name|email|text|number|date|boolean"}
      ]
    }
  ],
  "roles": [
    {
      "name": "Role Name",
      "actions": [
        {"name": "Action Name", "entity": "Entity Name", "type": "form|table|none"}
      ]
    }
  ]
}`;

        const response = await client.responses.create({
            model: process.env.OPENAI_MODEL,
            instructions: instruction,
            input: shortDesc,
            max_output_tokens: 5000,
            text: {
                format: zodTextFormat(App, "app"),
            }
        });

        let parsed = response.output_parsed ?? parseJSONOutput(response.output_text);
        if (!parsed) {
            console.error('Failed to parse JSON from AI response', response);
            return res.status(500).json({ error: 'Invalid AI response', raw_response: response });
        }

        try {
            return res.json(App.parse(parsed));
        } catch (err) {
            console.error('Schema validation error', err, parsed);
            return res.status(500).json({
                error: 'Invalid AI response',
                zodErrors: err.errors ?? err.message,
                parsed
            });
        }
    } catch (err) {
        console.error('Server error', err);
        return res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});