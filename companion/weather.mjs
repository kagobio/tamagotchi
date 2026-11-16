// El tiempo de donde estés, de Open-Meteo (gratis y sin clave). Solo se pide si lo activas, y con las coordenadas redondeadas.
const KINDS = [
  [[0, 1], "clear"], [[2, 3], "cloud"], [[45, 48], "fog"], [[51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], "rain"],
  [[71, 73, 75, 77, 85, 86], "snow"], [[95, 96, 99], "storm"],
];

export const kindOf = (code) => (KINDS.find(([codes]) => codes.includes(Number(code))) || [null, "cloud"])[1];

export function urlFor({ lat, lon }) {
  const round = (n) => (Math.round(n * 100) / 100).toFixed(2);
  return `https://api.open-meteo.com/v1/forecast?latitude=${round(lat)}&longitude=${round(lon)}&current=temperature_2m,weather_code&timezone=auto`;
}

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "user-agent": "tinto-companion" } });
  if (!res.ok) throw new Error(`el servicio del tiempo respondió ${res.status}`);
  return res.json();
}

export function createWeather({ hub, lat, lon, fetchJson = download, log = () => {} }) {
  return {
    async poll() {
      const data = await fetchJson(urlFor({ lat, lon }));
      const current = data && data.current;
      if (!current || !Number.isFinite(Number(current.weather_code))) throw new Error("respuesta del tiempo inesperada");
      const weather = hub.setWeather(kindOf(current.weather_code), current.temperature_2m);
      log(`tiempo: ${weather.kind}, ${weather.temp}°`);
      return weather;
    },
  };
}
