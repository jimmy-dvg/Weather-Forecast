import { useEffect, useRef, useState } from 'react'
import {
  WiCloud,
  WiDayCloudy,
  WiDayRain,
  WiDayShowers,
  WiDaySnow,
  WiDaySunny,
  WiFog,
  WiHail,
  WiNightAltCloudy,
  WiNightAltRain,
  WiNightAltShowers,
  WiNightAltSnow,
  WiNightClear,
  WiRain,
  WiShowers,
  WiSleet,
  WiSnow,
  WiSprinkle,
  WiThunderstorm,
} from 'react-icons/wi'
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

function getWeatherIconElement(code, isDay = 1) {
  const day = Number(isDay) === 1

  if (code === 0) return day ? <WiDaySunny /> : <WiNightClear />
  if ([1, 2].includes(code)) return day ? <WiDayCloudy /> : <WiNightAltCloudy />
  if (code === 3) return <WiCloud />
  if ([45, 48].includes(code)) return <WiFog />
  if ([51, 53, 55].includes(code)) return day ? <WiSprinkle /> : <WiNightAltShowers />
  if ([56, 57].includes(code)) return <WiSleet />
  if ([61, 63].includes(code)) return day ? <WiDayShowers /> : <WiNightAltShowers />
  if ([65, 80, 81, 82].includes(code)) return day ? <WiDayRain /> : <WiNightAltRain />
  if ([66, 67].includes(code)) return <WiSleet />
  if ([71, 73, 75, 77, 85, 86].includes(code)) return day ? <WiDaySnow /> : <WiNightAltSnow />
  if (code === 95) return <WiThunderstorm />
  if ([96, 99].includes(code)) return <WiHail />
  return <WiRain />
}

function WeatherIcon({ code, isDay = 1 }) {
  return getWeatherIconElement(code, isDay)
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

function buildForecastUrl(latitude, longitude, unit) {
  const temperatureUnit = unit === 'fahrenheit' ? 'fahrenheit' : 'celsius'

  return `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&temperature_unit=${temperatureUnit}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=6&timezone=auto`
}

function normalizeForecastData({ forecastData, location }) {
  const forecastDays = (forecastData.daily?.time || []).slice(1).map((day, index) => ({
    date: day,
    weatherCode: forecastData.daily.weather_code[index + 1],
    tempMax: forecastData.daily.temperature_2m_max[index + 1],
    tempMin: forecastData.daily.temperature_2m_min[index + 1],
    rainChance: forecastData.daily.precipitation_probability_max[index + 1],
  }))

  return {
    location,
    units: forecastData.current_units,
    current: forecastData.current,
    days: forecastDays,
  }
}

async function fetchWeatherByCoordinates({ latitude, longitude, unit }) {
  const reverseGeoResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`,
  )

  const reverseGeoData = reverseGeoResponse.ok ? await reverseGeoResponse.json() : null
  const reverseResult = reverseGeoData?.results?.[0]

  const forecastResponse = await fetch(buildForecastUrl(latitude, longitude, unit))

  if (!forecastResponse.ok) {
    throw new Error('Unable to load weather forecast right now.')
  }

  const forecastData = await forecastResponse.json()

  return normalizeForecastData({
    forecastData,
    location: {
      city: reverseResult?.name || 'Current location',
      region: reverseResult?.admin1 || '',
      country: reverseResult?.country || '',
      latitude,
      longitude,
    },
  })
}

async function fetchWeatherByCity({ cityName, unit }) {
  const geoResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`,
  )

  if (!geoResponse.ok) {
    throw new Error('Unable to search location right now.')
  }

  const geoData = await geoResponse.json()
  const location = geoData?.results?.[0]

  if (!location) {
    throw new Error('City not found. Try a different spelling.')
  }

  const forecastResponse = await fetch(buildForecastUrl(location.latitude, location.longitude, unit))

  if (!forecastResponse.ok) {
    throw new Error('Unable to load weather forecast right now.')
  }

  const forecastData = await forecastResponse.json()

  return normalizeForecastData({
    forecastData,
    location: {
      city: location.name,
      region: location.admin1,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
    },
  })
}

