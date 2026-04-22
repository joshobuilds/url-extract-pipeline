'use client';

import { useMemo, useState } from 'react';

type ExtractionResult = {
  mode: 'single' | 'list';
  data: Record<string, unknown>;
  items: Record<string, unknown>[];
  confidence: number;
  missing_fields: string[];
  warnings: string[];
  model_used: string;
};

type SchemaShape = {
  name: string;
  description?: string;
  mode?: 'single' | 'list';
  fields: { name: string }[];
};

type PresetMeta = {
  value: string;
  label: string;
  hint: string;
  default_url: string;
  mode: 'single' | 'list';
};

const PRESET_OPTIONS: PresetMeta[] = [
  {
    value: 'books_toscrape',
    label: 'Book listing (books.toscrape.com)',
    hint: 'Title, price, rating, stock, detail URL — demo site built for scraping.',
    default_url: 'https://books.toscrape.com/catalogue/page-1.html',
    mode: 'list',
  },
  {
    value: 'quotes_toscrape',
    label: 'Quotes (quotes.toscrape.com)',
    hint: 'Text, author, tags — demo site built for scraping.',
    default_url: 'https://quotes.toscrape.com/',
    mode: 'list',
  },
  {
    value: 'hn_frontpage',
    label: 'Hacker News front page',
    hint: 'Rank, title, URL, points, comments, author.',
    default_url: 'https://news.ycombinator.com/',
    mode: 'list',
  },
  {
    value: 'product_listing',
    label: 'Generic product listing',
    hint: 'Any e-commerce grid — name, price, rating, URL, image.',
    default_url: '',
    mode: 'list',
  },
  {
    value: 'article',
    label: 'Article / blog post',
    hint: 'Single-page summary — title, author, date, summary, topics.',
    default_url: '',
    mode: 'single',
  },
  {
    value: 'custom',
    label: 'Custom YAML schema',
    hint: 'Paste your own schema to target any page shape.',
    default_url: '',
    mode: 'list',
  },
];

const EXAMPLE_CUSTOM_YAML = `name: "My listing"
description: "What this schema covers."
mode: list   # "list" for repeating items, "single" for a one-record page
instructions: |
  - Any extraction rules you want the scraper to follow.

fields:
  - name: title
    type: string
    required: true
  - name: price
    type: number
  - name: url
    type: string
    description: "Absolute URL."
  - name: rating
    type: number
    description: "0 to 5 scale if shown."
`;

