# Weather App (React + Vite)

Simple weather app built with React and Vite.

## What It Does

- Search by city name and click Search.
- Fetches location data from Open-Meteo Geocoding API.
- Fetches current weather + next 5 days forecast from Open-Meteo Forecast API.
- Shows weather condition icons using the external react-icons library.
- Supports Celsius/Fahrenheit toggle.
- Supports Use my location (browser geolocation).
- Stores recent city searches in local storage.

## Tech

- React
- Vite
- Open-Meteo APIs
- react-icons

## Project Files

- Main UI and logic: src/App.jsx
- Styles: src/App.css, src/index.css

## Run Locally

1. Install dependencies:
	npm install
2. Start dev server:
	npm run dev
3. Build for production:
	npm run build
4. Lint:
	npm run lint

## Notes

- No API key is required for Open-Meteo.
- If geolocation permission is denied, city search still works normally.
