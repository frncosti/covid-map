import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';
import axios from 'axios';
import { geojson } from './geojson';
import '../scss/index.scss';
import pin from '../images/gpin.png';
import brandLogo from '../images/undp-official-logo-blue.png';


document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

const initApp = async () => {
    const corsProxy = 'https://cors-anywhere.herokuapp.com/';
    const url = 'https://api.covid19api.com/summary';

    if (!mapboxgl.supported()) {
        document.getElementById('map').classList.remove('map-loader');
        isNotSupported("Sorry, this browser does not support the map");
    } else {
        try {
            const response = await axios.get(corsProxy + url);
            const results = response.data.Countries;
            
            initMap(results);
        } catch (error) {
            console.error(error);
        }
    }
}

const initMap = results => {
    const token = 'pk.eyJ1IjoiZmNvc3RpIiwiYSI6ImNrOGlkYW13YTAwcHUzZGsyeGsxanBubWUifQ.y6teVsLPwuJZ-D_gUbLwFA';
    const mapStyle = 'mapbox://styles/fcosti/ck95reywf4fss1js93gcn7zmg';
    const initialCoordinates = [120.523186, 18.736717];
    const initialZoom = 2;

    createMapHtml();
    
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
        container: 'covidmap',
        style: mapStyle,
        center: initialCoordinates,
        zoom: initialZoom,
    });

    map.on('load', () => {
        onLoadMap(geojson, map, initialCoordinates, results);
        onSearchDropDown(map, geojson, results, initialCoordinates);
    });
}

const onLoadMap = (geojson, map, initialCoordinates, results) => {
    document.getElementById('map').classList.remove('map-loader');
    document.getElementById('mapcontrols').classList.add('show');

    geojson.features.forEach(marker => {
        let el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = 'url(' + pin + ')';

        // add popup template
        var popup = new mapboxgl.Popup({offset:[0, -30]})
            .setHTML(
                popupTemplate(
                    marker.properties.title, 
                    marker.properties.country, 
                    marker.properties.bodytext, 
                    marker.properties.link
                    )
            );

        // add marker to map
        new mapboxgl.Marker(el, {offset: [0, -22]})
            .setLngLat(marker.geometry.coordinates)
            .setPopup(popup)
            .addTo(map);

        // Init Dropdown search
        initSearchDropDown(
            marker.properties.country, 
            marker.properties.title
        );

        // Add click event listener to markers
        el.addEventListener('click', () => {
            let country = marker.properties.country;
            let confirmed;
            let deaths;
            let recovered;

            for (let i=0; i < results.length; i++) {
                if (results[i].Slug == marker.properties.country) {
                    confirmed = results[i].TotalConfirmed;
                    deaths = results[i].TotalDeaths;
                    recovered = results[i].TotalRecovered;
                }
            }

            confirmed = confirmed == undefined ? 0 : confirmed;
            deaths = deaths == undefined ? 0 : deaths;
            recovered = recovered == undefined ? 0 : recovered;

            console.log('Confirmed: ' + confirmed + ' Deaths: ' + deaths + ' ' + ' Recovered' + recovered);

            pinOnClick(
                map,
                marker.geometry.coordinates,
                country,
                confirmed,
                deaths,
                recovered,
                popup
            );
        });

        // Popup on open
        popup.on('open', e => {
            document.getElementById('map').classList.add('popup-flag');
        });

        // Popup on close
        popup.on('close', e => {
            popUpOnClose(map, initialCoordinates);
        });
    });
}

const pinOnClick = (map, coord, country, confirmed, deaths, recovered, popup) => {
    const modal = document.getElementById('modal');

    // Fly to country marker 
    map.flyTo({
        center: coord, 
        zoom: 12,
        pitch: 60,
        bearing: -60,
    });

    modal.style.display = 'flex';
    modal.classList.remove('slide-out');
    modal.classList.add('slide-in');

    initModal(country, confirmed, deaths, recovered);

    animateValue("cases-value", 0, confirmed, 1200);
    animateValue("deaths-value", 0, deaths, 1200);
    animateValue("recovered-value", 0, recovered, 1200);

    document.getElementById("m-buttons-close").addEventListener('click', () =>{
        popup.remove();
    });
}

