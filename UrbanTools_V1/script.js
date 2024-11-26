let map;
let service;
let infowindow;
let markers = [];
let currentLocation;
let searchCircle;
let locationMarker;
let spiderChart = null;
let heatmap = null;
let heatmapData = {};
let currentHeatmapType = null;
let analysisResults = null;
const OPENAI_API_KEY = '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';

// Aktualisierte Place-Types mit korrekten Google Places API Types
const facilityTypes = {
    'education': { 
        name: 'Bildung', 
        weight: 15, 
        minimum: 5, 
        searchType: 'school'
    },
    'food': { 
        name: 'Gastronomie', 
        weight: 10, 
        minimum: 10, 
        searchType: 'restaurant'
    },
    'shopping': { 
        name: 'Einkaufen', 
        weight: 15, 
        minimum: 5, 
        searchType: 'store'
    },
    'recreation': { 
        name: 'Erholung', 
        weight: 10, 
        minimum: 3, 
        searchType: 'park'
    },
    'transit': { 
        name: 'ÖPNV', 
        weight: 15, 
        minimum: 5, 
        searchType: ['transit_station', 'subway_station', 'train_station', 'bus_station']
    },
    'health': { 
        name: 'Gesundheit', 
        weight: 15, 
        minimum: 5, 
        searchType: 'doctor'
    },
    'culture': { 
        name: 'Kultur', 
        weight: 10, 
        minimum: 3, 
        searchType: 'point_of_interest'
    },
    'sports': { 
        name: 'Sport', 
        weight: 10, 
        minimum: 3, 
        searchType: 'gym'
    }
};

// Aktualisierte obsoleteTypes mit den neuen Nutzungskategorien
const obsoleteTypes = {
    'retail_small': { 
        name: 'Inhaber-geführter Einzelhandel', 
        searchType: 'store',
        weight: 15
    },
    'retail_large': { 
        name: 'Großflächiger Einzelhandel', 
        searchType: 'department_store',
        weight: 20
    },
    'shopping_mall': { 
        name: 'Shoppingmall', 
        searchType: 'shopping_mall',
        weight: 20
    },
    'department_store': { 
        name: 'Kaufhaus', 
        searchType: 'department_store',
        weight: 20
    },
    'exhibition': { 
        name: 'Messe', 
        searchType: 'point_of_interest',
        weight: 15
    },
    'cinema': { 
        name: 'Kino', 
        searchType: 'movie_theater',
        weight: 10
    },
    'manufacturing': { 
        name: 'Produzierendes Gewerbe', 
        searchType: 'industrial',
        weight: 25
    },
    'industry': { 
        name: 'Industrie', 
        searchType: 'industrial',
        weight: 25
    },
    'office': { 
        name: 'Bürogebäude', 
        searchType: 'office',
        weight: 20
    },
    'car_dealer': { 
        name: 'Autohaus', 
        searchType: 'car_dealer',
        weight: 15
    },
    'gas_station': { 
        name: 'Tankstelle', 
        searchType: 'gas_station',
        weight: 10
    },
    'parking_garage': { 
        name: 'Parkhaus', 
        searchType: 'parking',
        weight: 15
    },
    'parking': { 
        name: 'Parkplatz', 
        searchType: 'parking',
        weight: 15
    },
    'airport': { 
        name: 'Flughafen', 
        searchType: 'airport',
        weight: 30
    },
    'cemetery': { 
        name: 'Friedhof', 
        searchType: 'cemetery',
        weight: 10
    },
    'church': { 
        name: 'Kirche', 
        searchType: 'church',
        weight: 10
    },
    'military': { 
        name: 'Kaserne', 
        searchType: 'military',
        weight: 25
    },
    'old_factory': { 
        name: 'Gründerzeitfabrik', 
        searchType: 'industrial',
        weight: 25
    },
    'harbor': { 
        name: 'Hafenlogistik', 
        searchType: 'harbor',
        weight: 25
    }
};

// Aktualisierte initMap Funktion
function initMap() {
    // Startposition (München Zentrum)
    const munich = new google.maps.LatLng(48.137154, 11.576124);
    
    map = new google.maps.Map(document.getElementById('map'), {
        center: munich,
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true
    });

    infowindow = new google.maps.InfoWindow();
    service = new google.maps.places.PlacesService(map);

    // Klick-Event-Listener hinzufügen
    map.addListener('click', (event) => {
        setNewLocation(event.latLng);
    });

    // Initialisiere alle notwendigen Komponenten
    addHeatmapControls();
    initializeHeatmapData();
}

// Chat-Initialisierung direkt beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    initializeChatBot();
    console.log('ChatBot wurde initialisiert');
});

// Aktualisierte initializeChatBot Funktion
function initializeChatBot() {
    const sendButton = document.getElementById('send-button');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (!sendButton || !chatInput || !chatMessages) {
        console.error('Chat-Elemente nicht gefunden:', {
            sendButton: !!sendButton,
            chatInput: !!chatInput,
            chatMessages: !!chatMessages
        });
        return;
    }

    console.log('Chat-Elemente gefunden, füge Event-Listener hinzu');

    // Event-Listener für den Senden-Button
    sendButton.addEventListener('click', () => {
        console.log('Senden-Button geklickt');
        const message = chatInput.value.trim();
        if (message) {
            sendMessage();
        }
    });

    // Event-Listener für die Enter-Taste
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Enter-Taste gedrückt');
            const message = chatInput.value.trim();
            if (message) {
                sendMessage();
            }
        }
    });

    // Initialisiere das Chat-Messages-Div mit einer Begrüßung
    chatMessages.innerHTML = `
        <div class="chat-message bot-message">
            Willkommen! Ich bin Ihr Stadtplanungs-Assistent. 
            Bitte wählen Sie zuerst einen Standort auf der Karte und führen Sie eine Analyse durch. 
            Danach kann ich Ihnen Fragen zu den Analyseergebnissen beantworten.
        </div>
    `;

    console.log('ChatBot wurde vollständig initialisiert');
}

