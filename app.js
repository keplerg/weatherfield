'use strict';
const $ = id => document.getElementById(id);
const DEFAULT = {name:'Wenonah',admin1:'New Jersey',country:'United States',latitude:39.7946,longitude:-75.1488,timezone:'America/New_York'};
let place=DEFAULT, unit='F', view='hourly', weather=null, air=null, history=[], requestId=0, searchId=0;
try { const saved=JSON.parse(localStorage.getItem('weatherfield')||'null'); if(saved && Number.isFinite(saved.place?.latitude)&&Number.isFinite(saved.place?.longitude))place=saved.place;if(saved?.unit==='C')unit='C'; } catch{}
const finite = x => typeof x==='number' && Number.isFinite(x);
const fmt = (x,d=0) => finite(x)?x.toFixed(d):'—';
const temp = x => finite(x)?Math.round(unit==='F'?x*9/5+32:x)+'°':'—';
const amount = x => finite(x)?(unit==='F'?(x/25.4).toFixed(2)+' in':x.toFixed(1)+' mm'):'—';
function save(){try{localStorage.setItem('weatherfield',JSON.stringify({place,unit}));}catch{}}
function localDate(ms=Date.now()){return new Intl.DateTimeFormat('en-CA',{timeZone:weather?.timezone||place.timezone||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(ms);}
function dateLabel(s,options={month:'short',day:'numeric'}){return new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{...options,timeZone:'UTC'});}
function timeLabel(t,precise=false){return new Date(t*1000).toLocaleTimeString('en-US',{hour:'numeric',...(precise?{minute:'2-digit'}:{}),timeZone:weather?.timezone||place.timezone||'UTC'});}
function dayFromUnix(t){return new Intl.DateTimeFormat('en-CA',{timeZone:weather.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(t*1000);}
function shiftDay(s,n){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function condition(c){if(!finite(c))return 'Conditions unavailable';if(c===0)return 'Clear skies';if(c==1)return 'Few clouds';if(c==2)return 'Partly cloudy';if(c===3)return 'Overcast';if(c<=48)return 'Foggy';if(c<=57)return 'Drizzle';if(c<=67)return 'Rain';if(c<=77)return 'Snow';if(c<=82)return 'Rain showers';if(c<=86)return 'Snow showers';return 'Thunderstorms';}
function isNight(t){
  if(!weather || !finite(t)) return false;
  const d=weather.daily, index=d.time.findIndex(day=>dayFromUnix(day)===dayFromUnix(t));
  const sunrise=d.sunrise?.[index], sunset=d.sunset?.[index];
  if(!finite(sunrise) || !finite(sunset)) return false;
  return t < sunrise || t >= sunset;
}
function icon(c,t){const sun=finite(c)&&c<=2, night=sun&&isNight(t), rain=finite(c)&&c>=51;return `<svg class="weather-icon ${night?'moon-icon':sun?'':rain?'rainy':'cloudy'}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${night?'<path d="M25 21A12 12 0 0 1 11 5a12 12 0 1 0 14 16Z" fill="#dce7f7"/>':sun?'<circle cx="16" cy="16" r="6" fill="#f7d887"/><path d="M16 2v4m0 20v4M2 16h4m20 0h4M6 6l3 3m14 14 3 3M6 26l3-3M23 9l3-3"/>':'<path fill="#e8eff3" d="M8 23a6 6 0 0 1-1-12 8 8 0 0 1 15-1 6.5 6.5 0 0 1 1 13Z"/>'}${rain?'<path d="m10 26-1 3m8-3-1 3m8-3-1 3"/>':''}</svg>`;}
function currentIconName(code,t){
  const night=isNight(t);
  if(!finite(code)) return 'not-available';
  if(code===0) return night?'clear-night':'clear-day';
  if(code===1) return night?'lightly-cloudy-night':'lightly-cloudy-day';
  if(code===2) return night?'partly-cloudy-night':'partly-cloudy-day';
  if(code===3) return 'cloudy';
  if(code===45 || code===48) return 'fog';
  if(code===56 || code===57 || code===66 || code===67) return 'sleet';
  if(code>=51 && code<=55) return 'rain';
  if((code>=61 && code<=65) || (code>=80 && code<=82)) return 'rain';
  if((code>=71 && code<=77) || code===85 || code===86) return 'snow';
  if(code>=95 && code<=99) return 'thunderstorms';
  return 'not-available';
}
function renderCurrentIcon(code,t){
  const name=currentIconName(code,t);
  if(name==='not-available'){document.querySelector('.weather-art').replaceChildren();return;}
  const image=document.createElement('img');
  image.className='current-weather-icon current-weather-icon--'+name;
  image.src='icons/'+name+'.png';
  image.alt='';
  image.width=300;image.height=300;
  document.querySelector('.weather-art').replaceChildren(image);
}

async function getJSON(url,params={},signal){const response=await fetch(url+'?'+new URLSearchParams(params),{signal:signal||AbortSignal.timeout(25000)});if(!response.ok)throw Error('Data service returned '+response.status);const data=await response.json();if(data.error)throw Error(data.reason||'Data unavailable');return data;}
function notice(message){$('notice').hidden=!message;$('notice').textContent=message;}
function unitUI(){for(const [id,u] of [['fahrenheit','F'],['celsius','C']]){$(id).classList.toggle('active',unit===u);$(id).setAttribute('aria-pressed',unit===u);}}
function renderWeather(){unitUI();if(!weather)return;const c=weather.current,d=weather.daily;const index=Math.max(0,d.time.findIndex(t=>dayFromUnix(t)===dayFromUnix(c.time)));$('temperature').textContent=temp(c.temperature_2m);renderCurrentIcon(c.weather_code,c.time);$('condition').textContent=condition(c.weather_code);$('feels').textContent='Feels like '+temp(c.apparent_temperature);$('highlow').replaceChildren(document.createTextNode('H '+temp(d.temperature_2m_max[index])));const low=document.createElement('span');low.textContent='L '+temp(d.temperature_2m_min[index]);$('highlow').append(low);$('wind').textContent=finite(c.wind_speed_10m)?fmt(unit==='F'?c.wind_speed_10m/1.609344:c.wind_speed_10m)+' '+(unit==='F'?'mph':'km/h'):'—';$('humidity').textContent=fmt(c.relative_humidity_2m)+(finite(c.relative_humidity_2m)?'%':'');$('chance').textContent=fmt(d.precipitation_probability_max[index])+'%';$('sunrise').textContent=timeLabel(d.sunrise[index],true);$('sunset').textContent=timeLabel(d.sunset[index],true);$('updated').textContent='Conditions as of '+timeLabel(c.time,true)+' · '+weather.timezone.replaceAll('_',' ');$('date').textContent=new Date(c.time*1000).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:weather.timezone});renderForecast();}
function renderForecast(){if(!weather)return;const h=weather.hourly,d=weather.daily;let html='';if(view==='hourly'){const first=Math.max(0,h.time.findIndex(t=>t>=Math.floor(weather.current.time/3600)*3600));for(let i=first;i<Math.min(first+24,h.time.length);i++)html+=`<div class="forecast-cell" title="${condition(h.weather_code[i])}"><span class="time">${i===first?'Now':timeLabel(h.time[i])}</span>${icon(h.weather_code[i],i===first?weather.current.time:h.time[i])}<strong>${temp(h.temperature_2m[i])}</strong><span class="probability">${finite(h.precipitation_probability[i])?h.precipitation_probability[i]+'%':'—'}</span></div>`;}else{const today=dayFromUnix(weather.current.time);const first=d.time.findIndex(t=>dayFromUnix(t)===today);for(let i=Math.max(0,first);i<Math.min(first+10,d.time.length);i++)html+=`<div class="forecast-cell" title="${condition(d.weather_code[i])}"><span class="time">${i===first?'Today':dateLabel(dayFromUnix(d.time[i]),{weekday:'short',day:'numeric'})}</span>${icon(d.weather_code[i])}<strong>${temp(d.temperature_2m_max[i])}<small>${temp(d.temperature_2m_min[i])}</small></strong><span class="probability">${finite(d.precipitation_probability_max[i])?d.precipitation_probability_max[i]+'%':'—'}</span></div>`;}$('forecast').innerHTML=html;$('forecast-caption').textContent=view==='hourly'?'Next 24 hours · Local time':'Daily high / low · Local time';}
function renderHistory(){const n=Number($('range').value),rows=history.slice(-n);if(rows.length!==n||rows.some(r=>!finite(r.value))){$('rain-total').textContent='—';$('rain-chart').innerHTML='<p class="empty">History unavailable. Try refreshing data.</p>';for(const id of ['rain-week','rain-max','rain-days','rain-start','rain-end'])$(id).textContent='—';return;}const sum=rows.reduce((a,r)=>a+r.value,0);$('rain-total').textContent=amount(sum);$('rain-description').textContent=n+' completed days, through '+dateLabel(rows.at(-1).date);const max=Math.max(.5,...rows.map(r=>r.value));$('rain-chart').replaceChildren(...rows.map(r=>{const b=document.createElement('button');b.className='rain-bar';b.type='button';b.title=dateLabel(r.date)+': '+amount(r.value);b.setAttribute('aria-label',b.title);const bar=document.createElement('i');bar.style.height=(r.value/max*100)+'%';b.append(bar);b.onclick=()=>{$('rain-description').textContent=b.title;};return b;}));$('rain-start').textContent=dateLabel(rows[0].date);$('rain-end').textContent=dateLabel(rows.at(-1).date);$('rain-week').textContent=amount(history.slice(-7).reduce((a,r)=>a+r.value,0));const wettest=rows.reduce((a,b)=>a.value>b.value?a:b);$('rain-max').textContent=amount(wettest.value);$('rain-max').title=dateLabel(wettest.date);$('rain-days').textContent=rows.filter(r=>r.value>0).length+' of '+n;}
function renderAir(){const c=air?.current;if(!finite(c?.us_aqi)){$('aqi').textContent='—';$('aqi-label').textContent='Unavailable';$('aqi-description').textContent='Air quality could not be loaded. Try refreshing.';$('aqi-marker').style.display='none';for(const id of ['pm25','pm10','ozone'])$(id).textContent='—';return;}const a=c.us_aqi;const group=a<=50?['Good','Air quality is satisfactory.','#618674','#eaf4ed']:a<=100?['Moderate','Some pollutants may affect unusually sensitive people.','#8c7c36','#f8f2dc']:a<=150?['Unhealthy for sensitive groups','Sensitive groups may be affected. Check local guidance.','#a97644','#fcf0e3']:a<=200?['Unhealthy','Air quality may affect everyone. Check local guidance.','#a95f65','#f9e9eb']:a<=300?['Very unhealthy','Health alert. Check local air quality guidance.','#8d6394','#f3eaf5']:['Hazardous','Health warning. Check local air quality guidance.','#87516a','#f6e7ee'];$('aqi').textContent=Math.round(a);$('aqi-label').textContent=group[0];$('aqi-label').style.color=group[2];$('aqi-label').style.background=group[3];$('aqi-description').textContent=group[1];$('aqi-marker').style.display='block';$('aqi-marker').style.left=Math.min(99,a/300*100)+'%';$('pm25').textContent=fmt(c.pm2_5,1);$('pm10').textContent=fmt(c.pm10,1);$('ozone').textContent=fmt(c.ozone,1);$('air-note').textContent='Modeled air quality · Open-Meteo & CAMS · '+timeLabel(c.time)+'. Regional estimates may differ from local monitors.';}
async function load(){const id=++requestId;weather=null;air=null;history=[];notice('');$('location').textContent=[place.name,place.admin1||place.country].filter(Boolean).join(', ');$('date').textContent='Getting the latest weather…';$('temperature').textContent='—°';$('condition').textContent='Updating conditions';$('feels').textContent='Fetching the latest model data.';for(const key of ['wind','humidity','chance','sunrise','sunset','highlow'])$(key).textContent='—';$('forecast').innerHTML='<p class="empty">Loading your forecast…</p>';renderHistory();$('rain-chart').innerHTML='<p class="empty">Loading precipitation history…</p>';renderAir();$('aqi-label').textContent='Loading';$('aqi-description').textContent='Checking local air quality.';$('refresh').disabled=true;const isWenonah=place.name==='Wenonah';$('precip-link').hidden=!isWenonah;$('accu-link').hidden=!isWenonah;save();const errors=[];const base={latitude:place.latitude,longitude:place.longitude,timezone:'auto'};
const forecastTask=getJSON('https://api.open-meteo.com/v1/forecast',{...base,current:'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',hourly:'temperature_2m,precipitation_probability,weather_code',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset,precipitation_sum',past_days:7,forecast_days:10,timeformat:'unixtime'}).then(data=>{if(id!==requestId)return null;weather=data;renderWeather();return data;}).catch(()=>{if(id===requestId){errors.push('Forecast unavailable');$('condition').textContent='Weather unavailable';$('feels').textContent='Try refreshing in a moment.';$('forecast').innerHTML='<p class="empty">Forecast could not be loaded. Try refreshing data.</p>';$('date').textContent='Weather service is unavailable.';}return null;});
const airTask=getJSON('https://air-quality-api.open-meteo.com/v1/air-quality',{...base,current:'us_aqi,pm2_5,pm10,ozone',timeformat:'unixtime'}).then(data=>{if(id===requestId){air=data;renderAir();}}).catch(()=>{if(id===requestId){errors.push('Air quality unavailable');renderAir();}});
const historyTask=(async()=>{const f=await forecastTask;if(id!==requestId)return;const today=f?dayFromUnix(f.current.time):localDate(),start=shiftDay(today,-30),end=shiftDay(today,-5);try{const archive=await getJSON('https://archive-api.open-meteo.com/v1/archive',{...base,start_date:start,end_date:end,daily:'precipitation_sum'});if(id!==requestId)return;const rows=new Map();archive.daily.time.forEach((d,i)=>rows.set(d,archive.daily.precipitation_sum[i]));if(f)f.daily.time.forEach((t,i)=>{const d=dayFromUnix(t);if(d>end&&d<today)rows.set(d,f.daily.precipitation_sum[i]);});history=Array.from({length:30},(_,i)=>{const date=shiftDay(start,i);return{date,value:rows.get(date)};});if(history.some(r=>!finite(r.value)))errors.push('Some precipitation history is unavailable');renderHistory();}catch{if(id===requestId){errors.push('Precipitation history unavailable');renderHistory();}}})();await Promise.allSettled([forecastTask,airTask,historyTask]);if(id!==requestId)return;$('refresh').disabled=false;notice(errors.length?errors.join('. ')+'. Use Refresh data to try again.':'');}
for(const [id,u] of [['fahrenheit','F'],['celsius','C']])$(id).onclick=()=>{unit=u;save();unitUI();renderWeather();renderHistory();};for(const mode of ['hourly','daily'])$(mode).onclick=()=>{view=mode;for(const id of ['hourly','daily']){$(id).classList.toggle('active',id===mode);$(id).setAttribute('aria-pressed',id===mode);}renderForecast();};$('range').onchange=renderHistory;$('refresh').onclick=load;
$('query').oninput=()=>{searchId++;$('results').hidden=true;};$('search').onsubmit=async e=>{e.preventDefault();const q=$('query').value.trim();if(q.length<2)return;const id=++searchId;$('results').hidden=false;$('results').textContent='Searching…';try{const data=await getJSON('https://geocoding-api.open-meteo.com/v1/search',{name:q,count:7,language:'en',format:'json',...(/^\d{5}$/.test(q)?{countryCode:'US'}:{})});if(id!==searchId)return;$('results').replaceChildren();if(!data.results?.length){const p=document.createElement('p');p.textContent='No locations found. Try a nearby city.';$('results').append(p);return;}for(const p of data.results){const b=document.createElement('button');b.type='button';b.textContent=p.name;const s=document.createElement('small');s.textContent=[p.admin1,p.country].filter(Boolean).join(', ');b.append(s);b.onclick=()=>{place=p;$('results').hidden=true;$('query').value='';load();};$('results').append(b);}}catch{if(id===searchId)$('results').textContent='Search unavailable. Try again in a moment.';}};
document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))$('results').hidden=true;});$('query').onkeydown=e=>{if(e.key==='Escape')$('results').hidden=true;};$('locate').onclick=()=>{if(!navigator.geolocation){notice('Location is not supported in this browser. Search for a city or ZIP code.');return;}$('locate').disabled=true;$('locate').textContent='Finding your location…';navigator.geolocation.getCurrentPosition(p=>{place={name:'Your location',latitude:p.coords.latitude,longitude:p.coords.longitude};$('locate').disabled=false;$('locate').textContent='⌖ Use my location';load();},()=>{$('locate').disabled=false;$('locate').textContent='⌖ Use my location';notice('Location access is unavailable. Search for a city or ZIP code instead.');},{timeout:12000,maximumAge:300000});};unitUI();startFromURL();

