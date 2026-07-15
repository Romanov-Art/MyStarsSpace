# MyStarsSpace Canva API

Standalone Canva Connect backend for opening MyStarsSpace customer star maps in Canva with editable text.

The frontend must send a textless poster image: theme background, star map, map frame/compass, and poster border only. Customer text is sent as JSON and inserted into Canva Autofill fields, so the text remains editable in Canva.

## Flow

1. Connect a site user to Canva:

```bash
curl "http://localhost:3200/v1/auth/canva/url?user_id=user-123"
```

Open `authorization_url`. Canva redirects to `/v1/auth/canva/callback`, where this service stores the user's token in local libSQL.

2. Create a Canva design:

```bash
curl http://localhost:3200/v1/editor/create \
  -H "Authorization: Bearer change-me" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "title": "Customer Star Map",
    "asset": {
      "data_url": "data:image/png;base64,...",
      "name": "Star map background"
    },
    "canvas": { "width": 30, "height": 40, "unit": "cm", "dpi": 300 },
    "template": { "brand_template_id": "YOUR_CANVA_TEMPLATE_ID" },
    "text": {
      "phrase": "The Night We Met",
      "line1": "Anthony & Laura",
      "line2": "Paris, France",
      "line3": "29.06.2026, 22:30",
      "line4": "48.8566 N, 2.3522 E"
    },
    "style": {
      "phraseFont": "Cormorant Garamond",
      "phraseFontSize": 30,
      "subtitleFont": "Cormorant Garamond",
      "subtitleFontSize": 12,
      "themeId": "black"
    }
  }'
```

The response includes `edit_url`, which the site can open for the customer.

## Canva Template Contract

The Canva Brand Template or autofillable design must expose these Autofill fields:

- `starMapBackground`: image field for the full textless poster.
- `phrase`: editable main text.
- `line1`, `line2`, `line3`, `line4`: editable subtitle lines.

Optional style fields can be exposed as text fields if the template needs them:

- `phraseFont`
- `phraseFontSize`
- `subtitleFont`
- `subtitleFontSize`
- `themeId`

## Environment

Copy `.env.example` to `.env` and set:

- `API_KEYS`: comma-separated bearer tokens allowed to call protected routes.
- `PUBLIC_BASE_URL`: public URL of this service.
- `DATA_DIR`: persistent directory for libSQL token storage.
- `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`: Canva Connect app credentials.
- `CANVA_REDIRECT_URI`: must match an allowed Canva redirect URI.
- `DEFAULT_BRAND_TEMPLATE_ID` or `DEFAULT_DESIGN_ID`: optional default Autofill source.

## Local

```bash
npm install
cp .env.example .env
npm run dev
```

## Test and Build

```bash
npm test
npm run build
```

## Docker

```bash
docker build -t mystarsspace-canva-api .
docker run --rm -p 3200:3200 \
  -e API_KEYS=change-me \
  -e CANVA_CLIENT_ID=... \
  -e CANVA_CLIENT_SECRET=... \
  -e PUBLIC_BASE_URL=http://localhost:3200 \
  -e DEFAULT_BRAND_TEMPLATE_ID=... \
  -v mystarsspace-canva-data:/app/data \
  mystarsspace-canva-api
```