function setNewLocation(latLng) {
    currentLocation = latLng;
    clearMarkers();
    
    // Vorherige Visualisierungen entfernen
    if (searchCircle) searchCircle.setMap(null);
    if (locationMarker) locationMarker.setMap(null);
    
    // Neuen Hauptmarker setzen
    locationMarker = new google.maps.Marker({
        position: currentLocation,
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
        }
    });

    // Neuen Suchkreis erstellen
    searchCircle = new google.maps.Circle({
        map: map,
        center: currentLocation,
        radius: 1250, // 15-Minuten Gehradius
        fillColor: '#4285F4',
        fillOpacity: 0.1,
        strokeColor: '#4285F4',
        strokeWeight: 1
    });

    // Karte auf den Suchbereich zentrieren
    map.fitBounds(searchCircle.getBounds());
}

function searchNearbyPlaces(type) {
    return new Promise(async (resolve) => {
        // Wenn type ein Array ist (für ÖPNV), suche nach allen Types
        if (Array.isArray(type)) {
            let allResults = [];
            for (const subType of type) {
                const request = {
                    location: currentLocation,
                    radius: 1250,
                    type: subType
                };

                try {
                    const results = await new Promise((innerResolve) => {
                        service.nearbySearch(request, (results, status) => {
                            console.log(`Suche für ${subType}:`, status);
                            if (status === google.maps.places.PlacesServiceStatus.OK) {
                                innerResolve(results);
                            } else {
                                innerResolve([]);
                            }
                        });
                    });
                    allResults = [...allResults, ...results];
                } catch (error) {
                    console.error(`Fehler bei ${subType}:`, error);
                }
                
                // Kurze Pause zwischen den Anfragen
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // Entferne Duplikate basierend auf place_id
            const uniqueResults = Array.from(new Set(allResults.map(r => r.place_id)))
                .map(id => allResults.find(r => r.place_id === id));
            
            console.log(`Gefundene ÖPNV-Stationen insgesamt:`, uniqueResults.length);
            resolve(uniqueResults);
        } else {
            // Bisherige Logik für einzelne Types
            const request = {
                location: currentLocation,
                radius: 1250,
                type: type
            };

            service.nearbySearch(request, (results, status) => {
                console.log(`Suche für ${type}:`, status);
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(results);
                } else {
                    resolve([]);
                }
            });
        }
    });
}

// Verbesserte Funktion zur Berechnung der urbanen Aktivität
async function adjustRequirementsBasedOnDensity(location) {
    try {
        const radius = 1250; // 15-Minuten Radius
        const area = Math.PI * Math.pow(radius/1000, 2); // Fläche in km²

        // Verschiedene Aktivitätsindikatoren abfragen
        const [restaurants, shops, transitStations, entertainment] = await Promise.all([
            searchNearbyPlaces('restaurant'),
            searchNearbyPlaces(['store', 'shopping_mall', 'supermarket']),
            searchNearbyPlaces(['transit_station', 'subway_station', 'train_station']),
            searchNearbyPlaces(['bar', 'cafe', 'movie_theater', 'gym'])
        ]);

        // Gewichtete Berechnung der urbanen Aktivität
        const restaurantActivity = restaurants.length / area * 0.3;
        const retailActivity = shops.length / area * 0.25;
        const transitActivity = transitStations.length / area * 0.25;
        const entertainmentActivity = entertainment.length / area * 0.2;

        // Kombinierter Aktivitätsindex
        const activityIndex = (
            restaurantActivity +
            retailActivity +
            transitActivity +
            entertainmentActivity
        ) * 10; // Skalierungsfaktor

        console.log('Aktivitätsberechnung:', {
            restaurantActivity: restaurantActivity.toFixed(2),
            retailActivity: retailActivity.toFixed(2),
            transitActivity: transitActivity.toFixed(2),
            entertainmentActivity: entertainmentActivity.toFixed(2),
            activityIndex: activityIndex.toFixed(2)
        });

        // Angepasste Schwellenwerte basierend auf realer Aktivität
        let densityFactor;
        if (activityIndex > 40) {          // Sehr hohe Aktivität (Innenstadtlage)
            densityFactor = 2.5;
        } else if (activityIndex > 25) {    // Hohe Aktivität (urbane Lage)
            densityFactor = 1.5;
        } else if (activityIndex > 15) {    // Mittlere Aktivität (Stadtrandlage)
            densityFactor = 1.0;
        } else {                            // Geringe Aktivität (Vorort/ländlich)
            densityFactor = 0.5;
        }

        console.log(`Aktivitätsindex: ${activityIndex.toFixed(2)}, Faktor: ${densityFactor}`);

        // Anpassung der Mindestanforderungen
        Object.keys(facilityTypes).forEach(key => {
            const baseMinimum = {
                'education': 2,
                'food': 4,
                'shopping': 2,
                'recreation': 1,
                'transit': 2,
                'health': 2,
                'culture': 1,
                'sports': 1
            }[key];

            facilityTypes[key].minimum = Math.round(baseMinimum * densityFactor);
            console.log(`${facilityTypes[key].name}: Minimum angepasst auf ${facilityTypes[key].minimum}`);
        });

        return {
            density: activityIndex,
            factor: densityFactor
        };
    } catch (error) {
        console.error('Fehler bei der Aktivitätsberechnung:', error);
        return null;
    }
}

// Aktualisierte Funktion zur Kategorisierung der Aktivität
function getDensityCategory(activity) {
    if (activity > 40) {
        return "Innenstadtlage (sehr hohe Aktivität)";
    } else if (activity > 25) {
        return "Urbane Lage (hohe Aktivität)";
    } else if (activity > 15) {
        return "Stadtrandlage (mittlere Aktivität)";
    } else {
        return "Vorort/ländliche Lage (geringe Aktivität)";
    }
}

