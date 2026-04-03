// src/systems/weather.js
// Global weather and wind system affecting sailing mechanics

import * as THREE from 'three';

export class WindSystem {
  constructor(updateInterval = 2000) {
    // Wind vector (x, z) represents direction and speed
    this.direction = new THREE.Vector2(1, 0); // Unit vector pointing wind direction
    this.speed = 10; // Wind speed in units/second
    this.baseSpeed = 10;
    this.maxSpeed = 20;
    this.minSpeed = 2;

    // Wind variation over time
    this.time = 0;
    this.updateInterval = updateInterval; // Milliseconds between wind updates
    this.lastUpdate = Date.now();
    this.windGust = 0; // Temporary speed variation

    // Seasonal/weather patterns
    this.season = 'summer'; // summer, fall, winter, spring
    this.weather = 'clear'; // clear, cloudy, stormy, calm
    this.weatherIntensity = 0; // 0-1

    // History for smooth transitions
    this.windHistory = [];
    this.maxHistoryPoints = 10;

    this.initializeWind();
  }

  initializeWind() {
    // Random initial wind direction
    const angle = Math.random() * Math.PI * 2;
    this.direction.set(Math.cos(angle), Math.sin(angle));
    this.direction.normalize();
    this.speed = this.baseSpeed + (Math.random() - 0.5) * 4;
  }

  update(delta) {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) {
      return;
    }

    this.lastUpdate = now;
    this.time += delta;

    // Gradual wind direction change (drift)
    const driftAngle = Math.sin(this.time * 0.3) * 0.02;
    const currentAngle = Math.atan2(this.direction.y, this.direction.x) + driftAngle;
    this.direction.set(Math.cos(currentAngle), Math.sin(currentAngle));
    this.direction.normalize();

    // Wind speed variation with gusts
    this.windGust = Math.sin(this.time * 0.5) * 2 + Math.sin(this.time * 1.3) * 1.5;
    this.speed = THREE.MathUtils.clamp(
      this.baseSpeed + this.windGust + this.weatherIntensity * 5,
      this.minSpeed,
      this.maxSpeed
    );

    // Record history for smoothing
    this.windHistory.push({
      direction: this.direction.clone(),
      speed: this.speed,
      timestamp: now
    });

    if (this.windHistory.length > this.maxHistoryPoints) {
      this.windHistory.shift();
    }
  }

  setWeather(weather, intensity = 0.5) {
    this.weather = weather;
    this.weatherIntensity = THREE.MathUtils.clamp(intensity, 0, 1);

    // Adjust wind characteristics based on weather
    switch (weather) {
      case 'calm':
        this.baseSpeed = 2;
        this.maxSpeed = 5;
        break;
      case 'clear':
        this.baseSpeed = 10;
        this.maxSpeed = 15;
        break;
      case 'cloudy':
        this.baseSpeed = 12;
        this.maxSpeed = 18;
        break;
      case 'stormy':
        this.baseSpeed = 18;
        this.maxSpeed = 25;
        break;
    }
  }

  setSeason(season) {
    this.season = season;
    // Seasons affect wind patterns subtly
    // (Can be expanded with seasonal weather effects)
  }

  getWindVector() {
    return this.direction.clone().multiplyScalar(this.speed);
  }

  getWindDirection() {
    return Math.atan2(this.direction.y, this.direction.x); // Radians
  }

  getWindDirectionDegrees() {
    return (this.getWindDirection() * 180) / Math.PI;
  }

  getWindSpeed() {
    return this.speed;
  }

  // Returns a value 0-1 indicating optimal heading given wind
  // 1 = perfect heading, 0 = sailing against wind (impossible)
  getWindAdvantage(shipHeading) {
    const windAngle = this.getWindDirection();
    const angleDiff = Math.abs(shipHeading - windAngle);
    
    // Normalize to 0-π
    let normalized = angleDiff % (Math.PI * 2);
    if (normalized > Math.PI) {
      normalized = Math.PI * 2 - normalized;
    }

    // Can't sail directly into wind (0-45 degrees = impossible)
    if (normalized < Math.PI / 4) {
      return 0;
    }

    // Optimal sailing is perpendicular to wind (90 degrees)
    return Math.cos(normalized - Math.PI / 2);
  }

  // Calculate acceleration bonus/penalty for ship physics
  getSpeedMultiplier(shipHeading, sailAngle) {
    const windAdvantage = this.getWindAdvantage(shipHeading);
    
    if (windAdvantage <= 0) {
      return 0; // Can't sail into wind
    }

    // Sail angle efficiency (0-1, where 1 = optimal angle)
    const sailAngleDiff = Math.abs(sailAngle - (this.getWindDirection() + Math.PI / 2));
    const sailEfficiency = Math.max(0, Math.cos(sailAngleDiff / 2));

    return windAdvantage * sailEfficiency;
  }

  getWeatherDescription() {
    const windSpeed = this.speed.toFixed(1);
    const windDir = Math.round(this.getWindDirectionDegrees());
    const direction = this.getCompassDirection(windDir);

    return {
      weather: this.weather,
      season: this.season,
      windSpeed: windSpeed,
      windDirection: direction,
      windDirectionDegrees: windDir,
      intensity: this.weatherIntensity.toFixed(2)
    };
  }

  getCompassDirection(degrees) {
    const directions = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
    ];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  dispose() {
    this.windHistory = [];
  }
}

export class Weather {
  constructor() {
    this.windSystem = new WindSystem();
    this.temperature = 20; // Celsius
    this.humidity = 65; // Percentage
    this.visibility = 1000; // Meters
    this.precipitation = 0; // 0-1
  }

  update(delta) {
    this.windSystem.update(delta);
  }

  getWeatherData() {
    return {
      wind: this.windSystem.getWeatherDescription(),
      temperature: this.temperature,
      humidity: this.humidity,
      visibility: this.visibility,
      precipitation: this.precipitation
    };
  }

  dispose() {
    this.windSystem.dispose();
  }
}

export default Weather;
