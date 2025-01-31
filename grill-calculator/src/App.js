import React, { useState } from 'react';
import './App.css';

// Temperature data
const temperatureData = {
  '225-short': {
    label: '225°F (Shorter Cook, 5–6 hours, Perfect for Ribs)',
    kingsford: 6,
    weber: 5,
    fuelSupplyKingsford: 120,
    fuelSupplyWeber: 60,
    topVent: '1/8 to 1/4 open',
    bottomVent: '1/8 to 1/4 open',
    time: '6–7 hours',
    stabilization: '20–30 minutes',
    dumpCoals: 'On top of the fuel supply pile',
  },
  '225-long': {
    label: '225°F (Longer Cook, 10–12 hours, Perfect for Pulled Pork)',
    kingsford: 8,
    weber: '5–6',
    fuelSupplyKingsford: 230,
    fuelSupplyWeber: 130,
    topVent: '1/8 to 1/4 open',
    bottomVent: '1/8 to 1/4 open',
    time: '10–12 hours',
    stabilization: '20–30 minutes',
    dumpCoals:
      'On the edge of the fuel supply pile. Position hot coals on one side to add more later without disturbing the lit pile.',
  },
  275: {
    label: '275°F',
    kingsford: 30,
    weber: 16,
    fuelSupplyKingsford: 80,
    fuelSupplyWeber: 50,
    topVent: '1/2 open',
    bottomVent: '1/2 open',
    time: '2–3 hours',
    stabilization: '20 minutes',
    dumpCoals: 'On top of the fuel supply pile',
  },
  300: {
    label: '300°F',
    kingsford: 33,
    weber: 20,
    fuelSupplyKingsford: 80,
    fuelSupplyWeber: 50,
    topVent: '1/2 to Fully open',
    bottomVent: '1/2 to Fully open',
    time: '2–3 hours',
    stabilization: '20 minutes',
    dumpCoals: 'On top of the fuel supply pile',
  },
  325: {
    label: '325°F',
    kingsford: 40,
    weber: 23,
    fuelSupplyKingsford: 80,
    fuelSupplyWeber: 50,
    topVent: '1/2 to Fully open',
    bottomVent: '1/2 to Fully open',
    time: '2–3 hours',
    stabilization: '20 minutes',
    dumpCoals: 'On top of the fuel supply pile',
  },
  350: {
    label: '350°F',
    kingsford: 60,
    weber: 33,
    fuelSupplyKingsford: 100,
    fuelSupplyWeber: 50,
    topVent: '1/2 open',
    bottomVent: '1/2 to 3/4 open',
    time: '2–3 hours',
    stabilization: '20 minutes',
    dumpCoals: 'On top of the fuel supply pile',
  },
  375: {
    label: '375°F',
    kingsford: 63,
    weber: 33,
    fuelSupplyKingsford: 100,
    fuelSupplyWeber: 50,
    topVent: '1/2 to 3/4 open',
    bottomVent: '1/2 to 3/4 open (Start a little more than 1/2 open)',
    time: '2–3 hours',
    stabilization: '20 minutes',
    dumpCoals: 'On top of the fuel supply pile',
  },
  400: {
    label: '400°F',
    kingsford: 70,
    weber: 38,
    fuelSupplyKingsford: 120,
    fuelSupplyWeber: 60,
    topVent: '1/2 to Fully open',
    bottomVent: '3/4 to Fully open',
    time: '2–3 hours',
    stabilization: '20 minutes',
    dumpCoals: 'On top of the fuel supply pile',
  },
};

function App() {
  const [temperature, setTemperature] = useState('');
  const [details, setDetails] = useState(null);

  const handleCalculate = () => {
    if (temperatureData[temperature]) {
      setDetails(temperatureData[temperature]);
    } else {
      setDetails(null);
    }
  };

  return (
    <div className="app-container">
      <h1>Weber Kettle Temperature Calculator</h1>
      <label htmlFor="temperature-select">
        Select Desired Temperature:
        <select
          id="temperature-select"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
        >
          <option value="" disabled>
            Choose a temperature
          </option>
          {Object.entries(temperatureData).map(([key, data]) => (
            <option key={key} value={key}>
              {data.label}
            </option>
          ))}
        </select>
      </label>
      <button onClick={handleCalculate} disabled={!temperature}>
        Calculate
      </button>
      {details && (
        <div className="results">
          <h2>Results for {details.label}:</h2>
          <p><strong>Kingsford Briquettes (Hot Coals):</strong> {details.kingsford}</p>
          <p><strong>Weber Briquettes (Hot Coals):</strong> {details.weber}</p>
          <p><strong>Fuel Supply (Kingsford):</strong> {details.fuelSupplyKingsford}</p>
          <p><strong>Fuel Supply (Weber):</strong> {details.fuelSupplyWeber}</p>
          <p><strong>Top Vent Setting:</strong> {details.topVent}</p>
          <p><strong>Bottom Vent Setting:</strong> {details.bottomVent}</p>
          <p><strong>Estimated Cook Time:</strong> {details.time}</p>
          <p><strong>Stabilization Time:</strong> {details.stabilization}</p>
          <p><strong>Coal Dumping Instructions:</strong> {details.dumpCoals}</p>
        </div>
      )}
    </div>
  );
}

export default App;