// Aktualisierte analyzeLocation Funktion
async function analyzeLocation() {
    if (!currentLocation) {
        alert('Bitte wählen Sie zuerst einen Standort auf der Karte aus.');
        return;
    }

    document.getElementById('total-score').innerHTML = 'Analysiere...';
    document.getElementById('facility-counts').innerHTML = '';
    clearMarkers();

    // Zuerst die Mindestanforderungen anpassen
    const densityInfo = await adjustRequirementsBasedOnDensity(currentLocation);
    
    // Informationen zur Dichte anzeigen
    const densityText = densityInfo ? `
        <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
            <strong>Gebietseinstufung:</strong><br>
            ${getDensityCategory(densityInfo.density)}<br>
            <small>Anforderungen wurden an die lokale Dichte angepasst</small>
        </div>
    ` : '';
    
    document.getElementById('facility-counts').innerHTML = densityText;

    // Rest der Analyse durchführen...
    const results = {};
    for (const [key, config] of Object.entries(facilityTypes)) {
        try {
            console.log(`Suche nach: ${config.name} (${config.searchType})`);
            const facilities = await searchNearbyPlaces(config.searchType);
            results[key] = facilities;
            facilities.forEach(place => createMarker(place, key));
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error(`Fehler bei ${key}:`, error);
            results[key] = [];
        }
    }

    calculateAndDisplayScore(results);
}

// Aktualisierte calculateAndDisplayScore Funktion
function calculateAndDisplayScore(results) {
    let totalScore = 0;
    let html = '<div class="score-card">';

    for (const [key, facilities] of Object.entries(results)) {
        const config = facilityTypes[key];
        const count = facilities.length;
        
        // Neue Score-Berechnung mit Obergrenze
        // Wenn mehr als das Doppelte des Minimums vorhanden ist, wird es nicht mehr höher bewertet
        const maxCount = config.minimum * 2;
        let typeScore = Math.min(count, maxCount) / config.minimum * config.weight;
        typeScore = Math.min(typeScore, config.weight); // Begrenzt auf maximales Gewicht
        
        console.log(`
            Kategorie: ${config.name}
            Gefunden: ${count}
            Minimum: ${config.minimum}
            Maximum bewertet: ${maxCount}
            Gewichtung: ${config.weight}
            Teilscore: ${typeScore}
        `);
        
        totalScore += typeScore;

        // Angepasste Farbgebung
        const fulfillmentPercentage = Math.min((count / config.minimum * 100), 200);
        const color = fulfillmentPercentage >= 200 ? '#4CAF50' : 
                     fulfillmentPercentage >= 100 ? '#8BC34A' :
                     fulfillmentPercentage >= 50 ? '#FFA726' : '#F44336';

        html += `
            <div class="facility-count">
                <strong>${config.name}:</strong> ${count} gefunden 
                <span style="color: ${color}">
                    (Score: ${typeScore.toFixed(1)} von ${config.weight})
                </span>
                <br>
                <small>Mindestanzahl: ${config.minimum} (Optimal: ${config.minimum}-${maxCount})</small>
            </div>
        `;
    }
    html += '</div>';

    console.log('Finaler Gesamtscore:', totalScore);

    const totalColor = totalScore >= 80 ? '#4CAF50' : totalScore >= 50 ? '#FFA726' : '#F44336';
    
    document.getElementById('total-score').innerHTML = `
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px; color: ${totalColor}">
            ${totalScore.toFixed(1)} / 100 Punkte
        </div>
        <div style="font-size: 16px; color: #666;">15-Minuten-Stadt Score</div>
    `;
    document.getElementById('facility-counts').innerHTML = html;

    // Spider-Diagramm-Daten
    const spiderData = {
        current: Object.entries(results).map(([key, facilities]) => 
            (facilities.length / facilityTypes[key].minimum * 100).toFixed(1)
        ),
        ideal: Object.values(facilityTypes).map(() => 100)
    };
    createSpiderChart(spiderData);

    // 15-Minuten-Stadt Empfehlungen
    const recommendations15Min = generate15MinRecommendations(results);
    const recommendationsElement = document.getElementById('recommendations-content');
    recommendationsElement.innerHTML = `
        <div class="score-card">
            <h4>Handlungsempfehlungen für 15-Minuten-Stadt:</h4>
            ${recommendations15Min.map(rec => `<p>• ${rec}</p>`).join('')}
        </div>
    `;

    // Speichere die Analyseergebnisse für den ChatBot
    analysisResults = results;

    // Neue Funktion für das Balkendiagramm
    createBarChart(results);

    // Neue Funktion für die Nutzungsverteilung
    createUsageDistributionChart(results);
}

function createMarker(place, categoryKey) {
    // Farben für die Kategorien (nicht für die searchTypes)
    const colors = {
        'education': '#FF0000',
        'food': '#00FF00',
        'shopping': '#0000FF',
        'recreation': '#00FF00',
        'transit': '#FFD700',
        'health': '#FF69B4',
        'culture': '#FFA500',
        'sports': '#8B4513'
    };

    const marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        title: place.name,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: colors[categoryKey] || '#FF0000',
            fillOpacity: 0.7,
            strokeWeight: 1,
            strokeColor: '#FFFFFF'
        }
    });

    markers.push(marker);

    google.maps.event.addListener(marker, 'click', () => {
        const content = `
            <div>
                <strong>${place.name}</strong><br>
                ${place.vicinity || ''}<br>
                <small>Kategorie: ${facilityTypes[categoryKey].name}</small>
            </div>
        `;
        infowindow.setContent(content);
        infowindow.open(map, marker);
    });
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// Spider-Diagramm-Konfiguration
function createSpiderChart(data) {
    const ctx = document.getElementById('spiderChart').getContext('2d');
    
    if (spiderChart) {
        spiderChart.destroy();
    }

    spiderChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.values(facilityTypes).map(type => type.name),
            datasets: [{
                label: 'Aktuelle Situation',
                data: data.current,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgb(54, 162, 235)',
                pointBackgroundColor: 'rgb(54, 162, 235)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(54, 162, 235)'
            }, {
                label: 'Ideale Situation',
                data: data.ideal,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgb(255, 99, 132)',
                pointBackgroundColor: 'rgb(255, 99, 132)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(255, 99, 132)'
            }]
        },
        options: {
            elements: {
                line: {
                    borderWidth: 3
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
}

// Neue Funktion für 15-Minuten-Stadt Empfehlungen
function generate15MinRecommendations(results) {
    let recommendations = [];
    const weakCategories = [];

    // Schwache Kategorien identifizieren
    for (const [key, facilities] of Object.entries(results)) {
        const config = facilityTypes[key];
        if (facilities.length < config.minimum) {
            weakCategories.push(config.name);
        }
    }

    if (weakCategories.length > 0) {
        recommendations.push(`Defizite in: ${weakCategories.join(', ')}`);
        
        // Detaillierte Empfehlungen pro Kategorie
        weakCategories.forEach(category => {
            switch(category) {
                case 'Bildung':
                    recommendations.push("➤ Neue Bildungseinrichtungen oder Co-Learning Spaces");
                    break;
                case 'Gesundheit':
                    recommendations.push("➤ Zusätzliche Gesundheitsversorgung erforderlich");
                    break;
                case 'ÖPNV':
                    recommendations.push("➤ ÖPNV-Anbindung verbessern");
                    break;
                case 'Sport':
                    recommendations.push("➤ Sportangebote erweitern");
                    break;
                case 'Gastronomie':
                    recommendations.push("➤ Gastronomische Vielfalt erhöhen");
                    break;
                case 'Einkaufen':
                    recommendations.push("➤ Nahversorgung ausbauen");
                    break;
                case 'Erholung':
                    recommendations.push("➤ Mehr Grün- und Erholungsflächen");
                    break;
                case 'Kultur':
                    recommendations.push("➤ Kulturelle Angebote erweitern");
                    break;
            }
        });
    } else {
        recommendations.push("✓ Alle Kategorien erfüllen die Mindestanforderungen");
    }

    return recommendations;
}

// Neue Buttons im categories div hinzufügen
function addHeatmapControls() {
    const categoriesDiv = document.getElementById('categories');
    categoriesDiv.innerHTML += `
        <div class="heatmap-controls" style="margin-top: 10px;">
            <button onclick="toggleHeatmap('pedestrians')" class="heatmap-btn">Fußgängerfrequenz</button>
            <button onclick="toggleHeatmap('poi')" class="heatmap-btn">Points of Interest</button>
            <button onclick="toggleHeatmap('transit')" class="heatmap-btn">ÖPNV-Frequenz</button>
            <button onclick="hideHeatmap()" class="heatmap-btn">Heatmap ausblenden</button>
        </div>
    `;
}

// Heatmap-Daten initialisieren
function initializeHeatmapData() {
    heatmapData = {
        pedestrians: generateGridData(0.01), // Dichtes Raster für Fußgängerfrequenz
        poi: [], // Wird dynamisch durch Places API gefüllt
        transit: [] // Wird dynamisch durch Places API gefüllt
    };
}

// Aktualisierte generateGridData Funktion
function generateGridData(gridSize) {
    const bounds = map.getBounds();
    if (!bounds) return [];

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const points = [];
    const center = map.getCenter();

    // Hauptstraßen simulieren
    const mainStreets = [
        {
            start: new google.maps.LatLng(center.lat() - 0.01, center.lng() - 0.01),
            end: new google.maps.LatLng(center.lat() + 0.01, center.lng() + 0.01),
            weight: 100
        },
        {
            start: new google.maps.LatLng(center.lat() - 0.01, center.lng() + 0.01),
            end: new google.maps.LatLng(center.lat() + 0.01, center.lng() - 0.01),
            weight: 90
        }
    ];

    // POIs für höhere Fußgängerfrequenz
    const hotspots = [
        { lat: center.lat(), lng: center.lng(), weight: 100, radius: 200 },  // Zentrum
        { lat: center.lat() + 0.002, lng: center.lng(), weight: 80, radius: 150 },  // Shopping
        { lat: center.lat() - 0.002, lng: center.lng(), weight: 70, radius: 100 }   // Transit
    ];

    for (let lat = sw.lat(); lat <= ne.lat(); lat += gridSize) {
        for (let lng = sw.lng(); lng <= ne.lng(); lng += gridSize) {
            const point = new google.maps.LatLng(lat, lng);
            let weight = 0;

            // Grundgewichtung basierend auf Entfernung zum Zentrum
            const distanceToCenter = google.maps.geometry.spherical.computeDistanceBetween(point, center);
            weight = Math.max(0, (1 - distanceToCenter/2000) * 30);

            // Zusätzliche Gewichtung für Hotspots
            hotspots.forEach(hotspot => {
                const distanceToHotspot = google.maps.geometry.spherical.computeDistanceBetween(
                    point,
                    new google.maps.LatLng(hotspot.lat, hotspot.lng)
                );
                if (distanceToHotspot < hotspot.radius) {
                    weight += hotspot.weight * (1 - distanceToHotspot/hotspot.radius);
                }
            });

            // Zusätzliche Gewichtung für Hauptstraßen
            mainStreets.forEach(street => {
                const distanceToStreet = google.maps.geometry.spherical.computeDistanceBetween(
                    point,
                    street.start
                );
                if (distanceToStreet < 100) {
                    weight += street.weight * (1 - distanceToStreet/100);
                }
            });

            // Tageszeit-basierte Variation (9-18 Uhr höhere Frequenz)
            const hour = new Date().getHours();
            const timeMultiplier = (hour >= 9 && hour <= 18) ? 1.5 : 0.5;
            weight *= timeMultiplier;

            // Zufällige Variation hinzufügen (±20%)
            const randomVariation = 0.8 + Math.random() * 0.4;
            weight *= randomVariation;

            // Gewichtung auf Maximum von 100 begrenzen
            weight = Math.min(100, Math.max(0, weight));

            points.push({
                location: point,
                weight: weight
            });
        }
    }
    return points;
}

// Aktualisierte toggleHeatmap Funktion
function toggleHeatmap(type) {
    if (heatmap) {
        heatmap.setMap(null);
    }

    if (type === currentHeatmapType) {
        currentHeatmapType = null;
        return;
    }

    currentHeatmapType = type;
    
    const gradients = {
        pedestrians: [
            'rgba(0, 0, 0, 0)',      // transparent
            'rgba(0, 255, 0, 0.5)',  // niedrige Frequenz (grün)
            'rgba(255, 255, 0, 0.7)', // mittlere Frequenz (gelb)
            'rgba(255, 128, 0, 0.8)', // höhere Frequenz (orange)
            'rgba(255, 0, 0, 0.9)',   // hohe Frequenz (rot)
            'rgba(153, 0, 0, 1)'      // sehr hohe Frequenz (dunkelrot)
        ],
        poi: [
            'rgba(255, 255, 0, 0)',
            'rgba(255, 255, 0, 1)',
            'rgba(255, 191, 0, 1)',
            'rgba(255, 127, 0, 1)',
            'rgba(255, 63, 0, 1)',
            'rgba(255, 0, 0, 1)',
        ],
        transit: [
            'rgba(0, 255, 0, 0)',
            'rgba(0, 255, 0, 1)',
            'rgba(0, 223, 0, 1)',
            'rgba(0, 191, 0, 1)',
            'rgba(0, 159, 0, 1)',
            'rgba(0, 127, 0, 1)',
        ]
    };

    heatmap = new google.maps.visualization.HeatmapLayer({
        map: map,
        radius: type === 'pedestrians' ? 25 : 50, // Kleinerer Radius für Fußgänger
        opacity: type === 'pedestrians' ? 0.8 : 0.7,
        gradient: gradients[type],
        dissipating: true,
        maxIntensity: type === 'pedestrians' ? 100 : undefined
    });

    loadDynamicHeatmapData(type);
}

// Heatmap ausblenden
function hideHeatmap() {
    if (heatmap) {
        heatmap.setMap(null);
        currentHeatmapType = null;
    }
}

// Dynamische Daten laden
async function loadDynamicHeatmapData(type) {
    if (!currentLocation) return;

    switch(type) {
        case 'poi':
            const places = await searchNearbyPlaces('point_of_interest');
            const poiData = places.map(place => ({
                location: place.geometry.location,
                weight: place.rating ? place.rating * 20 : 50
            }));
            if (heatmap && currentHeatmapType === 'poi') {
                heatmap.setData(poiData);
            }
            break;

        case 'transit':
            const transitTypes = ['transit_station', 'subway_station', 'train_station', 'bus_station'];
            let allTransitPoints = [];
            
            for (const transitType of transitTypes) {
                const stations = await searchNearbyPlaces(transitType);
                const stationPoints = stations.map(station => ({
                    location: station.geometry.location,
                    // Gewichtung basierend auf Stationstyp
                    weight: transitType === 'train_station' ? 100 :
                           transitType === 'subway_station' ? 80 :
                           transitType === 'transit_station' ? 60 : 40
                }));
                allTransitPoints = [...allTransitPoints, ...stationPoints];
            }

            // Erweitere die Heatmap um die Umgebung der Stationen
            const expandedPoints = expandHeatmapPoints(allTransitPoints);
            
            if (heatmap && currentHeatmapType === 'transit') {
                heatmap.setData(expandedPoints);
            }
            break;

        case 'pedestrians':
            // Aktualisiere Fußgängerdaten basierend auf aktuellem Kartenausschnitt
            const pedestrianData = generateGridData(0.001); // Feineres Raster
            if (heatmap && currentHeatmapType === 'pedestrians') {
                heatmap.setData(pedestrianData);
            }
            break;
    }
}

// Neue Funktion zum Erweitern der Heatmap-Punkte
function expandHeatmapPoints(points) {
    const expandedPoints = [];
    const radius = 300; // Meter
    const steps = 8; // Anzahl der Punkte pro Ring

    points.forEach(point => {
        expandedPoints.push(point); // Originalpunkt

        // Erstelle konzentrische Ringe mit abnehmender Gewichtung
        for (let r = radius/4; r <= radius; r += radius/4) {
            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * 360 * (Math.PI / 180);
                const lat = point.location.lat() + (r / 111300) * Math.cos(angle);
                const lng = point.location.lng() + (r / (111300 * Math.cos(point.location.lat() * (Math.PI / 180)))) * Math.sin(angle);
                
                expandedPoints.push({
                    location: new google.maps.LatLng(lat, lng),
                    weight: point.weight * (1 - r/radius) // Gewichtung nimmt mit Entfernung ab
                });
            }
        }
    });

    return expandedPoints;
}

// CSS-Styles für die Buttons
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .heatmap-controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .heatmap-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            background: #4285F4;
            color: white;
            cursor: pointer;
            transition: background 0.3s;
        }
        .heatmap-btn:hover {
            background: #3367D6;
        }
    </style>
`);

// Aktualisierte sendMessage Funktion
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatInput || !chatMessages) {
        console.error('Chat-Elemente nicht gefunden');
        return;
    }

    const message = chatInput.value.trim();
    if (!message) return;

    // Benutzer-Nachricht anzeigen
    await addMessageToChat('user', message);

    // Input-Feld leeren
    chatInput.value = '';

    // Bot-Antwort generieren und anzeigen
    const response = await generateBotResponse(message);
    await addMessageToChat('bot', response);
}

// Aktualisierte addMessageToChat Funktion mit Typing-Animation
async function addMessageToChat(sender, message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    
    if (sender === 'bot') {
        // Typing-Indikator hinzufügen
        messageDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Nachricht Zeichen für Zeichen anzeigen
        await typeMessage(messageDiv, message);
    } else {
        // User Nachrichten sofort anzeigen
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Neue Funktion für die Typing-Animation
async function typeMessage(element, message) {
    element.textContent = '';
    const delay = 30; // Verzögerung zwischen den Buchstaben (ms)
    
    for (let i = 0; i < message.length; i++) {
        element.textContent += message[i];
        element.scrollIntoView({ behavior: 'smooth', block: 'end' });
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// Füge CSS für den Typing-Indikator hinzu
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 4px 8px;
        }

        .typing-indicator span {
            width: 8px;
            height: 8px;
            background: #90A4AE;
            border-radius: 50%;
            animation: typing 1s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.4s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.6s; }

        @keyframes typing {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
    </style>
`);

// Aktualisierte generateBotResponse Funktion
async function generateBotResponse(userMessage) {
    try {
        // Prüfe zuerst, ob eine Analyse durchgeführt wurde
        if (!analysisResults) {
            return "Bitte führen Sie zuerst eine Analyse durch, indem Sie einen Standort auf der Karte auswählen und auf 'Standort analysieren' klicken.";
        }

        const systemMessage = `Du bist ein Stadtplanungs-Assistent. 
            Aktueller Standort: ${currentLocation ? 
                `Lat ${currentLocation.lat().toFixed(6)}, Lng ${currentLocation.lng().toFixed(6)}` 
                : 'Nicht ausgewählt'}

            Analyseergebnisse im 15-Minuten-Radius:
            ${Object.entries(analysisResults).map(([key, facilities]) => 
                `${facilityTypes[key].name}: ${facilities.length} (Minimum: ${facilityTypes[key].minimum})`
            ).join('\n')}

            Bitte antworte kurz und präzise auf die Frage des Nutzers.`;

        console.log('Sende Anfrage an OpenAI...', {
            systemMessage,
            userMessage
        });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: userMessage
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Fehler:', errorData);
            throw new Error(`API-Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`);
        }

        const data = await response.json();
        console.log('OpenAI Antwort:', data);

        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Ungültige Antwort von OpenAI');
        }

        return data.choices[0].message.content;

    } catch (error) {
        console.error('ChatBot Fehler:', error);
        
        if (error.message.includes('quota')) {
            return "Entschuldigung, das API-Limit wurde erreicht. Bitte versuchen Sie es später erneut.";
        }
        
        if (error.message.includes('API-Fehler')) {
            return `Entschuldigung, es gab einen Fehler bei der Verarbeitung: ${error.message}`;
        }
        
        return "Entschuldigung, ich konnte Ihre Anfrage nicht verarbeiten. Bitte stellen Sie sicher, dass Sie zuerst eine Analyse durchgeführt haben.";
    }
}

