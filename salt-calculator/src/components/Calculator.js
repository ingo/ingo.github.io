// Updated Calculator.js
import React, { useState } from 'react';
import meatData from '../data/meatData.json';
import saltData from '../data/saltData.json';

// Constants for instructions
const S = "Salt at least 40 min before and up to 48 hours before cooking.";
const T = "Salt at least 40 min before and up to 48 hours before cooking. If you're going to pan sear or grill, put it on a wire rack and leave it in the fridge uncovered to dry the exterior. This will help you develop a nice crust!";
const B = "The recommended salinity above would work if you're making burgers. If you're adding this ground meat to a recipe with other salty components, consider adjusting the salinity down. When it comes to ground meat, you aren't really 'dry brining'. Leaving the salt in for too long can make the texture rubbery (see 'Salting Ground Beef' below). Mix in the salt no more than 10 minutes before cooking.";

const Calculator = () => {
  const [protein, setProtein] = useState('');
  const [meatType, setMeatType] = useState('');
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('lbs');
  const [saltType, setSaltType] = useState('');
  const [salinity, setSalinity] = useState(1.1);

  const calculateSalt = () => {
    if (!meatType || !saltType || !weight) return { grams: 0, tablespoons: 0 };
    const weightInGrams = unit === 'lbs' ? weight * 453.592 : weight * 1000;
    const totalSaltGrams = weightInGrams * (salinity / 100);
    const tablespoons = totalSaltGrams / saltData[saltType].gramsPerTbsp;
    return { grams: totalSaltGrams.toFixed(2), tablespoons: tablespoons.toFixed(2) };
  };

  const getInstruction = (instructionKey) => {
    switch (instructionKey) {
      case 'S':
        return S;
      case 'T':
        return T;
      case 'B':
        return B;
      default:
        return instructionKey;
    }
  };

  const selectedMeat = protein && meatType ? meatData[protein][meatType] : null;

  const saltAmount = calculateSalt();

  return (
    <div className="calculator">
      <h1>Salt Calculator</h1>

      <div>
        <h2>What kind of protein are you dry brining?</h2>
        <div>
          {Object.keys(meatData).map((key) => (
            <label key={key}>
              <input
                type="radio"
                name="protein"
                value={key}
                checked={protein === key}
                onChange={(e) => setProtein(e.target.value)}
              />
              {key}
            </label>
          ))}
        </div>
      </div>

      {protein && (
        <div>
          <h2>What kind of {protein.toLowerCase()}?</h2>
          <div>
            {Object.keys(meatData[protein]).map((key) => (
              <label key={key}>
                <input
                  type="radio"
                  name="meatType"
                  value={key}
                  checked={meatType === key}
                  onChange={(e) => setMeatType(e.target.value)}
                />
                {key}
              </label>
            ))}
          </div>
        </div>
      )}

      {meatType && (
        <div>
          <h2>How much does it weigh?</h2>
          <div>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Enter weight"
            />
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>
      )}

      {meatType && (
        <div>
          <h2>What type of salt are you using?</h2>
          <div>
            {Object.keys(saltData).map((key) => (
              <label key={key}>
                <input
                  type="radio"
                  name="saltType"
                  value={key}
                  checked={saltType === key}
                  onChange={(e) => setSaltType(e.target.value)}
                />
                {saltData[key].name}
              </label>
            ))}
          </div>
        </div>
      )}

      {saltType && (
        <div>
          <h2>Target salinity by weight (%)</h2>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={salinity}
            onChange={(e) => setSalinity(e.target.value)}
          />
          <p>{salinity}% salinity</p>
        </div>
      )}

      {saltType && (
        <h3>
          You need: {saltAmount.grams} grams ({saltAmount.tablespoons} tablespoons) of {saltType}
        </h3>
      )}

      {selectedMeat && (
        <div>
          <h3>Instructions:</h3>
          <p>{getInstruction(selectedMeat.instruction)}</p>
          {selectedMeat.resources && (
            <div>
              <h4>Resources:</h4>
              <ul>
                {Object.entries(selectedMeat.resources).map(([key, url]) => (
                  <li key={key}><a href={url} target="_blank" rel="noopener noreferrer">{key}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calculator;