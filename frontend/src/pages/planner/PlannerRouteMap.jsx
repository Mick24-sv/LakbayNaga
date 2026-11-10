import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function PlannerRouteMap({ stops, day }) {
  const container = useRef(null);

  useEffect(() => {
    const located = stops
      .map((stop, index) => ({ ...stop, number: index + 1 }))
      .filter(stop => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
    if (!container.current || !located.length) return;

    const map = L.map(container.current, {
      scrollWheelZoom: false,
      // Day changes can unmount the map while a zoom is in progress.
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const coordinates = located.map(stop => [stop.lat, stop.lng]);
    for (const stop of located) {
      const label = document.createElement('span');
      label.textContent = stop.number + '. ' + stop.name;
      L.marker([stop.lat, stop.lng], {
        title: stop.number + '. ' + stop.name,
        icon: L.divIcon({
          className: 'planner-route-marker',
          html: '<span>' + stop.number + '</span>',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(map).bindPopup(label);
    }
    if (coordinates.length > 1) {
      L.polyline(coordinates, {
        color: '#c0392b', weight: 3, dashArray: '6 6',
      }).addTo(map);
    }
    const bounds = L.latLngBounds(coordinates);
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15, animate: false });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [stops]);

  return (
    <div
      ref={container}
      className="planner-route-map"
      role="region"
      aria-label={'Interactive map for day ' + day}
    />
  );
}
