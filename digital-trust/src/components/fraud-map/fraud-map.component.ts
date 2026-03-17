import { Component, AfterViewInit, OnDestroy, Input, ElementRef, ViewChild } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-fraud-map',
  templateUrl: './fraud-map.component.html',
  styleUrls: ['./fraud-map.component.css']
})
export class FraudMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;
  @Input() locations: { lat: number; lon: number; transactions?: number }[] = [];

  private map: L.Map | undefined;
  private markers: L.LayerGroup | undefined;

  ngAfterViewInit(): void {
    // init map
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [0, 0],
      zoom: 2
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.markers = L.layerGroup().addTo(this.map);

    this.renderLocations();
  }

  renderLocations(): void {
    if (!this.map || !this.markers) {
      return;
    }

    this.markers.clearLayers();

    for (const loc of this.locations) {
      const marker = L.circleMarker([loc.lat, loc.lon], {
        radius: Math.min(20, Math.max(5, (loc.transactions ?? 1) / 5)),
        color: '#ff3333'
      });
      marker.bindPopup(`Transactions: ${loc.transactions ?? 0}`);
      this.markers.addLayer(marker);
    }
  }

  // safe eachLayer typing
  clearMapLayers(): void {
    if (!this.map) return;
    this.map.eachLayer((layer: L.Layer) => {
      // keep tile layers, remove markers layer group
      if (this.markers && layer === this.markers) return;
      // otherwise remove if it's not the tile layer (simple heuristic)
      // (this avoids removing default tile layer)
      // For more control, track your own added layers and remove them explicitly.
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.markers = undefined;
    }
  }
}