const popUpOnClose = (map, initialCoordinates) => {
    const modal = document.getElementById('modal');

    modal.classList.remove('slide-in');
    modal.classList.add('slide-out');
    document.getElementById('map').classList.remove('popup-flag');

    // On popup close return to initial coordinates
    map.flyTo({
        center: initialCoordinates, 
        zoom: 2,
        pitch: 0,
        bearing: 0,
    });

    // Remove popup on click
    document.getElementById("m-buttons-close").addEventListener('click', () => {
        popup.remove();
    });
}

const initSearchDropDown = (country, title) => {
    var option = `<option value="${country}">${title}</option>`;
    var target = document.getElementById("map-search");
    
    target.innerHTML = target.innerHTML + option;
}

const onSearchDropDown = (map, geojson, results, initialCoordinates) => {
    const mapSearch = document.getElementById("map-search");

    mapSearch.onchange = () => {
        let optValue = mapSearch.value;

        geojson.features.forEach(marker => {
            if (optValue === marker.properties.country) {
                const pu = document.querySelector('.mapboxgl-popup');
                const modal = document.getElementById('modal');

                let coordinates = marker.geometry.coordinates;
                let title = marker.properties.title;
                let country = marker.properties.country;
                let bodytext = marker.properties.bodytext;
                let link = marker.properties.link;

                map.flyTo({
                    center: coordinates, 
                    zoom: 12,
                    pitch: 60,
                    bearing: -60,
                });

                if (pu) {
                    pu.remove();
                    modal.classList.remove('slide-in');
                    modal.classList.add('slide-out');
                    document.getElementById('map').classList.remove('popup-flag');
                }

                // add popup template
                var popup = new mapboxgl.Popup({offset:[0, -30]})
                    .setLngLat(marker.geometry.coordinates)
                    .setHTML(popupTemplate(title, country, bodytext, link))
                    .addTo(map);

                document.getElementById('map').classList.add('popup-flag');
                modal.style.display = 'flex';
                modal.classList.remove('slide-out');
                modal.classList.add('slide-in');

                let countryModal = marker.properties.country;
                let confirmedModal;
                let deathsModal;
                let recoveredModal;

                for (let i=0; i < results.length; i++) {
                    if (results[i].Slug == marker.properties.country) {
                        confirmedModal = results[i].TotalConfirmed;
                        deathsModal = results[i].TotalDeaths;
                        recoveredModal = results[i].TotalRecovered;
                    }
                }

                initModal(
                    countryModal, 
                    confirmedModal, 
                    deathsModal, 
                    recoveredModal
                );

                document.getElementById("m-buttons-close").addEventListener('click', () => {
                    popup.remove();
                });
                
                animateValue("cases-value", 0, confirmedModal, 1200);
                animateValue("deaths-value", 0, deathsModal, 1200);
                animateValue("recovered-value", 0, recoveredModal, 1200);

                popup.on('close', e => {
                    modal.classList.remove('slide-in');
                    modal.classList.add('slide-out');
                    document.getElementById('map').classList.remove('popup-flag');

                    map.flyTo({
                        center: initialCoordinates, 
                        zoom: 2,
                        pitch: 0,
                        bearing: 0,
                    });
    
                });

            }
        });
    }
}

const animateValue = (id, start, end, duration) => {
    var obj = document.getElementById(id);
    var range = end - start;
    var minTimer = 50;
    var stepTime = Math.abs(Math.floor(duration / range));
    
    stepTime = Math.max(stepTime, minTimer);
    
    var startTime = new Date().getTime();
    var endTime = startTime + duration;
    var timer;
  
    function run() {
        var now = new Date().getTime();
        var remaining = Math.max((endTime - now) / duration, 0);
        var value = Math.round(end - (remaining * range));
        obj.innerHTML = value;
        if (value == end) {
            clearInterval(timer);
        }
    }
    
    timer = setInterval(run, stepTime);
    run();
}