// Aktualisierte showObsoleteUsages Funktion
async function showObsoleteUsages() {
    if (!currentLocation) {
        alert('Bitte wählen Sie zuerst einen Standort auf der Karte aus.');
        return;
    }

    clearMarkers();
    const results = {};
    let html = '<div class="score-card">';
    let totalObsoleteScore = 0;
    let maxScore = 0;

    // Gesamtübersicht mit korrigiertem Button
    html += `
        <div class="obsolete-summary">
            <button class="collapsible-btn" onclick="event.preventDefault(); toggleObsoleteList(this)">
                <span class="arrow">▼</span> Details zu obsoleten Nutzungen
            </button>
            <div class="collapsible-content">
    `;

    for (const [key, config] of Object.entries(obsoleteTypes)) {
        try {
            const places = await searchNearbyPlaces(config.searchType);
            results[key] = places;
            
            // Verhindere Division durch 0
            const totalPlaces = places.length || 1; // Wenn keine Orte gefunden wurden, nutze 1 als Nenner
            
            const obsoletePlaces = places.filter(place => 
                !place.rating || place.rating < 3.5 || 
                place.business_status === 'CLOSED_TEMPORARILY' || 
                place.business_status === 'CLOSED_PERMANENTLY'
            );

            // Berechne den Score nur wenn Orte gefunden wurden
            const score = places.length > 0 ? 
                (obsoletePlaces.length / totalPlaces) * config.weight : 0;
                
            totalObsoleteScore += score;
            maxScore += config.weight;

            // Debug-Ausgabe
            console.log(`${config.name}:`, {
                totalPlaces,
                obsoletePlaces: obsoletePlaces.length,
                score,
                weight: config.weight
            });

            obsoletePlaces.forEach(place => createObsoleteMarker(place, key));

            html += `
                <div class="facility-count">
                    <strong>${config.name}:</strong> 
                    ${obsoletePlaces.length} von ${places.length || 0} Orten
                    <br>
                    <small>Obsoleszenz-Beitrag: ${score.toFixed(1)} von ${config.weight}</small>
                </div>
            `;
        } catch (error) {
            console.error(`Fehler bei ${key}:`, error);
        }
    }

    // Verhindere Division durch 0 bei der Gesamtscore-Berechnung
    const finalObsoleteScore = maxScore > 0 ? 
        (totalObsoleteScore / maxScore * 100).toFixed(1) : 0;

    html += `
            </div>
        </div>
        <div style="font-size: 24px; margin-bottom: 15px; color: ${finalObsoleteScore > 50 ? '#F44336' : '#4CAF50'}">
            Obsoleszenz-Score: ${finalObsoleteScore}%
        </div>
        <small>0% = keine Obsoleszenz, 100% = hohe Obsoleszenz</small>
    </div>`;

    document.getElementById('obsolete-usages').innerHTML = html;

    // Obsolete Stadt Empfehlungen im separaten Empfehlungsbereich anzeigen
    const obsoleteRecommendations = generateObsoleteRecommendations(results, finalObsoleteScore);
    const recommendationsElement = document.getElementById('recommendations-content');
    
    // Füge die obsoleten Empfehlungen zum bestehenden Inhalt hinzu
    recommendationsElement.innerHTML += `
        <div class="score-card">
            <h4>Handlungsempfehlungen für Obsolete Strukturen:</h4>
            ${obsoleteRecommendations.map(rec => `<p>• ${rec}</p>`).join('')}
        </div>
    `;

    // Aktualisierte Styles
    if (!document.getElementById('collapsible-styles')) {
        const styles = `
            <style id="collapsible-styles">
                .collapsible-btn {
                    background: #f8f9fa;
                    border: none;
                    padding: 15px;
                    width: 100%;
                    text-align: left;
                    cursor: pointer;
                    border-radius: 4px;
                    margin: 5px 0;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .collapsible-btn:hover {
                    background: #e9ecef;
                }

                .collapsible-btn .arrow {
                    transition: transform 0.3s ease;
                    display: inline-block;
                }

                .collapsible-btn.active .arrow {
                    transform: rotate(180deg);
                }

                .collapsible-content {
                    display: none;
                    padding: 10px;
                    background: white;
                    border-radius: 4px;
                    margin-top: 5px;
                }

                .facility-count {
                    padding: 10px 0;
                    border-bottom: 1px solid #eee;
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

// Aktualisierte toggleObsoleteList Funktion
function toggleObsoleteList(button) {
    const content = button.nextElementSibling;
    const isDisplayed = content.style.display === "block";
    
    // Toggle Button-Klasse
    button.classList.toggle('active');
    
    // Toggle Content
    content.style.display = isDisplayed ? "none" : "block";
}

// Aktualisierte createObsoleteMarker Funktion mit spezifischen Farben für verschiedene Nutzungstypen
function createObsoleteMarker(place, type) {
    // Farbschema für verschiedene Nutzungskategorien
    const colors = {
        'retail_small': '#FF9999',     // Hellrot
        'retail_large': '#FF6666',     // Rot
        'shopping_mall': '#FF3333',    // Dunkelrot
        'department_store': '#FF0000', // Tiefrot
        'exhibition': '#FFB366',       // Orange
        'cinema': '#FFE666',          // Gelb
        'manufacturing': '#666699',    // Blaugrau
        'industry': '#333366',         // Dunkelblau
        'office': '#99CCFF',          // Hellblau
        'car_dealer': '#FF99CC',      // Rosa
        'gas_station': '#FF66B2',     // Dunkelpink
        'parking_garage': '#CCCCCC',   // Grau
        'parking': '#999999',         // Dunkelgrau
        'airport': '#6666FF',         // Blau
        'cemetery': '#66CC66',        // Grün
        'church': '#FFCC66',          // Gold
        'military': '#666666',        // Anthrazit
        'old_factory': '#996633',     // Braun
        'harbor': '#3399CC'           // Meerblau
    };

    const marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        title: place.name,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: colors[type] || '#FF0000',
            fillOpacity: 0.7,
            strokeWeight: 1,
            strokeColor: '#FFFFFF'
        }
    });

    markers.push(marker);

    google.maps.event.addListener(marker, 'click', () => {
        const content = `
            <div>
                <strong>${place.name}</strong><br>
                ${place.vicinity || ''}<br>
                <small>Kategorie: ${obsoleteTypes[type].name}</small>
                ${place.business_status ? `<br><small>Status: ${place.business_status}</small>` : ''}
                ${place.rating ? `<br><small>Bewertung: ${place.rating}</small>` : ''}
            </div>
        `;
        infowindow.setContent(content);
        infowindow.open(map, marker);
    });
}

// Neue Funktion für Obsolete Stadt Empfehlungen
function generateObsoleteRecommendations(results, obsoleteScore) {
    let recommendations = [];

    // Allgemeine Empfehlungen basierend auf Score
    if (obsoleteScore > 70) {
        recommendations.push("Hoher Transformationsbedarf - umfassende Umstrukturierung empfohlen");
    } else if (obsoleteScore > 40) {
        recommendations.push("Mittlerer Transformationsbedarf - gezielte Anpassungen nötig");
    } else {
        recommendations.push("Geringer Transformationsbedarf - punktuelle Optimierungen möglich");
    }

    // Spezifische Empfehlungen für obsolete Strukturen
    Object.entries(results).forEach(([key, places]) => {
        const config = obsoleteTypes[key];
        if (places.length > 0) {
            switch(key) {
                case 'retail_small':
                case 'retail_large':
                case 'shopping_mall':
                case 'department_store':
                    recommendations.push("➤ Einzelhandelskonzept modernisieren, Mixed-Use-Entwicklung prüfen");
                    break;
                case 'parking':
                case 'parking_garage':
                    recommendations.push("➤ Parkflächen reduzieren, alternative Nutzungen entwickeln");
                    break;
                case 'industry':
                case 'manufacturing':
                case 'old_factory':
                    recommendations.push("➤ Industrieflächen revitalisieren, kreative Nachnutzung prüfen");
                    break;
                case 'office':
                    recommendations.push("➤ Büroflächen modernisieren oder in Wohnraum umwandeln");
                    break;
            }
        }
    });

    return recommendations;
} 

// Aktualisiere die CSS-Styles für die Chat-Nachrichten
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .chat-message {
            margin: 12px 0;
            padding: 12px 16px;
            border-radius: 12px;
            max-width: 80%;
            line-height: 1.4;
        }

        .user-message {
            background: #E3F2FD;  /* Hellblauer Hintergrund */
            margin-left: auto;
            color: #1565C0;  /* Dunkelblauer Text */
            border: none;
        }

        .bot-message {
            background: #E8F5E9;  /* Hellgrüner Hintergrund */
            margin-right: auto;
            color: #2E7D32;  /* Dunkelgrüner Text */
            border: none;
        }

        .typing-indicator span {
            background: #4CAF50;  /* Grüne Typing-Dots */
        }
    </style>
`); 

// Aktualisierte createBarChart Funktion
function createBarChart(results) {
    const barChartContainer = document.createElement('div');
    barChartContainer.style.marginTop = '20px';
    const canvas = document.createElement('canvas');
    barChartContainer.appendChild(canvas);
    
    document.getElementById('spider-chart-container').after(barChartContainer);

    // Verwende die gleichen Farben wie für die Marker
    const categoryColors = {
        'education': '#FF0000',    // Rot
        'food': '#00FF00',         // Grün
        'shopping': '#0000FF',     // Blau
        'recreation': '#00FF00',   // Grün
        'transit': '#FFD700',      // Gold
        'health': '#FF69B4',       // Pink
        'culture': '#FFA500',      // Orange
        'sports': '#8B4513'        // Braun
    };

    // Daten vorbereiten
    const labels = Object.entries(results).map(([key, _]) => facilityTypes[key].name);
    const actualValues = Object.entries(results).map(([key, facilities]) => facilities.length);
    const minimumValues = Object.entries(results).map(([key, _]) => facilityTypes[key].minimum);
    const backgroundColors = Object.keys(results).map(key => categoryColors[key]);

    // Erstelle das Balkendiagramm
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Vorhandene Einrichtungen',
                    data: actualValues,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors,
                    borderWidth: 1
                },
                {
                    label: 'Mindestanforderung',
                    data: minimumValues,
                    backgroundColor: backgroundColors.map(color => `${color}33`), // Transparente Version
                    borderColor: backgroundColors,
                    borderWidth: 1,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Vergleich vorhandener Einrichtungen mit Mindestanforderungen',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Anzahl'
                    }
                },
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
} 

// Neue Funktion zum Stellen von Beispielfragen
function askExampleQuestion(button) {
    const question = button.textContent;
    const chatInput = document.getElementById('chat-input');
    chatInput.value = question;
    sendMessage();
} 

// Aktualisierte createUsageDistributionChart Funktion
function createUsageDistributionChart(results) {
    const ctx = document.getElementById('usageChart').getContext('2d');
    
    // Berechne Defizite aus der 15-Minuten-Analyse
    const deficits = {};
    let totalDeficit = 0;
    
    Object.entries(facilityTypes).forEach(([key, config]) => {
        const current = results[key].length;
        const required = Math.max(0, config.minimum - current);
        if (required > 0) {
            deficits[key] = {
                amount: required,
                category: config.name,
                weight: config.weight
            };
            totalDeficit += required * config.weight;
        }
    });

    // Basis-Verteilung
    let usageDistribution = {
        'Wohnen': 35,
        'Gewerbe & Büro': 20,
        'Einzelhandel': 15,
        'Soziale Infrastruktur': 20,
        'Grün- & Freiflächen': 10
    };

    // Anpassung basierend auf den Defiziten
    if (deficits.education || deficits.health) {
        // Mehr soziale Infrastruktur bei Bildungs- oder Gesundheitsdefiziten
        usageDistribution['Soziale Infrastruktur'] += 10;
        usageDistribution['Gewerbe & Büro'] -= 5;
        usageDistribution['Wohnen'] -= 5;
    }

    if (deficits.shopping) {
        // Mehr Einzelhandel bei Versorgungsdefiziten
        usageDistribution['Einzelhandel'] += 5;
        usageDistribution['Gewerbe & Büro'] -= 5;
    }

    if (deficits.recreation || deficits.sports) {
        // Mehr Grünflächen bei Erholungsdefiziten
        usageDistribution['Grün- & Freiflächen'] += 5;
        usageDistribution['Gewerbe & Büro'] -= 5;
    }

    if (deficits.transit) {
        // Bei ÖPNV-Defiziten mehr Mischnutzung
        usageDistribution['Wohnen'] += 5;
        usageDistribution['Einzelhandel'] += 5;
        usageDistribution['Gewerbe & Büro'] -= 10;
    }

    // Erstelle das Kuchendiagramm
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(usageDistribution),
            datasets: [{
                data: Object.values(usageDistribution),
                backgroundColor: [
                    '#FF6384',  // Wohnen
                    '#36A2EB',  // Gewerbe & Büro
                    '#FFCE56',  // Einzelhandel
                    '#4BC0C0',  // Soziale Infrastruktur
                    '#9966FF'   // Grün- & Freiflächen
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Empfohlene Nutzungsverteilung',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });

    // Füge detaillierte Erläuterungen hinzu
    const recommendationsDiv = document.getElementById('usage-recommendations');
    recommendationsDiv.innerHTML = `
        <div class="usage-recommendations-card" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h4 style="margin-top: 0;">Erläuterungen zur empfohlenen Nutzungsverteilung:</h4>
            <ul style="padding-left: 20px;">
                <li><strong>Wohnen (${usageDistribution['Wohnen']}%):</strong> ${
                    deficits.transit ? 'Erhöhter Wohnanteil zur Verbesserung der ÖPNV-Auslastung' : 
                    'Basis für eine lebendige Nachbarschaft'
                }</li>
                <li><strong>Gewerbe & Büro (${usageDistribution['Gewerbe & Büro']}%):</strong> ${
                    Object.keys(deficits).length > 2 ? 'Reduzierter Gewerbeanteil zugunsten fehlender Nutzungen' : 
                    'Arbeitsplätze im Quartier'
                }</li>
                <li><strong>Einzelhandel (${usageDistribution['Einzelhandel']}%):</strong> ${
                    deficits.shopping ? 'Erhöhter Anteil zur Verbesserung der Nahversorgung' : 
                    'Nahversorgung und lokale Wirtschaft'
                }</li>
                <li><strong>Soziale Infrastruktur (${usageDistribution['Soziale Infrastruktur']}%):</strong> ${
                    deficits.education || deficits.health ? 'Erhöhter Anteil zum Ausgleich fehlender Bildungs- und Gesundheitseinrichtungen' : 
                    'Bildung, Gesundheit, Kultur'
                }</li>
                <li><strong>Grün- & Freiflächen (${usageDistribution['Grün- & Freiflächen']}%):</strong> ${
                    deficits.recreation || deficits.sports ? 'Erhöhter Anteil für mehr Erholungsflächen' : 
                    'Erholung und Klimaresilienz'
                }</li>
            </ul>
            <p style="margin-top: 15px; font-style: italic;">
                Diese Verteilung wurde basierend auf den identifizierten Defiziten der 15-Minuten-Stadt-Analyse optimiert.
                ${Object.keys(deficits).length > 0 ? 
                    `Hauptdefizite: ${Object.values(deficits).map(d => d.category).join(', ')}` : 
                    'Keine signifikanten Defizite festgestellt.'}
            </p>
        </div>
    `;
} 