export default function HomePage() {
  const [url, setUrl] = useState(PRESET_OPTIONS[0].default_url);
  const [preset, setPreset] = useState<string>('books_toscrape');
  const [customYaml, setCustomYaml] = useState(EXAMPLE_CUSTOM_YAML);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [schema, setSchema] = useState<SchemaShape | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => PRESET_OPTIONS.find((p) => p.value === preset),
    [preset],
  );

  const onPickPreset = (value: string) => {
    setPreset(value);
    const p = PRESET_OPTIONS.find((x) => x.value === value);
    if (p && p.default_url) setUrl(p.default_url);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Enter a URL.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setSchema(null);
    setSourceUrl(null);

    const body =
      preset === 'custom'
        ? { url: url.trim(), schemaYaml: customYaml }
        : { url: url.trim(), preset };

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Scrape failed');
      setResult(json.result);
      setSchema(json.schema);
      setSourceUrl(json.page?.finalUrl ?? url.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!result || !schema || !sourceUrl) return;
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ schema, result, sourceUrl }),
    });
    if (!res.ok) {
      setError('Excel export failed');
      return;
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `extraction-${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const copyJson = async () => {
    if (!result) return;
    const payload = result.mode === 'list'
      ? { source: sourceUrl, items: result.items, confidence: result.confidence, warnings: result.warnings }
      : { source: sourceUrl, data: result.data, confidence: result.confidence, warnings: result.warnings };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  };

  return (
    <main className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">URL Extract</h1>
            <p className="text-xs text-neutral-500">Schema-driven web scraper. URL → JSON + Excel. Powered by Gemini 2.5 Flash.</p>
          </div>
          <a
            href="https://github.com/joshobuilds/url-extract-pipeline"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-neutral-600 hover:text-neutral-900 underline"
          >
            GitHub
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 grid gap-6 lg:grid-cols-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-5 lg:col-span-2">
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold mb-3">1. URL</h2>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/listings"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-400"
              spellCheck={false}
            />
            <p className="mt-2 text-xs text-neutral-500">
              Public pages only. No auth, no login-gated content. Large pages are truncated at ~800KB.
            </p>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold mb-3">2. Pick a schema</h2>
            <div className="flex flex-col gap-2">
              {PRESET_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                    preset === opt.value
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="preset"
                    value={opt.value}
                    checked={preset === opt.value}
                    onChange={() => onPickPreset(opt.value)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-[10px] uppercase tracking-wide rounded bg-neutral-100 text-neutral-700 px-1.5 py-0.5">
                        {opt.mode}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500">{opt.hint}</div>
                  </div>
                </label>
              ))}
            </div>
            {preset === 'custom' && (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs text-neutral-500">
                    YAML is whitespace-sensitive. If pasting loses indentation, click Reset.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCustomYaml(EXAMPLE_CUSTOM_YAML)}
                    className="shrink-0 whitespace-nowrap text-xs rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50"
                  >
                    Reset to example
                  </button>
                </div>
                <textarea
                  value={customYaml}
                  onChange={(e) => setCustomYaml(e.target.value)}
                  spellCheck={false}
                  className="w-full h-64 font-mono text-xs rounded-lg border border-neutral-300 p-3 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                />
              </div>
            )}
          </section>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="rounded-lg bg-neutral-900 text-white px-4 py-3 text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Scraping…' : 'Scrape URL'}
          </button>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">
              <div>{error}</div>
              {/Schema YAML is invalid|Map keys must be unique|Implicit keys/i.test(error) && (
                <div className="mt-2 text-red-700">
                  Tip: pasting YAML sometimes drops indentation. Click{' '}
                  <span className="font-semibold">Reset to example</span> above the textarea,
                  then edit the template in place.
                </div>
              )}
            </div>
          )}
        </form>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 min-h-[300px] lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">3. Results</h2>
            {result && (
              <div className="flex gap-2">
                <button
                  onClick={copyJson}
                  className="text-xs rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50"
                >
                  Copy JSON
                </button>
                <button
                  onClick={downloadExcel}
                  className="text-xs rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50"
                >
                  Download Excel
                </button>
              </div>
            )}
          </div>

          {!result && !loading && (
            <div className="text-sm text-neutral-500">
              {selectedPreset ? (
                <>Selected schema: <span className="font-medium text-neutral-700">{selectedPreset.label}</span> ({selectedPreset.mode}).</>
              ) : (
                'Extraction output will appear here.'
              )}
            </div>
          )}

          {loading && (
            <div className="text-sm text-neutral-500">
              Fetching page, cleaning HTML, and passing it to Gemini. Typically 10–25 seconds.
            </div>
          )}

          {result && schema && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-neutral-100 px-2 py-1">
                  confidence <span className="font-semibold">{result.confidence.toFixed(2)}</span>
                </span>
                <span className="rounded bg-neutral-100 px-2 py-1">
                  model <span className="font-semibold">{result.model_used}</span>
                </span>
                <span className="rounded bg-neutral-100 px-2 py-1">
                  mode <span className="font-semibold">{result.mode}</span>
                </span>
                {result.mode === 'list' && (
                  <span className="rounded bg-neutral-100 px-2 py-1">
                    <span className="font-semibold">{result.items.length}</span> items
                  </span>
                )}
                {result.missing_fields.length > 0 && (
                  <span className="rounded bg-amber-100 text-amber-900 px-2 py-1">
                    {result.missing_fields.length} missing
                  </span>
                )}
              </div>

              {result.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <div className="text-xs font-semibold text-amber-900 mb-1">Warnings</div>
                  <ul className="text-xs text-amber-900 list-disc pl-4 space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.mode === 'list' ? (
                <ListTable
                  items={result.items}
                  fieldNames={schema.fields.map((f) => f.name)}
                />
              ) : (
                <pre className="rounded-lg bg-neutral-900 text-neutral-100 text-xs p-3 overflow-auto max-h-[480px] whitespace-pre-wrap break-words">
{JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </section>
      </div>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-neutral-500">
        Pages are fetched server-side, cleaned, and never stored. Built by{' '}
        <a href="https://github.com/joshobuilds" className="underline">joshobuilds</a>.
      </footer>
    </main>
  );
}

function ListTable({
  items,
  fieldNames,
}: {
  items: Record<string, unknown>[];
  fieldNames: string[];
}) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-neutral-500">
        No items found on the page. The schema may not match, or the page uses
        JavaScript to render content.
      </div>
    );
  }
  return (
    <div className="overflow-auto max-h-[520px] border border-neutral-200 rounded-lg">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-neutral-900 text-neutral-100">
          <tr>
            {fieldNames.map((name) => (
              <th key={name} className="text-left font-semibold px-3 py-2 whitespace-nowrap">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className={i % 2 ? 'bg-neutral-50' : 'bg-white'}>
              {fieldNames.map((name) => (
                <td key={name} className="align-top px-3 py-2 border-t border-neutral-100 max-w-xs">
                  <CellValue value={it[name]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-neutral-400">—</span>;
  }
  if (Array.isArray(value)) {
    return <span>{value.join(', ')}</span>;
  }
  if (typeof value === 'boolean') {
    return <span>{value ? 'true' : 'false'}</span>;
  }
  const text = String(value);
  if (/^https?:\/\//i.test(text)) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noreferrer"
        className="text-blue-700 hover:underline break-all"
      >
        {text.length > 60 ? `${text.slice(0, 60)}…` : text}
      </a>
    );
  }
  return <span className="break-words">{text}</span>;
}
