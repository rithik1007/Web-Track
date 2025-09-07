const socket = io();
const markers={};
const paths = {};
const username = prompt("Enter your name:") || "Anonymous"; // <-- Add this line
const avatar = prompt("Enter avatar image URL (optional):") || "https://ui-avatars.com/api/?name=" + encodeURIComponent(username);
if(navigator.geolocation){
    navigator.geolocation.watchPosition(
        (position)=>{
        const {latitude, longitude } = position.coords;
        socket.emit("send-location", {latitude, longitude,username, avatar});
    },
    (error) => {
        console.error(error);
    },
    {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge:0
    }
    );
}

const map = L.map("map").setView([0,0], 16);

const tileLayers = {
    osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "OpenStreetMap" }),
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: "©OpenStreetMap, ©CartoDB" }),
    satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles © Esri" })
};
tileLayers.osm.addTo(map);

document.getElementById("map-theme").addEventListener("change", function() {
    Object.values(tileLayers).forEach(layer => map.removeLayer(layer));
    tileLayers[this.value].addTo(map);
});

socket.on("recieve-location", (data)=>{
    const {id, latitude, longitude, username, avatar} = data;
    map.setView([latitude,longitude]);
    const icon = L.icon({
        iconUrl: avatar,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
     if (!paths[id]) {
        paths[id] = {
            latlngs: [],
            polyline: L.polyline([], {color: 'blue'}).addTo(map)
        };
    }
    paths[id].latlngs.push([latitude, longitude]);
    paths[id].polyline.setLatLngs(paths[id].latlngs);

    if(markers[id]){
        markers[id].setLatLng([latitude,longitude]);
        markers[id].setIcon(icon);
        markers[id].bindPopup(username).openPopup();
    }
    else{
        markers[id] = L.marker([latitude,longitude], {icon}).addTo(map);
        markers[id].bindPopup(username).openPopup();
    }
});
socket.on("user-disconnected", (id)=>{
    if(markers[id]){
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});
socket.on("user-list", (users) => {
    const userList = document.getElementById("userList");
    userList.innerHTML = "";
    Object.values(users).forEach(user => {
        const li = document.createElement("li");
        li.textContent = user.username;
        userList.appendChild(li);
    });
});
socket.on("all-users", (users) => {
    Object.entries(users).forEach(([id, user]) => {
        const { username, latitude, longitude, avatar } = user;
        if (!markers[id]) {
            const icon = L.icon({
                iconUrl: avatar,
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            });
            markers[id] = L.marker([latitude, longitude], { icon }).addTo(map);
            markers[id].bindPopup(username).openPopup();
        }
    });
});

// Chat functionality
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");

chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if(message) {
        socket.emit("chat-message", { username, message });
        chatInput.value = "";
    }
});

socket.on("chat-message", (data) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${data.username}:</strong> ${data.message}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

document.getElementById("toggle-sidebar").onclick = function() {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.display = (sidebar.style.display === "none" || sidebar.style.display === "") ? "block" : "none";
};

document.getElementById("toggle-chat").onclick = function() {
    const chat = document.getElementById("chat");
    chat.style.display = (chat.style.display === "none" || chat.style.display === "") ? "block" : "none";
};