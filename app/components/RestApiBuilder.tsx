"use client";
import React, { useEffect, useMemo, useState } from "react";
import { getThemeStyles, getUIClasses } from "@/styles/colors";
import { CircleStackIcon, DocumentTextIcon, CloudArrowDownIcon, DocumentDuplicateIcon, CheckIcon, HomeIcon } from "@heroicons/react/24/outline";

type DbIndex = Record<string, true>;

const RestApiBuilder: React.FC = () => {
  const [darkMode] = useState(true);
  const themeStyles = getThemeStyles(darkMode);
  const { cardClasses, inputClasses, buttonClasses } = getUIClasses();

  const [mode, setMode] = useState<"general" | "custom">("general");
  const [dbIndex, setDbIndex] = useState<DbIndex>({});
  const [loading, setLoading] = useState(false);
  const [selectedDb, setSelectedDb] = useState<string>("");
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [markdown, setMarkdown] = useState<string>("");
  type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
  type PreviewBlock = { method: HttpMethod; title: string; path: string; body?: string; examples: { curl?: string; fetch?: string; axios?: string } };
  const [preview, setPreview] = useState<PreviewBlock[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {}
  };
  const [dbNames, setDbNames] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/mongodb-list", { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const json: DbIndex = await res.json();
        setDbIndex(json);
        setDbNames(Object.keys(json).sort());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadCollections = async () => {
      if (!selectedDb) { setCollections([]); return; }
      try {
        const res = await fetch(`/api/mongodb-collections?db=${encodeURIComponent(selectedDb)}`, { cache: "no-store", credentials: "include" });
        if (!res.ok) { setCollections([]); return; }
        const json: { collections: string[] } = await res.json();
        setCollections(Array.isArray(json.collections) ? json.collections : []);
      } catch {
        setCollections([]);
      }
    };
    loadCollections();
  }, [selectedDb]);

  const buildGeneralDoc = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return [
      `# REST API Documentation`,
      ``,
      `Base URL: ${baseUrl}`,
      ``,
      `> All endpoints require Authorization header:`,
      ``,
      `\`\`\`http`,
      `Authorization: Bearer YOUR_AUTH_TOKEN`,
      `\`\`\``,
      ``,
      `## Endpoints`,
      ``,
      `### GET /api/:db/:collection`,
      `Retrieve documents from a collection.`,
      ``,
      `\`\`\`http`,
      `GET /api/<db>/<collection>`,
      `Authorization: Bearer YOUR_AUTH_TOKEN`,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X GET "${baseUrl}/api/<db>/<collection>" -H "Authorization: Bearer YOUR_AUTH_TOKEN"`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/<db>/<collection>", { headers: { Authorization: 'Bearer YOUR_AUTH_TOKEN' } }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.get("${baseUrl}/api/<db>/<collection>", { headers: { Authorization: 'Bearer YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
      ``,
      `### POST /api/find`,
      `Query documents using filters.`,
      ``,
      `\`\`\`json`,
      `{ "db": "<db>", "collection": "<collection>", "query": { "field": "value" }, "options": { "limit": 10 } }`,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X POST "${baseUrl}/api/find" -H "Authorization: Bearer YOUR_AUTH_TOKEN" -H "Content-Type: application/json" -d '{"db":"<db>","collection":"<collection>","query":{"field":"value"}}'`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/find", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer YOUR_AUTH_TOKEN' }, body: JSON.stringify({ db:'<db>', collection:'<collection>', query:{ field:'value' } }) }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.post("${baseUrl}/api/find", { db:'<db>', collection:'<collection>', query:{ field:'value' } }, { headers:{ Authorization:'Bearer YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
      ``,
      `### POST /api/findOne`,
      `Find a single document.`,
      ``,
      `\`\`\`json`,
      `{ "db": "<db>", "collection": "<collection>", "query": { "_id": "..." } }`,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X POST "${baseUrl}/api/findOne" -H "Authorization: Bearer YOUR_AUTH_TOKEN" -H "Content-Type: application/json" -d '{"db":"<db>","collection":"<collection>","query":{"_id":"<id>"}}'`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/findOne", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer YOUR_AUTH_TOKEN' }, body: JSON.stringify({ db:'<db>', collection:'<collection>', query:{ _id:'<id>' } }) }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.post("${baseUrl}/api/findOne", { db:'<db>', collection:'<collection>', query:{ _id:'<id>' } }, { headers:{ Authorization:'Bearer YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
      ``,
      `### POST /api/insertOne`,
      `Insert a document.`,
      ``,
      `\`\`\`json`,
      `{ "db": "<db>", "collection": "<collection>", "document": { "key": "value" } }`,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X POST "${baseUrl}/api/insertOne" -H "Authorization: Bearer YOUR_AUTH_TOKEN" -H "Content-Type: application/json" -d '{"db":"<db>","collection":"<collection>","document":{"key":"value"}}'`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/insertOne", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer YOUR_AUTH_TOKEN' }, body: JSON.stringify({ db:'<db>', collection:'<collection>', document:{ key:'value' } }) }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.post("${baseUrl}/api/insertOne", { db:'<db>', collection:'<collection>', document:{ key:'value' } }, { headers:{ Authorization:'Bearer YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
      ``,
      `### PUT /api/updateOne`,
      `Update a document.`,
      ``,
      `\`\`\`json`,
      `{ "db": "<db>", "collection": "<collection>", "filter": { "_id": "..." }, "update": { "$set": { "key": "value" } } }`,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X PUT "${baseUrl}/api/updateOne" -H "Authorization: Bearer YOUR_AUTH_TOKEN" -H "Content-Type: application/json" -d '{"db":"<db>","collection":"<collection>","filter":{"_id":"<id>"},"update":{"$set":{"key":"value"}}}'`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/updateOne", { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: 'Bearer YOUR_AUTH_TOKEN' }, body: JSON.stringify({ db:'<db>', collection:'<collection>', filter:{ _id:'<id>' }, update:{ $set:{ key:'value' } } }) }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.put("${baseUrl}/api/updateOne", { db:'<db>', collection:'<collection>', filter:{ _id:'<id>' }, update:{ $set:{ key:'value' } } }, { headers:{ Authorization:'Bearer YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
      ``,
      `### DELETE /api/deleteOne`,
      `Delete a document.`,
      ``,
      `\`\`\`json`,
      `{ "db": "<db>", "collection": "<collection>", "filter": { "_id": "..." } }`,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X DELETE "${baseUrl}/api/deleteOne" -H "Authorization: Bearer YOUR_AUTH_TOKEN" -H "Content-Type: application/json" -d '{"db":"<db>","collection":"<collection>","filter":{"_id":"<id>"}}'`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/deleteOne", { method: 'DELETE', headers: { 'Content-Type':'application/json', Authorization: 'Bearer YOUR_AUTH_TOKEN' }, body: JSON.stringify({ db:'<db>', collection:'<collection>', filter:{ _id:'<id>' } }) }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.delete("${baseUrl}/api/deleteOne", { data:{ db:'<db>', collection:'<collection>', filter:{ _id:'<id>' } }, headers:{ Authorization:'Bearer YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
    ].join("\n");
  };

  const buildCustomDoc = (db: string, col: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const auth = `Authorization: Bearer YOUR_AUTH_TOKEN`;
    return [
      `# REST API for ${db}.${col}`,
      ``,
      `Base URL: ${baseUrl}`,
      ``,
      `## Authentication`,
      `\`\`\`http`,
      auth,
      `\`\`\``,
      ``,
      `## CRUD`,
      ``,
      `### Read (GET)`,
      `\`\`\`http`,
      `GET ${baseUrl}/api/${db}/${col}`,
      auth,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X GET "${baseUrl}/api/${db}/${col}" -H "Authorization: Bearer YOUR_AUTH_TOKEN"`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/${db}/${col}", { headers: { Authorization: 'Bearer YOUR_AUTH_TOKEN' } }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.get("${baseUrl}/api/${db}/${col}", { headers:{ Authorization:'Bearer YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
      ``,
      `### Query (POST /api/find)`,
      `\`\`\`json`,
      `{ "db": "${db}", "collection": "${col}", "query": { "field": "value" }, "options": { "limit": 10 } }`,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X POST "${baseUrl}/api/find" -H "Authorization: Bearer YOUR_AUTH_TOKEN" -H "Content-Type: application/json" -d '{"db":"${db}","collection":"${col}","query":{"field":"value"}}'`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/find", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer YOUR_AUTH_TOKEN' }, body: JSON.stringify({ db:'${db}', collection:'${col}', query:{ field:'value' } }) }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.post("${baseUrl}/api/find", { db:'${db}', collection:'${col}', query:{ field:'value' } }, { headers:{ Authorization:'Bearer YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
      ``,
      `### Find One (POST /api/findOne)`,
      `\`\`\`json`,
      `{ "db": "${db}", "collection": "${col}", "query": { "_id": "<id>" } }`,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X POST "${baseUrl}/api/findOne" -H "Authorization: Bearer YOUR_AUTH_TOKEN" -H "Content-Type: application/json" -d '{"db":"${db}","collection":"${col}","query":{"_id":"<id>"}}'`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/findOne", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer YOUR_AUTH_TOKEN' }, body: JSON.stringify({ db:'${db}', collection:'${col}', query:{ _id:'<id>' } }) }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.post("${baseUrl}/api/findOne", { db:'${db}', collection:'${col}', query:{ _id:'<id>' } }, { headers:{ Authorization:'Bearer YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
      ``,
      `### Insert (POST /api/insertOne)`,
      `\`\`\`json`,
      `{ "db": "${db}", "collection": "${col}", "document": { "key": "value" } }`,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X POST "${baseUrl}/api/insertOne" -H "Authorization: Bearer YOUR_AUTH_TOKEN" -H "Content-Type: application/json" -d '{"db":"${db}","collection":"${col}","document":{"key":"value"}}'`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/insertOne", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer YOUR_AUTH_TOKEN' }, body: JSON.stringify({ db:'${db}', collection:'${col}', document:{ key:'value' } }) }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.post("${baseUrl}/api/insertOne", { db:'${db}', collection:'${col}', document:{ key:'value' } }, { headers:{ Authorization:'Bearer YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
      ``,
      `### Update (PUT /api/updateOne)`,
      `\`\`\`json`,
      `{ "db": "${db}", "collection": "${col}", "filter": { "_id": "<id>" }, "update": { "$set": { "key": "value" } } }`,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X PUT "${baseUrl}/api/updateOne" -H "Authorization: Bearer YOUR_AUTH_TOKEN" -H "Content-Type: application/json" -d '{"db":"${db}","collection":"${col}","filter":{"_id":"<id>"},"update":{"$set":{"key":"value"}}}'`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/updateOne", { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: 'Bearer YOUR_AUTH_TOKEN' }, body: JSON.stringify({ db:'${db}', collection:'${col}', filter:{ _id:'<id>' }, update:{ $set:{ key:'value' } } }) }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.put("${baseUrl}/api/updateOne", { db:'${db}', collection:'${col}', filter:{ _id:'<id>' }, update:{ $set:{ key:'value' } } }, { headers:{ Authorization:'Bearer YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
      ``,
      `### Delete (DELETE /api/deleteOne)`,
      `\`\`\`json`,
      `{ "db": "${db}", "collection": "${col}", "filter": { "_id": "<id>" } }`,
      `\`\`\``,
      ``,
      `**Examples**`,
      ``,
      `\`\`\`bash`,
      `curl -X DELETE "${baseUrl}/api/deleteOne" -H "Authorization: Bearer YOUR_AUTH_TOKEN" -H "Content-Type: application/json" -d '{"db":"${db}","collection":"${col}","filter":{"_id":"<id>"}}'`,
      `\`\`\``,
      `\`\`\`javascript`,
      `fetch("${baseUrl}/api/deleteOne", { method: 'DELETE', headers: { 'Content-Type':'application/json', Authorization: 'Bearer YOUR_AUTH_TOKEN' }, body: JSON.stringify({ db:'${db}', collection:'${col}', filter:{ _id:'<id>' } }) }).then(r=>r.json()).then(console.log)`,
      `\`\`\``,
      `\`\`\`javascript`,
      `import axios from 'axios'`,
      `axios.delete("${baseUrl}/api/deleteOne", { data:{ db:'${db}', collection:'${col}', filter:{ _id:'<id>' } }, headers:{ Authorization:'YOUR_AUTH_TOKEN' } }).then(r=>console.log(r.data))`,
      `\`\`\``,
    ].join("\n");
  };

  const buildGeneralPreview = (): PreviewBlock[] => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const auth = "Authorization: Bearer YOUR_AUTH_TOKEN";
    const target = { db: "<db>", collection: "<collection>" };
    const blocks: PreviewBlock[] = [
      {
        method: "GET",
        title: "Read",
        path: `${baseUrl}/api/<db>/<collection>`,
        examples: {
          curl: `curl -X GET \"${baseUrl}/api/<db>/<collection>\" -H \"${auth}\"`,
          fetch: `fetch(\"${baseUrl}/api/<db>/<collection>\", { headers: { Authorization: '${auth.replace("Authorization: ", "")}' } }).then(r=>r.json()).then(console.log)`,
          axios: `import axios from 'axios'\naxios.get(\"${baseUrl}/api/<db>/<collection>\", { headers:{ Authorization:'${auth.replace("Authorization: ", "")}' } }).then(r=>console.log(r.data))`
        }
      },
      {
        method: "POST",
        title: "Query",
        path: `${baseUrl}/api/find`,
        body: JSON.stringify({ ...target, query: { field: "value" }, options: { limit: 10 } }, null, 2),
        examples: {
          curl: `curl -X POST \"${baseUrl}/api/find\" -H \"${auth}\" -H \"Content-Type: application/json\" -d '${JSON.stringify({ ...target, query: { field: "value" } })}'`,
          fetch: `fetch(\"${baseUrl}/api/find\", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: '${auth.replace("Authorization: ", "")}' }, body: JSON.stringify(${JSON.stringify({ ...target, query: { field: "value" } })}) }).then(r=>r.json()).then(console.log)`,
          axios: `import axios from 'axios'\naxios.post(\"${baseUrl}/api/find\", ${JSON.stringify({ ...target, query: { field: "value" } }, null, 2)}, { headers:{ Authorization:'${auth.replace("Authorization: ", "")}' }})`
        }
      },
      {
        method: "POST",
        title: "Find One",
        path: `${baseUrl}/api/findOne`,
        body: JSON.stringify({ ...target, query: { _id: "<id>" } }, null, 2),
        examples: {
          curl: `curl -X POST \"${baseUrl}/api/findOne\" -H \"${auth}\" -H \"Content-Type: application/json\" -d '${JSON.stringify({ ...target, query: { _id: "<id>" } })}'`,
          fetch: `fetch(\"${baseUrl}/api/findOne\", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: '${auth.replace("Authorization: ", "")}' }, body: JSON.stringify(${JSON.stringify({ ...target, query: { _id: "<id>" } })}) }).then(r=>r.json()).then(console.log)`,
          axios: `import axios from 'axios'\naxios.post(\"${baseUrl}/api/findOne\", ${JSON.stringify({ ...target, query: { _id: "<id>" } }, null, 2)}, { headers:{ Authorization:'${auth.replace("Authorization: ", "")}' }})`
        }
      },
      {
        method: "POST",
        title: "Insert",
        path: `${baseUrl}/api/insertOne`,
        body: JSON.stringify({ ...target, document: { key: "value" } }, null, 2),
        examples: {
          curl: `curl -X POST \"${baseUrl}/api/insertOne\" -H \"${auth}\" -H \"Content-Type: application/json\" -d '${JSON.stringify({ ...target, document: { key: "value" } })}'`,
          fetch: `fetch(\"${baseUrl}/api/insertOne\", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: '${auth.replace("Authorization: ", "")}' }, body: JSON.stringify(${JSON.stringify({ ...target, document: { key: "value" } })}) }).then(r=>r.json()).then(console.log)`,
          axios: `import axios from 'axios'\naxios.post(\"${baseUrl}/api/insertOne\", ${JSON.stringify({ ...target, document: { key: "value" } }, null, 2)}, { headers:{ Authorization:'${auth.replace("Authorization: ", "")}' }})`
        }
      },
      {
        method: "PUT",
        title: "Update",
        path: `${baseUrl}/api/updateOne`,
        body: JSON.stringify({ ...target, filter: { _id: "<id>" }, update: { $set: { key: "value" } } }, null, 2),
        examples: {
          curl: `curl -X PUT \"${baseUrl}/api/updateOne\" -H \"${auth}\" -H \"Content-Type: application/json\" -d '${JSON.stringify({ ...target, filter: { _id: "<id>" }, update: { $set: { key: "value" } } })}'`,
          fetch: `fetch(\"${baseUrl}/api/updateOne\", { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: '${auth.replace("Authorization: ", "")}' }, body: JSON.stringify(${JSON.stringify({ ...target, filter: { _id: "<id>" }, update: { $set: { key: "value" } } })}) }).then(r=>r.json()).then(console.log)`,
          axios: `import axios from 'axios'\naxios.put(\"${baseUrl}/api/updateOne\", ${JSON.stringify({ ...target, filter: { _id: "<id>" }, update: { $set: { key: "value" } } }, null, 2)}, { headers:{ Authorization:'${auth.replace("Authorization: ", "")}' }})`
        }
      },
      {
        method: "DELETE",
        title: "Delete",
        path: `${baseUrl}/api/deleteOne`,
        body: JSON.stringify({ ...target, filter: { _id: "<id>" } }, null, 2),
        examples: {
          curl: `curl -X DELETE \"${baseUrl}/api/deleteOne\" -H \"${auth}\" -H \"Content-Type: application/json\" -d '${JSON.stringify({ ...target, filter: { _id: "<id>" } })}'`,
          fetch: `fetch(\"${baseUrl}/api/deleteOne\", { method: 'DELETE', headers: { 'Content-Type':'application/json', Authorization: '${auth.replace("Authorization: ", "")}' }, body: JSON.stringify(${JSON.stringify({ ...target, filter: { _id: "<id>" } })}) }).then(r=>r.json()).then(console.log)`,
          axios: `import axios from 'axios'\naxios.delete(\"${baseUrl}/api/deleteOne\", { data: ${JSON.stringify({ ...target, filter: { _id: "<id>" } }, null, 2)}, headers:{ Authorization:'${auth.replace("Authorization: ", "")}' }})`
        }
      }
    ];
    return blocks;
  };

  const buildCustomPreview = (db: string, col: string): PreviewBlock[] => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const auth = "Authorization: Bearer YOUR_AUTH_TOKEN";
    const target = { db, collection: col };
    const blocks: PreviewBlock[] = [
      { method: "GET", title: "Read", path: `${baseUrl}/api/${db}/${col}`, examples: { curl: `curl -X GET \"${baseUrl}/api/${db}/${col}\" -H \"${auth}\"`, fetch: `fetch(\"${baseUrl}/api/${db}/${col}\", { headers:{ Authorization:'${auth.replace("Authorization: ", "")}' } }).then(r=>r.json()).then(console.log)`, axios: `import axios from 'axios'\naxios.get(\"${baseUrl}/api/${db}/${col}\", { headers:{ Authorization:'${auth.replace("Authorization: ", "")}' } }).then(r=>console.log(r.data))` } },
      { method: "POST", title: "Query", path: `${baseUrl}/api/find`, body: JSON.stringify({ ...target, query: { field: "value" }, options: { limit: 10 } }, null, 2), examples: { curl: `curl -X POST \"${baseUrl}/api/find\" -H \"${auth}\" -H \"Content-Type: application/json\" -d '${JSON.stringify({ ...target, query: { field: "value" } })}'`, fetch: `fetch(\"${baseUrl}/api/find\", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: '${auth.replace("Authorization: ", "")}' }, body: JSON.stringify(${JSON.stringify({ ...target, query: { field: "value" } })}) }).then(r=>r.json()).then(console.log)`, axios: `import axios from 'axios'\naxios.post(\"${baseUrl}/api/find\", ${JSON.stringify({ ...target, query: { field: "value" } }, null, 2)}, { headers:{ Authorization:'${auth.replace("Authorization: ", "")}' }})` } },
      { method: "POST", title: "Find One", path: `${baseUrl}/api/findOne`, body: JSON.stringify({ ...target, query: { _id: "<id>" } }, null, 2), examples: { curl: `curl -X POST \"${baseUrl}/api/findOne\" -H \"${auth}\" -H \"Content-Type: application/json\" -d '${JSON.stringify({ ...target, query: { _id: "<id>" } })}'`, fetch: `fetch(\"${baseUrl}/api/findOne\", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: '${auth.replace("Authorization: ", "")}' }, body: JSON.stringify(${JSON.stringify({ ...target, query: { _id: "<id>" } })}) }).then(r=>r.json()).then(console.log)`, axios: `import axios from 'axios'\naxios.post(\"${baseUrl}/api/findOne\", ${JSON.stringify({ ...target, query: { _id: "<id>" } }, null, 2)}, { headers:{ Authorization:'${auth.replace("Authorization: ", "")}' }})` } },
      { method: "POST", title: "Insert", path: `${baseUrl}/api/insertOne`, body: JSON.stringify({ ...target, document: { key: "value" } }, null, 2), examples: { curl: `curl -X POST \"${baseUrl}/api/insertOne\" -H \"${auth}\" -H \"Content-Type: application/json\" -d '${JSON.stringify({ ...target, document: { key: "value" } })}'`, fetch: `fetch(\"${baseUrl}/api/insertOne\", { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: '${auth.replace("Authorization: ", "")}' }, body: JSON.stringify(${JSON.stringify({ ...target, document: { key: "value" } })}) }).then(r=>r.json()).then(console.log)`, axios: `import axios from 'axios'\naxios.post(\"${baseUrl}/api/insertOne\", ${JSON.stringify({ ...target, document: { key: "value" } }, null, 2)}, { headers:{ Authorization:'${auth.replace("Authorization: ", "")}' }})` } },
      { method: "PUT", title: "Update", path: `${baseUrl}/api/updateOne`, body: JSON.stringify({ ...target, filter: { _id: "<id>" }, update: { $set: { key: "value" } } }, null, 2), examples: { curl: `curl -X PUT \"${baseUrl}/api/updateOne\" -H \"${auth}\" -H \"Content-Type: application/json\" -d '${JSON.stringify({ ...target, filter: { _id: "<id>" }, update: { $set: { key: "value" } } })}'`, fetch: `fetch(\"${baseUrl}/api/updateOne\", { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: '${auth.replace("Authorization: ", "")}' }, body: JSON.stringify(${JSON.stringify({ ...target, filter: { _id: "<id>" }, update: { $set: { key: "value" } } })}) }).then(r=>r.json()).then(console.log)`, axios: `import axios from 'axios'\naxios.put(\"${baseUrl}/api/updateOne\", ${JSON.stringify({ ...target, filter: { _id: "<id>" }, update: { $set: { key: "value" } } }, null, 2)}, { headers:{ Authorization:'${auth.replace("Authorization: ", "")}' }})` } },
      { method: "DELETE", title: "Delete", path: `${baseUrl}/api/deleteOne`, body: JSON.stringify({ ...target, filter: { _id: "<id>" } }, null, 2), examples: { curl: `curl -X DELETE \"${baseUrl}/api/deleteOne\" -H \"${auth}\" -H \"Content-Type: application/json\" -d '${JSON.stringify({ ...target, filter: { _id: "<id>" } })}'`, fetch: `fetch(\"${baseUrl}/api/deleteOne\", { method: 'DELETE', headers: { 'Content-Type':'application/json', Authorization: '${auth.replace("Authorization: ", "")}' }, body: JSON.stringify(${JSON.stringify({ ...target, filter: { _id: "<id>" } })}) }).then(r=>r.json()).then(console.log)`, axios: `import axios from 'axios'\naxios.delete(\"${baseUrl}/api/deleteOne\", { data: ${JSON.stringify({ ...target, filter: { _id: "<id>" } }, null, 2)}, headers:{ Authorization:'${auth.replace("Authorization: ", "")}' }})` } }
    ];
    return blocks;
  };

  const generate = () => {
    if (mode === "general") {
      setMarkdown(buildGeneralDoc());
      setPreview(buildGeneralPreview());
    } else if (selectedDb && selectedCollection) {
      setMarkdown(buildCustomDoc(selectedDb, selectedCollection));
      setPreview(buildCustomPreview(selectedDb, selectedCollection));
    }
  };

  const download = () => {
    const name = mode === "general" ? "REST_API_Documentation.md" : `REST_API_${selectedDb}_${selectedCollection}.md`;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6" style={themeStyles}>
      <div className={`mb-6 p-4 rounded-lg border flex items-center justify-between ${cardClasses}`}>
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="w-6 h-6 text-[var(--text)]" />
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">REST API</h2>
            <p className="text-xs text-[var(--text-muted)]">Generate general or customized API documentation for your MongoDB collections</p>
          </div>
        </div>
        <button
          onClick={() => { window.location.href = "/"; }}
          className={`px-3 py-2 rounded-md text-sm font-medium ${buttonClasses.secondary}`}
          aria-label="Back to Home"
        >
          <span className="flex items-center gap-2">
            <HomeIcon className="w-4 h-4 text-[var(--text)]" />
            <span>Home</span>
          </span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${cardClasses}`}>
          <p className="text-sm font-medium text-[var(--text)] mb-3">Mode</p>
          <div className="flex gap-2">
            <button onClick={() => setMode("general")} className={`px-3 py-2 rounded-md text-sm ${mode === "general" ? buttonClasses.primary : buttonClasses.secondary}`}>General</button>
            <button onClick={() => setMode("custom")} className={`px-3 py-2 rounded-md text-sm ${mode === "custom" ? buttonClasses.primary : buttonClasses.secondary}`}>Custom</button>
          </div>

          {mode === "custom" && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs mb-1 text-[var(--text)]">Database</label>
                <select value={selectedDb} onChange={(e)=>{ setSelectedDb(e.target.value); setSelectedCollection(""); }} className={`w-full px-3 py-2 rounded-md ${inputClasses}`} disabled={loading}>
                  <option value="">Select database</option>
                  {dbNames.map(db => (
                    <option key={db} value={db}>{db}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-[var(--text)]">Collection</label>
                <select value={selectedCollection} onChange={(e)=>setSelectedCollection(e.target.value)} className={`w-full px-3 py-2 rounded-md ${inputClasses}`} disabled={!selectedDb || loading}>
                  <option value="">Select collection</option>
                  {(Array.isArray(collections) ? collections : []).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button onClick={generate} className={`px-4 py-2 rounded-md ${buttonClasses.primary}`}>Generate</button>
            <button onClick={download} disabled={!markdown} className={`px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}>
              <span className="flex items-center gap-2">
                <CloudArrowDownIcon className="w-4 h-4" />
                <span>Download .md</span>
              </span>
            </button>
          </div>
        </div>

        <div className={`md:col-span-2 p-6 rounded-2xl ring-1 ring-slate-700 bg-slate-900/60 shadow-xl`}>
          <p className="text-sm font-semibold text-slate-200 mb-4">Preview</p>
          <div className="rounded-2xl bg-slate-900/70 ring-1 ring-slate-700 p-6 min-h-[240px] space-y-6 shadow-lg">
            {preview.length > 0 ? (
              preview.map((b, idx) => (
                <div key={idx} className="rounded-xl bg-slate-900 ring-1 ring-slate-700 p-4 overflow-hidden shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded border ${b.method==='GET' ? 'bg-emerald-600 border-emerald-700 text-white' : b.method==='POST' ? 'bg-blue-600 border-blue-700 text-white' : b.method==='PUT' ? 'bg-yellow-500 border-yellow-600 text-black' : 'bg-red-600 border-red-700 text-white'}`}>{b.method}</span>
                      <span className="text-sm font-semibold text-slate-200">{b.title}</span>
                    </div>
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <code className={`text-xs px-2 py-1 rounded inline-block max-w-full break-all font-mono ${b.method==='DELETE' ? 'bg-red-900/40 text-red-200 ring-1 ring-red-700' : 'bg-slate-800 text-slate-100 ring-1 ring-slate-700'}`}>{b.path}</code>
                    <button onClick={() => copyToClipboard(b.path, `path-${idx}`)} className="p-1 rounded bg-slate-700 hover:bg-slate-600 ring-1 ring-slate-600" aria-label="Copy path">
                      {copiedKey === `path-${idx}` ? (
                        <CheckIcon className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <DocumentDuplicateIcon className="w-3 h-3 text-slate-200" />
                      )}
                    </button>
                  </div>
                  {b.body && (
                    <div className="mb-2 relative">
                      <p className="text-xs text-slate-400 mb-1">Body</p>
                      <pre className="text-xs p-3 rounded-lg bg-slate-950 text-slate-100 ring-1 ring-slate-800 whitespace-pre-wrap break-words overflow-x-auto font-mono">{b.body}</pre>
                      <button onClick={() => copyToClipboard(b.body || '', `body-${idx}`)} className="absolute right-2 top-6 p-1 rounded bg-slate-700 hover:bg-slate-600 ring-1 ring-slate-600" aria-label="Copy body">
                        {copiedKey === `body-${idx}` ? (
                          <CheckIcon className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <DocumentDuplicateIcon className="w-3 h-3 text-slate-200" />
                        )}
                      </button>
                    </div>
                  )}
                  <div className="grid sm:grid-cols-3 gap-3 min-w-0">
                    {b.examples.curl && (
                      <div className="rounded-lg p-3 min-w-0 overflow-hidden bg-slate-950 ring-1 ring-slate-800 shadow-sm relative">
                        <p className="text-xs font-semibold text-slate-300 mb-1">curl</p>
                        <pre className="text-xs whitespace-pre-wrap break-words overflow-x-auto text-slate-100 font-mono">{b.examples.curl}</pre>
                        <button onClick={() => copyToClipboard(b.examples.curl || '', `curl-${idx}`)} className="absolute right-2 bottom-2 p-1 rounded bg-slate-700 hover:bg-slate-600 ring-1 ring-slate-600" aria-label="Copy curl">
                          {copiedKey === `curl-${idx}` ? (
                            <CheckIcon className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <DocumentDuplicateIcon className="w-3 h-3 text-slate-200" />
                          )}
                        </button>
                      </div>
                    )}
                    {b.examples.fetch && (
                      <div className="rounded-lg p-3 min-w-0 overflow-hidden bg-slate-950 ring-1 ring-slate-800 shadow-sm relative">
                        <p className="text-xs font-semibold text-slate-300 mb-1">fetch</p>
                        <pre className="text-xs whitespace-pre-wrap break-words overflow-x-auto text-slate-100 font-mono">{b.examples.fetch}</pre>
                        <button onClick={() => copyToClipboard(b.examples.fetch || '', `fetch-${idx}`)} className="absolute right-2 bottom-2 p-1 rounded bg-slate-700 hover:bg-slate-600 ring-1 ring-slate-600" aria-label="Copy fetch">
                          {copiedKey === `fetch-${idx}` ? (
                            <CheckIcon className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <DocumentDuplicateIcon className="w-3 h-3 text-slate-200" />
                          )}
                        </button>
                      </div>
                    )}
                    {b.examples.axios && (
                      <div className="rounded-lg p-3 min-w-0 overflow-hidden bg-slate-950 ring-1 ring-slate-800 shadow-sm relative">
                        <p className="text-xs font-semibold text-slate-300 mb-1">axios</p>
                        <pre className="text-xs whitespace-pre-wrap break-words overflow-x-auto text-slate-100 font-mono">{b.examples.axios}</pre>
                        <button onClick={() => copyToClipboard(b.examples.axios || '', `axios-${idx}`)} className="absolute right-2 bottom-2 p-1 rounded bg-slate-700 hover:bg-slate-600 ring-1 ring-slate-600" aria-label="Copy axios">
                          {copiedKey === `axios-${idx}` ? (
                            <CheckIcon className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <DocumentDuplicateIcon className="w-3 h-3 text-slate-200" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400">No content generated yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestApiBuilder;