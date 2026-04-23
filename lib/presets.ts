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
  mobile_home_parks: {
    label: 'Mobile home parks directory',
    description: 'Park-level data: name, address, counts, year built, age restrictions.',
    default_url: '',
    mode: 'list',
    yaml: `name: "Mobile home parks"
description: "Extract park-level data from a mobile home park directory or listing site (e.g. mhvillage.com, mobilehomeparkstore.com)."
mode: list
instructions: |
  - One row per distinct park. Do not emit one row per home-for-sale listing.
  - state, county, city should be standardized (e.g. "MI" not "Michigan"; "Clare" not "Clare County").
  - zip is the 5-digit US ZIP code as a string (preserve leading zeros).
  - homes_for_sale and homes_for_rent are integer counts shown on the park page. If not shown, leave blank — do not estimate.
  - number_of_sites is the total lot count at the park.
  - vacant_sites is only included if the park explicitly publishes it.
  - age_restrictions standardizes to one of: "Age Restricted", "All Ages", "55+".
  - source_url must be the exact URL of the park detail page.

fields:
  - name: park_name
    type: string
    required: true
  - name: state
    type: string
    description: "2-letter US state code."
  - name: county
    type: string
  - name: city
    type: string
  - name: street_address
    type: string
  - name: zip
    type: string
    description: "5-digit US ZIP code as a string."
  - name: homes_for_sale
    type: integer
  - name: homes_for_rent
    type: integer
  - name: year_built
    type: integer
  - name: number_of_sites
    type: integer
  - name: vacant_sites
    type: integer
  - name: age_restrictions
    type: string
    enum: ["Age Restricted", "All Ages", "55+"]
  - name: manager_name
    type: string
`,
  },
  restaurant_menu: {
    label: 'Restaurant menu (single page)',
    description: 'Restaurant menu with categories, items, prices, modifiers, and business metadata.',
    default_url: '',
    mode: 'single',
    yaml: `name: "Restaurant menu"
description: "Extract a restaurant's full menu plus business metadata from a single page. Designed for marketplace merchant onboarding."
mode: single
instructions: |
  - Capture the full menu, not just featured items.
  - Group items under their category (Starters, Mains, Drinks, etc). If no categories are visible, use "Menu".
  - price is a number in the venue's currency. Strip currency symbols and thousand separators.
  - currency is a 3-letter ISO 4217 code inferred from the symbol, country, or context (e.g. $ + AU address = AUD; $ alone in US context = USD; £ = GBP).
  - modifiers captures size/add-on options shown next to an item (e.g. "Small/Medium/Large", "Add bacon +$2").
  - description is the short blurb under the item name, if shown.
  - dietary_tags captures badges like "V" (vegetarian), "VG" (vegan), "GF" (gluten-free), "DF" (dairy-free), "N" (contains nuts). Normalize to the full word.
  - business_name, address, phone, email, opening_hours come from footer / contact / about sections.
  - Do not invent prices or items that aren't on the page.

fields:
  - name: business_name
    type: string
    required: true
  - name: cuisine_type
    type: string
    description: "E.g. Italian, Japanese, Modern Australian, Cafe."
  - name: address
    type: string
  - name: phone
    type: string
  - name: email
    type: string
  - name: opening_hours
    type: string
    description: "Free-text as displayed, e.g. 'Mon-Fri 11am-9pm, Sat-Sun 10am-10pm'."
  - name: currency
    type: string
    description: "ISO 4217 code."
  - name: categories
    type: array
    item_type: string
    description: "Ordered list of menu category names in the order shown on the page."
  - name: items
    type: array
    item_type: string
    description: "JSON strings, one per menu item. Each string is a JSON object with keys: name, category, price, description, modifiers (array), dietary_tags (array)."
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
