import { useState } from 'react'
import './App.css'

const weatherCodeDescriptions = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}

function getWeatherDescription(code) {
  return weatherCodeDescriptions[code] || 'Unknown conditions'
}

function getWeatherIcon(code, isDay = 1) {
  if (code === 0) return isDay ? '☀️' : '🌙'
  if ([1, 2].includes(code)) return isDay ? '🌤️' : '🌥️'
  if (code === 3) return '☁️'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️'
  if ([95, 96, 99].includes(code)) return '⛈️'
  return '🌈'
}

function formatWeekday(dateText) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
    new Date(`${dateText}T00:00:00`),
  )
}

function formatLongDate(dateText) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateText}T00:00:00`))
}

function App() {
  const [city, setCity] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function searchWeather(cityName) {
    const cityQuery = cityName.trim()

    if (!cityQuery) {
      setError('Please enter a city name first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`,
      )

      if (!geoResponse.ok) {
        throw new Error('Unable to search location right now.')
      }

      const geoData = await geoResponse.json()
      const location = geoData?.results?.[0]

      if (!location) {
        throw new Error('City not found. Try a different spelling.')
      }

      const forecastResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=6&timezone=auto`,
      )

      if (!forecastResponse.ok) {
        throw new Error('Unable to load weather forecast right now.')
      }

      const forecastData = await forecastResponse.json()
      const forecastDays = (forecastData.daily?.time || []).slice(1).map((day, index) => ({
        date: day,
        weatherCode: forecastData.daily.weather_code[index + 1],
        tempMax: forecastData.daily.temperature_2m_max[index + 1],
        tempMin: forecastData.daily.temperature_2m_min[index + 1],
        rainChance: forecastData.daily.precipitation_probability_max[index + 1],
      }))

      setResult({
        location: {
          city: location.name,
          region: location.admin1,
          country: location.country,
        },
        units: forecastData.current_units,
        current: forecastData.current,
        days: forecastDays,
      })
    } catch (fetchError) {
      setResult(null)
      setError(fetchError.message || 'Something went wrong while fetching data.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    searchWeather(city)
  }

  return (
    <main className="app-shell">
      <div className="bg-orb bg-orb-1" aria-hidden="true"></div>
      <div className="bg-orb bg-orb-2" aria-hidden="true"></div>

      <section className="weather-panel">
        <p className="kicker">React + Open-Meteo</p>
        <h1>Weather</h1>

        <form className="search-form" onSubmit={handleSubmit}>
          <label htmlFor="city-input" className="sr-only">
            Enter city
          </label>
          <input
            id="city-input"
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Enter a city..."
            autoComplete="off"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && <p className="status error">{error}</p>}

        {!result && !error && !loading && (
          <p className="status hint">Search for a city to see current weather and the next few days.</p>
        )}

        {result && (
          <>
            <article className="current-card">
              <div>
                <p className="location">
                  {result.location.city}
                  {result.location.region ? `, ${result.location.region}` : ''}
                  {result.location.country ? `, ${result.location.country}` : ''}
                </p>
                <p className="today">Today, {formatLongDate(new Date().toISOString().slice(0, 10))}</p>
              </div>

              <div className="current-main">
                <span className="icon-large" aria-hidden="true">
                  {getWeatherIcon(result.current.weather_code, result.current.is_day)}
                </span>
                <div>
                  <p className="temp-large">
                    {Math.round(result.current.temperature_2m)}
                    {result.units.temperature_2m}
                  </p>
                  <p className="condition">{getWeatherDescription(result.current.weather_code)}</p>
                </div>
              </div>

              <div className="metrics-grid">
                <p>
                  Feels like: <strong>{Math.round(result.current.apparent_temperature)}{result.units.apparent_temperature}</strong>
                </p>
                <p>
                  Humidity: <strong>{result.current.relative_humidity_2m}{result.units.relative_humidity_2m}</strong>
                </p>
                <p>
                  Wind: <strong>{Math.round(result.current.wind_speed_10m)} {result.units.wind_speed_10m}</strong>
                </p>
                <p>
                  Precipitation: <strong>{result.current.precipitation} {result.units.precipitation}</strong>
                </p>
              </div>
            </article>

            <section className="forecast-grid" aria-label="Forecast for the next days">
              {result.days.map((day) => (
                <article key={day.date} className="day-card">
                  <p className="day-name">{formatWeekday(day.date)}</p>
                  <p className="day-date">{formatLongDate(day.date)}</p>
                  <p className="icon-small" aria-hidden="true">
                    {getWeatherIcon(day.weatherCode, 1)}
                  </p>
                  <p className="day-condition">{getWeatherDescription(day.weatherCode)}</p>
                  <p className="day-temp">
                    <span>{Math.round(day.tempMax)}{result.units.temperature_2m}</span>
                    <span>{Math.round(day.tempMin)}{result.units.temperature_2m}</span>
                  </p>
                  <p className="rain-chance">Rain chance: {day.rainChance}%</p>
                </article>
              ))}
            </section>
          </>
        )}
      </section>
    </main>
  )
}

export default App
