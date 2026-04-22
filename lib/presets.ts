export type Preset = {
  label: string;
  description: string;
  default_url: string;
  mode: 'single' | 'list';
  yaml: string;
};

export const PRESETS: Record<string, Preset> = {
  books_toscrape: {
    label: 'Book listing (books.toscrape.com)',
    description: 'Books with title, price, rating, stock status, detail URL.',
    default_url: 'https://books.toscrape.com/catalogue/page-1.html',
    mode: 'list',
    yaml: `name: "Book listing"
description: "Extract books from a listing page on books.toscrape.com or similar book sites."
mode: list
instructions: |
  - Prices are in GBP on books.toscrape.com. Strip the £ symbol.
  - The star rating is encoded as a class name "star-rating One/Two/Three/Four/Five".
  - detail_url should be an absolute URL.

fields:
  - name: title
    type: string
    required: true
  - name: price
    type: number
    required: true
  - name: rating
    type: string
    enum: [One, Two, Three, Four, Five]
  - name: in_stock
    type: boolean
    description: "True if the book is available to buy."
  - name: detail_url
    type: string
    description: "Absolute URL to the book's detail page."
`,
  },
  quotes_toscrape: {
    label: 'Quotes (quotes.toscrape.com)',
    description: 'Quotes with text, author, tags.',
    default_url: 'https://quotes.toscrape.com/',
    mode: 'list',
    yaml: `name: "Quotes listing"
description: "Extract quotes from quotes.toscrape.com or any quotes listing page."
mode: list
instructions: |
  - Strip the surrounding curly quotes from the quote text.
  - tags is a list of short keywords.

fields:
  - name: text
    type: string
    required: true
    description: "The full quote text."
  - name: author
    type: string
    required: true
  - name: tags
    type: array
    item_type: string
`,
  },
  hn_frontpage: {
    label: 'Hacker News front page',
    description: 'Stories with rank, title, URL, points, comments, author.',
    default_url: 'https://news.ycombinator.com/',
    mode: 'list',
    yaml: `name: "Hacker News listing"
description: "Extract stories from news.ycombinator.com or similar ranked-list news pages."
mode: list
instructions: |
  - rank is the position number shown next to each story.
  - url is the external link the headline points to. If it's an internal Ask HN / Show HN thread, return the news.ycombinator.com URL.
  - points is the vote count. If the story has no score (e.g. jobs), return null.
  - comments_count is parsed from the "N comments" link. "discuss" means 0.

fields:
  - name: rank
    type: integer
  - name: title
    type: string
    required: true
  - name: url
    type: string
  - name: points
    type: integer
  - name: comments_count
    type: integer
  - name: author
    type: string
`,
  },
  product_listing: {
    label: 'Generic product listing',
    description: 'Any e-commerce listing page — name, price, rating, URL.',
    default_url: '',
    mode: 'list',
    yaml: `name: "Product listing"
description: "Extract product cards from any e-commerce listing page."
mode: list
instructions: |
  - price as a number. Strip currency symbols and thousand separators.
  - currency as an ISO 4217 code if inferable from symbol or locale.
  - image_url and product_url should be absolute.

fields:
  - name: name
    type: string
    required: true
  - name: price
    type: number
  - name: currency
    type: string
    description: "ISO 4217 code, e.g. USD, AUD, GBP, EUR."
  - name: rating
    type: number
    description: "0 to 5 scale, if a rating is shown."
  - name: review_count
    type: integer
  - name: in_stock
    type: boolean
  - name: product_url
    type: string
  - name: image_url
    type: string
`,
  },
  article: {
    label: 'Article / blog post (single page)',
    description: 'Summarize one article page — title, author, date, summary, topics.',
    default_url: '',
    mode: 'single',
    yaml: `name: "Article"
description: "Summarize a single article or blog post page."
mode: single
instructions: |
  - summary should be 2-3 sentences covering the article's main point.
  - main_topics is a short list of 3-6 keywords or tags.
  - word_count is approximate.

fields:
  - name: title
    type: string
    required: true
  - name: author
    type: string
  - name: publish_date
    type: date
  - name: summary
    type: string
    required: true
    description: "2-3 sentence summary."
  - name: main_topics
    type: array
    item_type: string
  - name: word_count
    type: integer
`,
  },
};
