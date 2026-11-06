# Weatherfield

A buildless weather app with hourly and 10-day forecasts, completed-day precipitation history (7/30 days), US AQI and pollutant concentrations, city/US ZIP search, browser geolocation, and Fahrenheit/Celsius controls. Starts in Wenonah, New Jersey. Location and units are saved in local storage.

## Run locally

From this directory, run `python3 -m http.server 5173 --directory dist` and open http://localhost:5173. No dependencies, API keys, or build step.

## Data

- Open-Meteo Forecast API: current conditions, hourly and daily forecast; past 7 days bridge the archive's reporting lag.
- Open-Meteo Historical Weather API: precipitation through five days before the location's current date; recent days use forecast model history. Totals cover completed calendar days, not a rolling 24-hour gauge reading. Missing values are never converted to zero.
- Open-Meteo Air Quality API / CAMS: modeled US AQI, PM2.5, PM10, ozone.
- Open-Meteo Geocoding / GeoNames: locations; 5-digit ZIP searches restricted to the US.

All weather requests use metric source data; units convert for display. Hourly timestamps use Unix seconds and display in the selected location's time zone. Weather, AQI and history show independent errors. Precip and AccuWeather links are comparisons for Wenonah, not sources feeding this app.

Open-Meteo's free service is for noncommercial use and subject to rate limits. See https://open-meteo.com/en/pricing. Data attribution is displayed in the app. Google Fonts is optional; system fonts are fallbacks.

## ZIP codes in URLs (self-hosting)

Open `/weather/08090` or `/weather/08090/` to select a US ZIP code automatically. The URL takes priority over the saved location; unit preferences are retained. An unrecognized ZIP or lookup failure shows an error and uses the saved/default location. The app can also be hosted at the site root or in another subdirectory.

**Apache:** Upload all files in `dist/`, including the hidden `.htaccess` file. The included rewrite sends five-digit paths to `index.html`. The server must enable `mod_rewrite` and allow `.htaccess` rewrite rules (`AllowOverride FileInfo` or `All`).

**Nginx:** For an app in `/weather/`, add this inside the existing `server` block (with its normal `root` already configured), then validate and reload your Nginx configuration:

```nginx
location ~ ^/weather/[0-9]{5}/?$ {
    rewrite ^ /weather/index.html last;
}
```

Adjust `/weather/` to the actual app directory. Existing server rules may need to be reconciled with this example. Nginx does not read `.htaccess`.

**Without server configuration:** `/weather/?zip=08090` selects the same location without a rewrite. Python's basic local preview server supports this query-string form, but does not process `.htaccess` or ZIP path rewrites. A server that already has an HTML fallback can also use the ZIP paths.
