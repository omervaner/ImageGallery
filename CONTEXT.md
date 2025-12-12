# Context for Claude

## Who is Omer
- Learning to code, started with Python, now exploring JavaScript
- Gets bored easily - needs projects that are genuinely interesting to him
- Interests: Gaming (Football Manager, strategy/simulation), Books, Movies, Comics, Music
- Has an M4 Mac Pro with 24GB RAM

## What We Built
An image gallery app with AI-powered tagging using Ollama + moondream (1.8B vision model).

### Tech Stack
- **Backend**: Python + Flask
- **Frontend**: HTML/CSS/JS (single file in templates/)
- **Database**: SQLite (gallery.db - created on first run)
- **AI**: Ollama with moondream model (already installed)

### How It Works
1. User scans a folder → images get added to SQLite database
2. User clicks an image → modal shows full size
3. User clicks "Generate AI Tags" → calls moondream via Ollama CLI
4. Tags + description saved to database
5. User can search by tags/filename

## Current State
- All code is written and ready
- Flask is installed
- Moondream is installed in Ollama
- NOT YET RUN - user hasn't tested it yet

## To Run
```bash
cd ~/ImageGallery && python3 app.py
```
Then open http://localhost:5000

## What's Next (ideas)
- Test it with real images
- Batch tagging (tag all images at once)
- Manual tag editing
- Favorites/albums
- Better error handling
- Make it a proper desktop app (Electron or PyQt)

## Teaching Notes
- Explain Python/JS concepts as you go
- Keep it practical, not theoretical
- He's smart but new to coding - don't assume knowledge
