const axios = require("axios");


let vehicles = [];

// Function to validate coordinates
function validateCoordinates(lat, lng) {
  if (isNaN(lat) || isNaN(lng)) return { valid: false };
  if (lat < -90 || lat > 90) return { valid: false };
  if (lng < -180 || lng > 180) return { valid: false };
  return { valid: true };
}

// Function to generate random movement
function generateRandomMovement(baseLat, baseLng) {
  const latOffset = (Math.random() - 0.5) * 0.02;
  const lngOffset = (Math.random() - 0.5) * 0.02;

  const newLat = parseFloat((baseLat + latOffset).toFixed(6));
  const newLng = parseFloat((baseLng + lngOffset).toFixed(6));

  const validation = validateCoordinates(newLat, newLng);
  if (!validation.valid) return { lat: baseLat, lng: baseLng };

  return { lat: newLat, lng: newLng };
}

// Function to update vehicle positions
function updateVehiclePositions() {
  if (vehicles.length === 0) {
    console.log("⚠️  No vehicles found in backend. Add vehicles first.");
    return;
  }

  vehicles.forEach(async (vehicle, index) => {
    const { lat, lng } = generateRandomMovement(vehicle.lat, vehicle.lng);
    const lastUpdated = new Date().toISOString();

    try {
      await axios.post("http://localhost:3000/api/vehicle/update", {
        name: vehicle.name,
        lat,
        lng,
        lastUpdated,
      });

      vehicles[index].lat = lat;
      vehicles[index].lng = lng;

      console.log(
        `🚗 ${vehicle.name} updated: ${lat.toFixed(
          4
        )}, ${lng.toFixed(4)} at ${new Date().toLocaleTimeString()}`
      );
    } catch (err) {
      console.error(
        `❌ Error updating ${vehicle.name}:`,
        err.response?.data || err.message
      );
    }
  });
}

// Start simulation
async function startSimulation() {
  console.log("\n🎯 Starting GPS simulation...");
  console.log("🔄 Updates every 5 seconds");
  console.log("Press Ctrl+C to stop\n");

  setTimeout(updateVehiclePositions, 1000);
  const interval = setInterval(updateVehiclePositions, 5000);

  process.on("SIGINT", () => {
    clearInterval(interval);
    console.log("\n\n🛑 GPS simulation stopped.");
    process.exit(0);
  });
}

// Main
async function main() {
  try {
    const response = await axios.get("http://localhost:3000/api/vehicles");
    vehicles = response.data;

    if (vehicles.length === 0) {
      console.log("⚠️  No vehicles in database. Add some first.");
      process.exit(0);
    }

    console.log(`📊 Loaded ${vehicles.length} vehicles from backend.`);
    vehicles.forEach((v, i) => {
      const lat = parseFloat(v.lat);
      const lng = parseFloat(v.lng);

      if (isNaN(lat) || isNaN(lng)) {
        console.log(`${i + 1}. ${v.name} (⚠️ invalid coordinates)`);
      } else {
        console.log(`${i + 1}. ${v.name} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        vehicles[i].lat = lat;
        vehicles[i].lng = lng;
      }
    });

    await startSimulation();
  } catch (err) {
    console.error("❌ Failed to load vehicles:", err.response?.data || err.message);
    process.exit(1);
  }
}

main();