const createMapHtml = () => {
    const mapContainer = document.getElementById('map');

    const elMap = document.createElement('div');
    elMap.setAttribute("id", "covidmap");

    const mapHeader = document.createElement('div');
    mapHeader.setAttribute("id", "mapcontrols");

    const mapModal = document.createElement('div');
    mapModal.setAttribute("id", "modal");

    const dataSource = document.createElement('div');
    dataSource.setAttribute("class", "data-source");
    dataSource.innerHTML = "API @<a href='https://covid19api.com/#details' target='_blank'>covid19api.com</a>. Data is sourced from <a href='https://github.com/CSSEGISandData/COVID-19' target='_blank'>Johns Hopkins CSSE</a>";

    const disclaimerDiv = document.createElement('div');
    disclaimerDiv.setAttribute("id", "disclaimer");
    disclaimerDiv.innerHTML = "The designations employed and the presentation of material on this map do not imply the expression of any opinion whatsoever on the part of the Secretariat of the United Nations or UNDP concerning the legal status of any country, territory, city or area or its authorities, or concerning the delimitation of its frontiers or boundaries.";

    initMapHeader(mapHeader);
    iniModalHtml(mapModal);

    mapContainer.appendChild(elMap);
    mapContainer.appendChild(mapHeader);
    mapContainer.appendChild(mapModal);
    mapContainer.appendChild(dataSource);
    insertAfter(disclaimerDiv, mapContainer);
}

const isNotSupported = message => {
    const mapContainer = document.getElementById('map');

    const elMap = document.createElement('div');
    elMap.setAttribute("class", "map-not-supported");
    elMap.innerHTML = message;
    
    mapContainer.appendChild(elMap);
}

const insertAfter = (el, referenceNode) => {
    referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
}

const popupTemplate = (title, country, bodytext, link) => {
    let popupTemplate =
        `
        <div class="p-header-wrapper">
            <img id="p-header-image" class="flag-${country}" src="../images/flags/${country}.png" />
            <h3>${title}</h3>
        </div>
        <ul class="p-bodytext">
            ${bodytext}
        </ul>
        <div class="p-links-container">
            <div class="p-links"><a class="btn btn-primary" href="${link}" target="_blank">Read More</a></div>
        </div>
        `
    return popupTemplate;
}

function initModal(country, confirmed, deaths, recovered) {
    var template =  `
    <div class="m-section m-header-section">
        <h3>${country}</h3>
        <div class="arr-right"></div>
    </div>
    
    <div class="p-data-container">
        <div class="p-data">
            <div id="cases-value" class="p-value">${confirmed}</div>
            <div class="p-title">Confirmed<br />cases</div>
        </div>

        <div class="p-data">
            <div id="deaths-value" class="p-value">${deaths}</div>
            <div class="p-title">Confirmed<br />deaths</div>
        </div>

        <div class="p-data">
            <div id="recovered-value" class="p-value">${recovered}</div>
            <div class="p-title">Confirmed<br />recovered</div>
        </div>
    </div>

    <div class="m-buttons-section">
        <div id="m-buttons-close" class="m-button m-buttons-close"><i class="fas fa-times"></i></div>
        <div class="m-button m-buttons-info"><i class="fas fa-info"></i></div>
        <div class="m-button m-buttons-docs"><i class="fas fa-file-medical-alt"></i></div>
    </div>
    `
    document.getElementById("modal").innerHTML = template;
}

const initMapHeader = div => {
    div.innerHTML =
        `
        <img class="logo" src="${brandLogo}" alt="brand-logo">
        <div class="map-search-wrapper">
            <select id="map-search" class="form-control">
                <option value="#">- select country -</option>
            </select>
        </div>
        `
    return div;
}

const iniModalHtml = div => {
    div.innerHTML =
        `
        <div class="m-buttons-section">
            <div id="m-buttons-close" class="m-button m-buttons-close"><i class="fas fa-times"></i></div>
            <div class="m-button m-buttons-info"><i class="fas fa-info"></i></div>
            <div class="m-button m-buttons-docs"><i class="fas fa-file-medical-alt"></i></div>
        </div>
        `
    return div;
}
