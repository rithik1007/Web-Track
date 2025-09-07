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

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "OpenStreetMap"
}).addTo(map);


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