function readHistory() {
  try {
    const raw = localStorage.getItem('weather-search-history')
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeHistory(history) {
  localStorage.setItem('weather-search-history', JSON.stringify(history))
}

function App() {
  const [city, setCity] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [error, setError] = useState('')
  const [unit, setUnit] = useState('celsius')
  const [history, setHistory] = useState([])
  const [lastQuery, setLastQuery] = useState(null)
  const previousUnitRef = useRef(unit)

  useEffect(() => {
    setHistory(readHistory())
  }, [])

  useEffect(() => {
    if (previousUnitRef.current === unit) {
      return
    }

    previousUnitRef.current = unit

    if (!lastQuery) {
      return
    }

    let cancelled = false

    async function refetchWithNewUnit() {
      setError('')

      try {
        let weatherData = null

        if (lastQuery.type === 'city') {
          weatherData = await fetchWeatherByCity({ cityName: lastQuery.cityName, unit })
          if (!cancelled) {
            setCity(weatherData.location.city)
          }
        }

        if (lastQuery.type === 'coords') {
          weatherData = await fetchWeatherByCoordinates({
            latitude: lastQuery.latitude,
            longitude: lastQuery.longitude,
            unit,
          })
        }

        if (!cancelled && weatherData) {
          setResult(weatherData)
        }
      } catch (fetchError) {
        if (!cancelled) {
          setResult(null)
          setError(fetchError.message || 'Unable to refresh weather for the selected unit.')
        }
      }
    }

    void refetchWithNewUnit()

    return () => {
      cancelled = true
    }
  }, [lastQuery, unit])

  useEffect(() => {
    if (!navigator.geolocation) {
      return
    }

    let cancelled = false
    setGeoLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const weatherData = await fetchWeatherByCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            unit: 'celsius',
          })

          if (!cancelled) {
            setResult(weatherData)
            setLastQuery({
              type: 'coords',
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            })
          }
        } catch {
          // Ignore silent startup geolocation errors.
        } finally {
          if (!cancelled) {
            setGeoLoading(false)
          }
        }
      },
      () => {
        if (!cancelled) {
          setGeoLoading(false)
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )

    return () => {
      cancelled = true
    }
  }, [])

  function saveRecentCity(cityName) {
    const normalized = cityName.trim()
    if (!normalized) {
      return
    }

    const updated = [normalized, ...history.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 6)
    setHistory(updated)
    writeHistory(updated)
  }

  async function searchWeather(cityName, options = {}) {
    const cityQuery = cityName.trim()
    const { fromHistory = false, persistHistory = true } = options

    if (!cityQuery) {
      setError('Please enter a city name first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const weatherData = await fetchWeatherByCity({ cityName: cityQuery, unit })

      setResult(weatherData)
      setCity(weatherData.location.city)

      if (persistHistory) {
        saveRecentCity(weatherData.location.city)
      }

      if (!fromHistory) {
        setLastQuery({ type: 'city', cityName: weatherData.location.city })
      }
    } catch (fetchError) {
      setResult(null)
      setError(fetchError.message || 'Something went wrong while fetching data.')
    } finally {
      setLoading(false)
    }
  }

  async function loadCurrentLocationWeather(options = {}) {
    const {
      silentError = false,
      latitude = null,
      longitude = null,
      rememberQuery = true,
    } = options

    setError('')
    setGeoLoading(true)

    try {
      let coords = { latitude, longitude }

      if (coords.latitude === null || coords.longitude === null) {
        coords = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              })
            },
            () => reject(new Error('Unable to access your location. Check browser permissions.')),
            { enableHighAccuracy: true, timeout: 10000 },
          )
        })
      }

      const weatherData = await fetchWeatherByCoordinates({
        latitude: coords.latitude,
        longitude: coords.longitude,
        unit,
      })

      setResult(weatherData)

      if (rememberQuery) {
        setLastQuery({ type: 'coords', latitude: coords.latitude, longitude: coords.longitude })
      }
    } catch (fetchError) {
      if (!silentError) {
        setError(fetchError.message || 'Something went wrong while fetching your location weather.')
      }
    } finally {
      setGeoLoading(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    void searchWeather(city)
  }

  return (
    <main className="app-shell">
      <div className="bg-orb bg-orb-1" aria-hidden="true"></div>
      <div className="bg-orb bg-orb-2" aria-hidden="true"></div>

      <section className="weather-panel">
        <p className="kicker">React + Open-Meteo</p>
        <h1>Weather</h1>

        <div className="top-controls">
          <div className="unit-toggle" role="group" aria-label="Temperature unit">
            <button
              type="button"
              className={unit === 'celsius' ? 'active' : ''}
              onClick={() => setUnit('celsius')}
            >
              Celsius
            </button>
            <button
              type="button"
              className={unit === 'fahrenheit' ? 'active' : ''}
              onClick={() => setUnit('fahrenheit')}
            >
              Fahrenheit
            </button>
          </div>

          <button
            type="button"
            className="geo-btn"
            disabled={geoLoading || loading}
            onClick={() => void loadCurrentLocationWeather()}
          >
            {geoLoading ? 'Locating...' : 'Use my location'}
          </button>
        </div>

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
          <button type="submit" disabled={loading || geoLoading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {history.length > 0 && (
          <section className="history" aria-label="Recent searches">
            <p>Recent:</p>
            <div>
              {history.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    setCity(entry)
                    void searchWeather(entry, { fromHistory: true })
                  }}
                >
                  {entry}
                </button>
              ))}
            </div>
          </section>
        )}

        {error && <p className="status error">{error}</p>}

        {!result && !error && !loading && !geoLoading && (
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
                  <WeatherIcon code={result.current.weather_code} isDay={result.current.is_day} />
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
                    <WeatherIcon code={day.weatherCode} isDay={1} />
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
