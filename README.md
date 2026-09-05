# Cellular Automaton (Conway's Game of Life)

[![Build Status](https://travis-ci.org/fgamess/cellular-automaton.svg?branch=master)](https://travis-ci.org/fgamess/cellular-automaton)

A small **Conway's Game of Life** demo: PHP evolves the grid; the browser draws it as SVG (ES6, no bundler).

Pick a starting pattern on the index page, then watch the first **100** generations on the automaton page.

## Table of contents

- [What it is](#what-it-is)
- [Rules and grid](#rules-and-grid)
- [Available patterns](#available-patterns)
- [Architecture](#architecture)
- [API](#api)
- [Project layout](#project-layout)
- [Prerequisites](#prerequisites)
- [Set up the Docker stack](#set-up-the-docker-stack)
- [How to use](#how-to-use)
- [Testing](#testing)
- [Adding a pattern](#adding-a-pattern)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [License](#license)

## What it is

Classic **B3/S23** Game of Life on a fixed grid:

1. Open the index page — six previews at generation 0 (random plus five named patterns).
2. Click **Go** on one — you are sent to the automaton page.
3. The client loads the initial grid, then polls the API every **50 ms** and redraws until generation **100**.

There is no cell painting, pause, or speed control — only **Come back** to the index.

## Rules and grid

| Setting | Value |
|--------|--------|
| Rules | Birth on 3 live neighbors; survival on 2 or 3; otherwise death |
| Size | **38 × 38** cells |
| Topology | **Finite** — edges do not wrap (no torus) |
| Random density | About 1/6 of cells alive |
| Evolution | Server-side; client POSTs the full JSON grid each step |

## Available patterns

| UI label | API / file name | Notes |
|----------|-----------------|--------|
| Random | _(no template)_ | Random initial state |
| Gosper Glider Gun | `glider_gun` | Placed at `(0,0)`; UI key is `gosper_glider_gun` |
| Glider | `glider` | Centered |
| Exploder | `exploder` | Centered |
| Tumbler | `tumbler` | Centered |
| Lightweight spaceship | `lightweight_spaceship` | Centered |

Pattern files live under `templates/` as ASCII: `O` = alive, space = dead. That folder is **pattern data only**, not HTML templates.

## Architecture

Thin hand-rolled stack (no framework):

```
Browser (assets/js — SVG + AJAX)
    → public/index.php | public/automaton.php
    → /api/...  (.htaccess rewrite)
    → src/api/api.php
    → Http\Kernel
    → Controller\GameController
    → Api\Game + Util\GridHelper + Model\Cell
```

- **PHP** owns Conway rules and JSON responses.
- **JS** owns polling, generation counter, and SVG `rect` rendering.
- Composer PSR-4 autoloads `src/`; production has no Composer runtime dependencies (PHPUnit is `require-dev` only).

## API

Base path: `/api/…` (rewritten to `src/api/api.php?request=…`).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/grid/generate&template={name}` | Build initial grid (optional template). Omit `template` for random. |
| POST | `/api/grid/new-generation` | Body field `json_grid` = current grid JSON; returns next generation. |

Wire format: JSON grid of cells with an `isAlive` flag. CORS is open (`*`); responses are `application/json`.

> Note: endpoints intentionally use `&template=` without a `?` so Apache’s rewrite can supply both `request` and `template` query parameters.

## Project layout

```
public/           # index.php, automaton.php
src/
  api/            # api.php front controller, Game domain service
  Controller/     # GameController route map
  Http/           # Kernel, Response
  Model/          # Cell
  Util/           # GridHelper
templates/        # ASCII Life patterns (*.txt)
assets/js|css/    # Client
tests/            # PHPUnit (helpers / Response — not Life rules)
Dockerfile        # php:7.2-apache
docker-compose.yml
```

## Prerequisites

### Tools required

For the provided Docker stack:

- Docker CE (Linux, macOS, or Windows)
- Docker Compose

Or your own Apache host with:

- **mod_rewrite** enabled
- Composer and git installed
- Document root / vhost pointed at this project so `.htaccess` applies (`AllowOverride` as needed)

### Requirements

- **PHP 7.2** (image and Travis target)
- No production Composer packages; `composer install` mainly pulls PHPUnit for tests

## Set up the Docker stack

Single service: **php:7.2-apache**, host port **14300** → container 80.

```bash
docker-compose build
docker-compose up -d
```

### Ownership inside the container

```bash
docker exec -it cellular_automaton_php bash
chown -R www-data:www-data .
exit
```

### Install Composer dependencies

```bash
docker exec -itu www-data cellular_automaton_php composer install
```

## How to use

Docker stack:

```text
http://localhost:14300/index.php
```

Own Apache / vhost:

```text
http://<your-host>:<port>/index.php
```

You should see the pattern gallery. Choosing one opens the automaton page and plays the first 100 iterations.

- **New pattern:** drop an ASCII `O`/space file in `templates/`, then wire it in `Endpoints.js` and the index UI — see [Adding a pattern](#adding-a-pattern).
- **Tests:** PHPUnit covers `GridHelper` and `Response` only — not Conway rules or the API controllers.

## Testing

```bash
vendor/bin/phpunit tests
```

Inside Docker (as used by Travis):

```bash
docker exec -it cellular_automaton_php vendor/bin/phpunit tests/
```

Coverage today is thin: `GridHelper` and `Response` only — Conway rules and HTTP controllers are not asserted.

## Adding a pattern

1. Add `templates/{name}.txt` using `O` for live cells (same style as existing files).
2. Expose it in `assets/js/Endpoints.js` (and the index UI in `public/index.php` / `assets/js/app.js`).
3. If the UI slug differs from the file name (as with Gosper → `glider_gun`), keep that mapping explicit in the endpoint list.
4. Most patterns are centered by the server; `glider_gun` is special-cased to `(0,0)`.

## Troubleshooting

| Symptom | Likely cause |
|--------|----------------|
| `/api/...` 404 | `mod_rewrite` off, or `.htaccess` not applied |
| API works on macOS but fails on Linux | Rewrite targets `/src/Api/api.php` while the directory is `src/api/` — case-sensitive filesystem |
| Blank / failed AJAX off localhost | Client builds requests as `http://localhost:<port>/...` |
| Permission errors in container | Run the `chown` / Composer steps as `www-data` above |
| Wrong port | Compose maps **14300**, not 80 |

## Known limitations

- Demo UX only: no edit, pause, step, or speed control.
- Fixed 38×38 grid; no wrap-around.
- Full grid POSTed every generation (~50 ms).
- Hand-rolled HTTP layer; some path and routing edges are rough.
- Travis CI badge may be outdated if the project no longer builds on travis-ci.org.

## License

[MIT](LICENSE) — see `LICENSE` for the full text.
