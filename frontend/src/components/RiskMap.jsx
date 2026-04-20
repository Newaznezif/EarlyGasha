import React, { useContext } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ThemeContext } from '../context/ThemeContext';

const RiskMap = ({ data, alerts = [], simplifiedMode = false, onRegionSelect, selectedRegion }) => {
  const { isDark } = useContext(ThemeContext);
  const center = [5.0, 38.0]; // Central East Africa
  
  // Calculate raw dynamic color interpolation instead of static categorical thresholds
  const getColor = (score) => {
    const hue = Math.max(0, 120 - (score * 1.2));
    return `hsl(${hue}, 85%, 45%)`;
  };

  const tileUrl = isDark 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={center} 
        zoom={5} 
        scrollWheelZoom={false}
        className="w-full h-full rounded-2xl z-0"
        style={{ height: '100%', width: '100%', minHeight: '500px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />
        {data.map((region, idx) => {
          const regionAlert = alerts.find(a => a.region.toLowerCase() === region.region.toLowerCase());
          const hasCriticalAlerts = alerts.some(a => a.alert_level === 'CRITICAL');
          const isThisCritical = regionAlert?.alert_level === 'CRITICAL';
          
          let alertClass = '';
          if (!simplifiedMode) {
              alertClass = isThisCritical ? 'marker-critical' : 
                                 regionAlert?.alert_level === 'HIGH' ? 'marker-high' : 
                                 regionAlert?.alert_level === 'WATCH' ? 'marker-watch' : '';
          }

          // Visual Hierarchy: Dim non-critical regions if there is an active crisis
          let targetOpacity = isThisCritical ? 0.8 : 0.6;
          
          // Instant Focus Behavior
          if (selectedRegion && selectedRegion.region !== region.region) {
              targetOpacity = 0.2; // Dim unselected strongly
          } else if (hasCriticalAlerts && !isThisCritical && !simplifiedMode && !selectedRegion) {
              targetOpacity = 0.3; // Crisis focus mode
          } else if (selectedRegion && selectedRegion.region === region.region) {
              targetOpacity = 1.0; // Max brightness
              alertClass += ' marker-focus-pulse';
          }

          return (
            <CircleMarker
              key={idx}
              center={[region.lat, region.lon]}
              pathOptions={{ 
                color: isThisCritical ? '#ef4444' : getColor(region.score), 
                fillColor: isThisCritical ? '#ef4444' : getColor(region.score), 
                fillOpacity: targetOpacity,
                weight: alertClass || (selectedRegion && selectedRegion.region === region.region) ? 4 : 2,
                className: `transition-all duration-300 ${alertClass}`
              }}
              radius={10 + (region.score / 10)}
              eventHandlers={{
                click: () => onRegionSelect(region),
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                 <div className="flex items-center gap-2 p-1 font-sans">
                    <span className="font-bold text-xs uppercase">{region.region}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${regionAlert ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 text-slate-800'}`}>
                        {region.score.toFixed(0)}%
                    </span>
                 </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default RiskMap;