async function startFromURL() {
  const pathZIP = location.pathname.match(/\/(\d{5})\/?$/)?.[1];
  // Query-string URLs also work on servers without rewrite support.
  const queryZIP = new URLSearchParams(location.search).get('zip');
  const zip = pathZIP || (/^\d{5}$/.test(queryZIP || '') ? queryZIP : null);
  if (!zip) { await load(); return; }
  $('location').textContent = 'ZIP code ' + zip;
  $('date').textContent = 'Finding this location…';
  const initialRequest = requestId, initialSearch = searchId;
  let message = '';
  try {
    const data = await getJSON('https://geocoding-api.open-meteo.com/v1/search', {
      name: zip, countryCode: 'US', count: 1, language: 'en', format: 'json'
    });
    // A manual location change takes priority over an in-flight ZIP lookup.
    if (requestId !== initialRequest || searchId !== initialSearch) return;
    const result = data.results?.[0];
    if (result && finite(result.latitude) && finite(result.longitude)) place = result;
    else message = 'No location found for ZIP code ' + zip + '. Showing your saved or default location. Search for a city or ZIP code.';
  } catch {
    if (requestId !== initialRequest || searchId !== initialSearch) return;
    message = 'Could not look up ZIP code ' + zip + '. Showing your saved or default location. Try reloading this page or search for a city.';
  }
  await load();
  if (message && requestId === initialRequest + 1) {
    notice([message, $('notice').hidden ? '' : $('notice').textContent].filter(Boolean).join(' '));
  }
}
